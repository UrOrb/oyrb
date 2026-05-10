"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Info, Undo2 } from "lucide-react";
import type { ClientImport, ImportPreviewRow, ImportTargetField } from "@/lib/client-imports/types";

const ROLLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const TARGET_FIELDS: Array<{ value: ImportTargetField; label: string }> = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "Ignore" },
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
 * Preview surface for a parsed import. Three sections stacked:
 *   - Vendor banner (auto-detect result)
 *   - Column mapping (read-only in PR 2 — editable in PR 4)
 *   - Sample-row preview table (50-row cap)
 *
 * Footer actions vary by status:
 *   - pending_review → Cancel + Confirm
 *   - committed within 7 days → Undo import (PR 3 rollback)
 *   - committed past 7 days → "Rollback window expired" (read-only)
 *   - rolled_back / cancelled / failed → state banner, no action
 */
export function ImportPreviewClient({ importRow }: { importRow: ClientImport }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
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

  // Rollback affordance is gated on a 7-day window from committed_at.
  // Mirrors the server-side check in the rollback route — surfacing
  // the same constraint in the UI keeps the pro from clicking a
  // button that's about to 410 on them.
  //
  // `nowAtMount` is captured once at first render via useState's lazy
  // init so React's purity rule isn't violated by calling Date.now()
  // during render. The 7-day window is wide enough that millisecond
  // drift between mount and the user's eventual click doesn't matter.
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
        // Server's `error` field is a short identifier; surface a
        // friendlier message based on the known cases. Fall back to
        // the raw identifier so the pro can quote it to support.
        const msg =
          json?.message ?? errorCopy(json?.error) ?? "Import failed. Try again.";
        throw new Error(msg);
      }
      // Refresh the route so the server fetches the new committed
      // state and re-renders with the Undo button. router.refresh()
      // re-runs the page's server component without a full nav.
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

      {/* Column mapping — read-only in PR 2 */}
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="border-b border-[#E7E5E4] px-5 py-4">
          <h2 className="font-display text-base font-medium text-[#0A0A0A]">Column mapping</h2>
          <p className="mt-1 text-xs text-[#737373]">
            How each column from your file maps to OYRB&rsquo;s client record.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {Object.entries(importRow.column_mapping ?? {}).map(([source, target]) => (
            <div key={source} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm text-[#0A0A0A]" title={source}>
                {source}
              </span>
              <span className="text-[#A3A3A3]">→</span>
              <select
                disabled
                value={target}
                className="rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-1.5 text-sm text-[#525252] disabled:cursor-not-allowed"
              >
                {TARGET_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {Object.keys(importRow.column_mapping ?? {}).length === 0 && (
            <p className="text-sm text-[#A3A3A3]">No columns detected in this file.</p>
          )}
        </div>
        <div className="flex items-start gap-2 border-t border-[#E7E5E4] bg-[#FAFAF9] px-5 py-3 text-xs text-[#525252]">
          <Info size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>
            Mapping changes require re-import — full editing coming in next update.
          </span>
        </div>
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
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-[#E7E5E4] bg-[#FAFAF9] text-xs uppercase text-[#737373]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
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
                      </tr>
                    );
                    if (!row.errors || row.errors.length === 0) return [main];
                    return [
                      main,
                      <tr key={`${row.row_index}-err`} className={STATUS_TINTS[row.status]}>
                        <td colSpan={6} className="px-3 pb-2 text-xs text-rose-700">
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
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* State banners for terminal states. Shown ABOVE the action
          footer (which renders different controls per status), so the
          pro reads "what happened" before "what they can do next". */}
      {isCommitted && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {importRow.clients_created ?? 0} client
              {importRow.clients_created === 1 ? "" : "s"} added to your list
            </p>
            <p className="mt-0.5 text-xs">
              {undoEligible
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
          {isReviewable && `Confirm to add ${valid} valid row${valid === 1 ? "" : "s"} to your client list.`}
          {isCommitted && undoEligible && `Undo within ${undoDaysRemaining} day${undoDaysRemaining === 1 ? "" : "s"} if needed.`}
          {isCommitted && !undoEligible && "Rollback window expired."}
          {isRolledBack && "This import has been undone."}
          {isFailed && "Open a new import to try again."}
        </div>
        <div className="flex items-center justify-end gap-3">
          {isReviewable && (
            <>
              <button
                type="button"
                disabled={cancelling || committing}
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                Cancel import
              </button>
              <button
                type="button"
                disabled={committing || cancelling || valid === 0}
                onClick={onCommit}
                title={valid === 0 ? "No valid rows to import." : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {committing && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {committing ? `Importing ${valid}…` : `Confirm import (${valid})`}
              </button>
            </>
          )}
          {isCommitted && undoEligible && (
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
    case "commit_failed":
      return "Import failed unexpectedly. Try again or contact support.";
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
