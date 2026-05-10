"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Undo2, RefreshCw } from "lucide-react";
import type {
  ClientImport,
  DuplicateAction,
  ImportColumnMapping,
  ImportPreviewRow,
  ImportTargetField,
} from "@/lib/client-imports/types";

const ROLLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// Per-row duplicate-action saves debounce by 500ms so rapid clicks
// don't generate a request per click. Picked to match what feels
// instantaneous to a human (~250ms) plus a buffer for in-flight
// double-clicks.
const DUP_ACTION_DEBOUNCE_MS = 500;

const TARGET_FIELDS: Array<{ value: ImportTargetField; label: string }> = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "Ignore" },
];

const DUPLICATE_ACTIONS: Array<{ value: DuplicateAction; label: string }> = [
  { value: "skip", label: "Skip" },
  { value: "merge", label: "Merge with existing" },
  { value: "create_anyway", label: "Create new anyway" },
];

const STATUS_TINTS: Record<ImportPreviewRow["status"], string> = {
  valid: "bg-emerald-50/40",
  duplicate: "bg-amber-50/40",
  error: "bg-rose-50/40",
};
const STATUS_PILLS: Record<ImportPreviewRow["status"], string> = {
  valid: "bg-emerald-50 text-emerald-800",
  duplicate: "bg-amber-50 text-amber-800",
  error: "bg-rose-50 text-rose-800",
};

/**
 * Preview surface for a parsed import. Sections stacked top-to-bottom:
 *   - Vendor banner (auto-detect result)
 *   - Column mapping (editable; pro can override + re-parse)
 *   - Sample-row preview table (50-row cap)
 *
 * Footer actions vary by status:
 *   - pending_review → Cancel + Confirm
 *   - committed within 7 days → Undo import (rollback)
 *   - committed past 7 days → "Rollback window expired" (read-only)
 *   - rolled_back / cancelled / failed → state banner, no action
 *
 * Local state vs. server state:
 *   - Mapping edits are local until "Re-parse with new mapping" is
 *     clicked. The stored column_mapping on importRow is the truth.
 *   - Duplicate-action edits PATCH on debounce — local state mirrors
 *     server state with optimistic update.
 */
export function ImportPreviewClient({ importRow }: { importRow: ClientImport }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
  const [reparsing, setReparsing] = useState(false);
  const [reparseError, setReparseError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const previewRows = importRow.preview_data ?? [];
  const total = importRow.total_rows ?? 0;
  const valid = importRow.valid_rows ?? 0;
  const dup = importRow.duplicate_rows ?? 0;
  const err = importRow.error_rows ?? 0;
  const visibleCount = previewRows.length;

  const isReviewable = importRow.status === "pending_review";
  const isCommitted = importRow.status === "committed";
  const isRolledBack = importRow.status === "rolled_back";
  const isFailed = importRow.status === "failed";

  // Rollback affordance — see PR #50 commentary above for the
  // useState lazy-init rationale on Date.now().
  const [nowAtMount] = useState(() => Date.now());
  const committedMs = importRow.committed_at
    ? new Date(importRow.committed_at).getTime()
    : null;
  const msSinceCommit = committedMs !== null ? nowAtMount - committedMs : null;
  const undoEligible =
    isCommitted && msSinceCommit !== null && msSinceCommit < ROLLBACK_WINDOW_MS;
  const undoDaysRemaining =
    undoEligible && msSinceCommit !== null
      ? Math.max(1, Math.ceil((ROLLBACK_WINDOW_MS - msSinceCommit) / (24 * 60 * 60 * 1000)))
      : 0;

  // ── Local mapping draft state ──────────────────────────────────
  // The parent (page.tsx) keys this component by importRow.parsed_at,
  // so a re-parse causes a fresh mount and the lazy initializer below
  // re-seeds from the new prop. No prop-sync effect needed.
  const [mappingDraft, setMappingDraft] = useState<ImportColumnMapping>(
    () => ({ ...(importRow.column_mapping ?? {}) }),
  );

  const mappingDirty = useMemo(
    () => !mappingsEqual(mappingDraft, importRow.column_mapping ?? {}),
    [mappingDraft, importRow.column_mapping],
  );

  // ── Local duplicate-action state ───────────────────────────────
  // Mirrors what's persisted in preview_data; PATCH writes update
  // both local and server. Re-seeds on remount (see key on parent).
  const [dupActions, setDupActions] = useState<Map<number, DuplicateAction>>(() => {
    const m = new Map<number, DuplicateAction>();
    for (const r of previewRows) {
      if (r.status === "duplicate") {
        m.set(r.row_index, r.duplicate_action ?? "skip");
      }
    }
    return m;
  });

  // Per-row save spinners + debounce timers. Indexed by row_index.
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Track the latest pending action per row so a debounced fire
  // sends the most recent value, not whichever closure captured first.
  const pendingActions = useRef<Map<number, DuplicateAction>>(new Map());

  // Cleanup any in-flight debounce timers on unmount so they don't
  // fire against an unmounted component.
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  // ── Derived UI state ───────────────────────────────────────────
  const dupActionCounts = useMemo(() => {
    let merge = 0;
    let createAnyway = 0;
    let skip = 0;
    for (const action of dupActions.values()) {
      if (action === "merge") merge += 1;
      else if (action === "create_anyway") createAnyway += 1;
      else skip += 1;
    }
    return { merge, createAnyway, skip };
  }, [dupActions]);

  const validToCreate = valid + dupActionCounts.createAnyway;
  const mergeCount = dupActionCounts.merge;
  const skipCount = dupActionCounts.skip;
  const totalToWrite = validToCreate + mergeCount;

  // Re-parse warning condition: mapping is dirty AND at least one
  // duplicate has a non-skip action queued. The pro is about to
  // discard those selections.
  const nonSkipActionsCount = dupActionCounts.merge + dupActionCounts.createAnyway;
  const showReparseWarning = mappingDirty && nonSkipActionsCount > 0;

  // ── Handlers ───────────────────────────────────────────────────

  const onMappingChange = (header: string, target: ImportTargetField) => {
    setMappingDraft((prev) => ({ ...prev, [header]: target }));
  };

  const onResetMapping = () => {
    setMappingDraft({ ...(importRow.column_mapping ?? {}) });
  };

  const onReparse = async () => {
    if (!mappingDirty || reparsing) return;
    setReparseError(null);
    setReparsing(true);
    try {
      const res = await fetch(`/api/dashboard/clients/imports/${importRow.id}/reparse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_mapping: mappingDraft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error === "unknown_header"
          ? `Column "${json.header}" doesn't exist in your file.`
          : json?.message ?? errorCopy(json?.error) ?? "Re-parse failed.";
        throw new Error(msg);
      }
      // router.refresh re-runs the server component so the new
      // preview_data + counts come back via importRow prop. Local
      // state will re-seed via the useEffects above.
      startTransition(() => router.refresh());
    } catch (e) {
      setReparseError(e instanceof Error ? e.message : "Re-parse failed.");
    } finally {
      setReparsing(false);
    }
  };

  const onDuplicateActionChange = (rowIndex: number, action: DuplicateAction) => {
    // Optimistic local update — the UI reflects the new action
    // immediately, the PATCH lands on debounce.
    setDupActions((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, action);
      return next;
    });
    pendingActions.current.set(rowIndex, action);

    const existingTimer = debounceTimers.current.get(rowIndex);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      const finalAction = pendingActions.current.get(rowIndex);
      if (!finalAction) return;
      pendingActions.current.delete(rowIndex);
      debounceTimers.current.delete(rowIndex);

      setSavingRows((prev) => {
        const next = new Set(prev);
        next.add(rowIndex);
        return next;
      });
      try {
        const res = await fetch(
          `/api/dashboard/clients/imports/${importRow.id}/duplicate-action`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row_index: rowIndex, action: finalAction }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? "save failed");
        }
      } catch (e) {
        // PATCH failure rolls the local state back to the saved
        // action so the UI doesn't lie about persisted truth.
        const previous = previewRows.find((r) => r.row_index === rowIndex);
        const fallback = previous?.duplicate_action ?? "skip";
        setDupActions((prev) => {
          const next = new Map(prev);
          next.set(rowIndex, fallback);
          return next;
        });
        console.error("duplicate-action PATCH failed:", e);
      } finally {
        setSavingRows((prev) => {
          const next = new Set(prev);
          next.delete(rowIndex);
          return next;
        });
      }
    }, DUP_ACTION_DEBOUNCE_MS);
    debounceTimers.current.set(rowIndex, timer);
  };

  const onCancel = async () => {
    if (!isReviewable) return;
    setCancelError(null);
    setCancelling(true);
    try {
      const res = await fetch(`/api/dashboard/clients/imports/${importRow.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Cancel failed.");
      }
      startTransition(() => {
        router.push("/dashboard/clients/imports");
      });
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Cancel failed.");
      setCancelling(false);
    }
  };

  const onCommit = async () => {
    if (!isReviewable) return;
    setCommitError(null);
    setCommitting(true);
    try {
      const res = await fetch(`/api/dashboard/clients/imports/${importRow.id}/commit`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.message ?? errorCopy(json?.error) ?? "Import failed. Try again.";
        throw new Error(msg);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Import failed.");
      setCommitting(false);
    }
  };

  const onUndo = async () => {
    if (!undoEligible) return;
    setRollError(null);
    setRolling(true);
    try {
      const res = await fetch(`/api/dashboard/clients/imports/${importRow.id}/rollback`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.error === "rollback_blocked_bookings_exist"
            ? `Rollback blocked: ${json.count} booking(s) reference these clients. Contact support to undo manually.`
            : json?.error === "rollback_blocked_merges_present"
              ? `Rollback blocked: ${json.count} client${json.count === 1 ? " was" : "s were"} merged during commit and can't be auto-undone. Contact support to revert manually.`
              : json?.error === "rollback_window_expired"
                ? "The 7-day undo window has expired."
                : json?.message ?? errorCopy(json?.error) ?? "Undo failed.";
        throw new Error(msg);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setRollError(e instanceof Error ? e.message : "Undo failed.");
      setRolling(false);
    }
  };

  return (
    <>
      {/* Status + counts strip */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#525252]">
        <StatusPill status={importRow.status} />
        {total > 0 && (
          <>
            <Counter color="emerald" label={`${valid} valid`} />
            <Counter color="amber" label={`${dup} duplicates`} />
            <Counter color="rose" label={`${err} errors`} />
            <span className="text-[#A3A3A3]">·</span>
            <span className="font-medium text-[#0A0A0A]">{total} total</span>
          </>
        )}
      </div>

      {/* Vendor banner */}
      <div
        className={`mt-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
          importRow.vendor_hint
            ? "border-emerald-100 bg-emerald-50/50 text-emerald-900"
            : "border-amber-100 bg-amber-50/50 text-amber-900"
        }`}
      >
        {importRow.vendor_hint ? (
          <CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        )}
        <div>
          {importRow.vendor_hint ? (
            <>
              <p className="font-medium">
                Detected: {labelForVendor(importRow.vendor_hint)} export
              </p>
              <p className="mt-0.5 text-xs">
                Auto-mapped {Object.keys(importRow.column_mapping ?? {}).length} columns
                from your file.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Unknown export format</p>
              <p className="mt-0.5 text-xs">
                We couldn&rsquo;t auto-detect the column layout. Review the
                mapping below carefully before importing.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Column mapping — editable in PR 4 when reviewable */}
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="border-b border-[#E7E5E4] px-5 py-4">
          <h2 className="font-display text-base font-medium text-[#0A0A0A]">Column mapping</h2>
          <p className="mt-1 text-xs text-[#737373]">
            How each column from your file maps to OYRB&rsquo;s client record.
            {isReviewable && " Change a value to enable re-parsing with the new mapping."}
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {Object.entries(mappingDraft).map(([source, target]) => (
            <div key={source} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm text-[#0A0A0A]" title={source}>
                {source}
              </span>
              <span className="text-[#A3A3A3]">→</span>
              <select
                disabled={!isReviewable || reparsing}
                value={target}
                onChange={(e) => onMappingChange(source, e.target.value as ImportTargetField)}
                className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-sm text-[#0A0A0A] disabled:cursor-not-allowed disabled:bg-[#FAFAF9] disabled:text-[#525252]"
              >
                {TARGET_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {Object.keys(mappingDraft).length === 0 && (
            <p className="text-sm text-[#A3A3A3]">No columns detected in this file.</p>
          )}
        </div>

        {isReviewable && mappingDirty && (
          <div className="border-t border-[#E7E5E4] bg-[#FAFAF9] px-5 py-4">
            {showReparseWarning && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
                <AlertCircle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <span>
                  Re-parsing will reset duplicate actions you&rsquo;ve selected
                  for {nonSkipActionsCount} row{nonSkipActionsCount === 1 ? "" : "s"}.
                </span>
              </div>
            )}
            {reparseError && (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <AlertCircle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <span>{reparseError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onResetMapping}
                disabled={reparsing}
                className="text-center text-sm text-[#737373] underline-offset-2 transition-colors hover:text-[#0A0A0A] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset to detected mapping
              </button>
              <button
                type="button"
                onClick={onReparse}
                disabled={reparsing}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reparsing
                  ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  : <RefreshCw size={14} strokeWidth={1.5} />}
                {reparsing ? "Re-parsing…" : "Re-parse with new mapping"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Preview table */}
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="flex flex-col gap-1 border-b border-[#E7E5E4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-base font-medium text-[#0A0A0A]">Preview</h2>
          {total > 0 && (
            <p className="text-xs text-[#737373]">
              {visibleCount < total
                ? `Showing ${visibleCount} of ${total} rows`
                : `Showing all ${visibleCount} row${visibleCount === 1 ? "" : "s"}`}
            </p>
          )}
        </header>

        {previewRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#737373]">
            {isFailed
              ? "Parsing failed — no preview available."
              : "No preview rows captured."}
          </p>
        ) : (
          <>
            {/* Desktop / wide table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-[#E7E5E4] bg-[#FAFAF9] text-xs uppercase text-[#737373]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
                  {previewRows.flatMap((row) => {
                    const main = (
                      <tr key={row.row_index} className={STATUS_TINTS[row.status]}>
                        <td className="px-3 py-2 text-xs text-[#A3A3A3]">#{row.row_index}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILLS[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#0A0A0A]">{row.name ?? <Empty />}</td>
                        <td className="px-3 py-2 text-[#525252]">{row.email ?? <Empty />}</td>
                        <td className="px-3 py-2 text-[#525252]">{row.phone ?? <Empty />}</td>
                        <td className="px-3 py-2 text-xs text-[#737373]" title={row.notes ?? ""}>
                          {row.notes ? truncate(row.notes, 60) : <Empty />}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "duplicate" && isReviewable
                            ? <DuplicateActionSelect
                                value={dupActions.get(row.row_index) ?? "skip"}
                                onChange={(a) => onDuplicateActionChange(row.row_index, a)}
                                saving={savingRows.has(row.row_index)}
                                disabled={reparsing}
                              />
                            : null}
                        </td>
                      </tr>
                    );
                    if (!row.errors || row.errors.length === 0) return [main];
                    return [
                      main,
                      <tr key={`${row.row_index}-err`} className={STATUS_TINTS[row.status]}>
                        <td colSpan={7} className="px-3 pb-2 text-xs text-rose-700">
                          {row.errors.join(" · ")}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <ul className="divide-y divide-[#E7E5E4] md:hidden">
              {previewRows.map((row) => (
                <li key={row.row_index} className={`p-4 ${STATUS_TINTS[row.status]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#A3A3A3]">#{row.row_index}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILLS[row.status]}`}>
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-[#0A0A0A]">{row.name ?? <Empty />}</p>
                  <dl className="mt-1 space-y-0.5 text-xs text-[#525252]">
                    <Field label="Email" value={row.email} />
                    <Field label="Phone" value={row.phone} />
                    {row.notes && (
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-[#A3A3A3]">Notes</dt>
                        <dd className="text-[#737373]">{truncate(row.notes, 80)}</dd>
                      </div>
                    )}
                  </dl>
                  {row.errors && row.errors.length > 0 && (
                    <p className="mt-2 text-xs text-rose-700">{row.errors.join(" · ")}</p>
                  )}
                  {row.status === "duplicate" && isReviewable && (
                    <div className="mt-3">
                      <DuplicateActionSelect
                        value={dupActions.get(row.row_index) ?? "skip"}
                        onChange={(a) => onDuplicateActionChange(row.row_index, a)}
                        saving={savingRows.has(row.row_index)}
                        disabled={reparsing}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* State banners for terminal states. */}
      {isCommitted && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {importRow.clients_created ?? 0} client
              {importRow.clients_created === 1 ? "" : "s"} added
              {(importRow.clients_merged ?? 0) > 0 && (
                <>, {importRow.clients_merged} merged into existing records</>
              )}
            </p>
            <p className="mt-0.5 text-xs">
              {(importRow.clients_merged ?? 0) > 0
                ? "Merged rows can't be auto-rolled-back. Contact support if you need to revert them."
                : undoEligible
                  ? `You can undo this import for ${undoDaysRemaining} more day${undoDaysRemaining === 1 ? "" : "s"}.`
                  : "The 7-day undo window has expired."}
            </p>
          </div>
        </div>
      )}
      {isRolledBack && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-sm text-[#525252]">
          <Undo2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-[#0A0A0A]">Import rolled back</p>
            <p className="mt-0.5 text-xs">
              {importRow.clients_deleted ?? 0} client
              {importRow.clients_deleted === 1 ? "" : "s"} removed
              {importRow.rolled_back_at && ` on ${new Date(importRow.rolled_back_at).toLocaleDateString()}`}
              .
            </p>
          </div>
        </div>
      )}
      {isFailed && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-rose-900">
          <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Import failed</p>
            <p className="mt-0.5 text-xs">
              {importRow.error_summary ?? "Something went wrong during import."}
              {(importRow.clients_created ?? 0) > 0 && (
                <> {importRow.clients_created} client{importRow.clients_created === 1 ? "" : "s"} were added before the failure — visible in your client list with this import as their source.</>
              )}
              {(importRow.clients_merged ?? 0) > 0 && (
                <> {importRow.clients_merged} merge{importRow.clients_merged === 1 ? "" : "s"} also completed.</>
              )}
            </p>
          </div>
        </div>
      )}

      {(cancelError || commitError || rollError) && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>{cancelError ?? commitError ?? rollError}</span>
        </div>
      )}

      {/* Action footer. Inline on mobile (sits at the bottom of the
          page), sticky-bottom on desktop so it stays reachable while
          the pro scrolls the table. */}
      <div className="sticky bottom-0 z-30 mt-6 flex flex-col-reverse gap-3 border-t border-[#E7E5E4] bg-white/95 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#737373]">
          {isReviewable && <FooterCounts
            validToCreate={validToCreate}
            mergeCount={mergeCount}
            skipCount={skipCount}
          />}
          {isCommitted && undoEligible && (importRow.clients_merged ?? 0) === 0 && `Undo within ${undoDaysRemaining} day${undoDaysRemaining === 1 ? "" : "s"} if needed.`}
          {isCommitted && undoEligible && (importRow.clients_merged ?? 0) > 0 && "Merged rows block auto-rollback — contact support."}
          {isCommitted && !undoEligible && "Rollback window expired."}
          {isRolledBack && "This import has been undone."}
          {isFailed && "Open a new import to try again."}
        </div>
        <div className="flex items-center justify-end gap-3">
          {isReviewable && (
            <>
              <button
                type="button"
                disabled={cancelling || committing || reparsing}
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                Cancel import
              </button>
              <button
                type="button"
                disabled={committing || cancelling || reparsing || totalToWrite === 0}
                onClick={onCommit}
                title={totalToWrite === 0 ? "No rows to import." : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {committing && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {committing ? `Importing ${totalToWrite}…` : `Confirm import (${totalToWrite})`}
              </button>
            </>
          )}
          {isCommitted && undoEligible && (importRow.clients_merged ?? 0) === 0 && (
            <button
              type="button"
              disabled={rolling}
              onClick={onUndo}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rolling
                ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                : <Undo2 size={14} strokeWidth={1.5} />}
              {rolling ? "Undoing…" : `Undo import (${undoDaysRemaining}d left)`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function FooterCounts({
  validToCreate,
  mergeCount,
  skipCount,
}: {
  validToCreate: number;
  mergeCount: number;
  skipCount: number;
}) {
  const parts: string[] = [];
  parts.push(`${validToCreate} new`);
  if (mergeCount > 0) parts.push(`${mergeCount} merge${mergeCount === 1 ? "" : "s"}`);
  if (skipCount > 0) parts.push(`${skipCount} skipped`);
  return <span>Confirm to import {parts.join(" + ")}.</span>;
}

function DuplicateActionSelect({
  value,
  onChange,
  saving,
  disabled,
}: {
  value: DuplicateAction;
  onChange: (a: DuplicateAction) => void;
  saving: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as DuplicateAction)}
        className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-xs text-[#0A0A0A] disabled:cursor-not-allowed disabled:bg-[#FAFAF9] disabled:text-[#525252]"
      >
        {DUPLICATE_ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      {saving && (
        <Loader2 size={11} strokeWidth={1.5} className="animate-spin text-[#A3A3A3]" />
      )}
    </div>
  );
}

function errorCopy(code: string | undefined): string | null {
  switch (code) {
    case "invalid_state":
      return "This import is no longer in a state that can be imported. Refresh the page to see the latest status.";
    case "missing_source":
      return "The uploaded file is no longer available. Cancel and re-upload.";
    case "missing_mapping":
      return "Column mapping was lost. Cancel and re-upload.";
    case "insert_failed":
      return "Some rows failed to insert. Check your client list and contact support if anything looks off.";
    case "merge_failed":
      return "A merge update failed mid-commit. Check your client list and contact support if anything looks off.";
    case "commit_failed":
      return "Import failed unexpectedly. Try again or contact support.";
    case "reparse_error":
      return "Re-parse failed. Refresh and try again.";
    case "not_found":
      return "Import not found.";
    case "unauthorized":
      return "Sign in to continue.";
    default:
      return null;
  }
}

function StatusPill({ status }: { status: ClientImport["status"] }) {
  const meta = STATUS_META[status] ?? STATUS_META.failed;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.classes}`}>
      {meta.label}
    </span>
  );
}

const STATUS_META: Record<ClientImport["status"], { label: string; classes: string }> = {
  pending_upload: { label: "Pending upload", classes: "bg-amber-50 text-amber-800" },
  pending_parse: { label: "Parsing", classes: "bg-amber-50 text-amber-800" },
  pending_review: { label: "Pending review", classes: "bg-sky-50 text-sky-800" },
  committed: { label: "Imported", classes: "bg-emerald-50 text-emerald-800" },
  cancelled: { label: "Cancelled", classes: "bg-[#F5F5F4] text-[#525252]" },
  rolled_back: { label: "Rolled back", classes: "bg-[#F5F5F4] text-[#525252]" },
  failed: { label: "Failed", classes: "bg-rose-50 text-rose-800" },
};

function Counter({ color, label }: { color: "emerald" | "amber" | "rose"; label: string }) {
  const dot = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[color];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Empty() {
  return <span className="text-[#D6D3D1]">—</span>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[#A3A3A3]">{label}</dt>
      <dd className="text-[#525252]">{value ?? <Empty />}</dd>
    </div>
  );
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + "…";
}

function labelForVendor(vendor: string): string {
  switch (vendor) {
    case "acuity": return "Acuity";
    case "glossgenius": return "GlossGenius";
    case "booksy": return "Booksy";
    case "stylesheat": return "StyleSeat";
    default: return "Custom CSV";
  }
}

/** Shallow equality on two mappings — enough since values are strings. */
function mappingsEqual(a: ImportColumnMapping, b: ImportColumnMapping): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
