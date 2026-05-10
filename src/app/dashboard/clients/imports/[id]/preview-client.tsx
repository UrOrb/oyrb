"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import type { ClientImport, ImportPreviewRow, ImportTargetField } from "@/lib/client-imports/types";

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
 * The footer is sticky on desktop so "Cancel" / "Confirm" stay
 * reachable while the pro scrolls. The Confirm button is disabled
 * with placeholder copy — commit lands in PR 3.
 */
export function ImportPreviewClient({ importRow }: { importRow: ClientImport }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const previewRows = importRow.preview_data ?? [];
  const total = importRow.total_rows ?? 0;
  const valid = importRow.valid_rows ?? 0;
  const dup = importRow.duplicate_rows ?? 0;
  const err = importRow.error_rows ?? 0;
  const visibleCount = previewRows.length;

  const isReviewable = importRow.status === "pending_review";
  const isCommitted = importRow.status === "committed";
  const isFailed = importRow.status === "failed";

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

      {cancelError && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Action footer. Inline on mobile (sits at the bottom of the
          page), sticky-bottom on desktop so it stays reachable while
          the pro scrolls the table. */}
      <div className="sticky bottom-0 z-30 mt-6 flex flex-col-reverse gap-3 border-t border-[#E7E5E4] bg-white/95 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#737373]">
          {isReviewable && "Confirm to add valid rows to your client list."}
          {isCommitted && "This import has been added to your client list."}
          {isFailed && "Parsing failed. Cancel and try a different file."}
        </div>
        <div className="flex items-center justify-end gap-3">
          {isReviewable && (
            <button
              type="button"
              disabled={cancelling}
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
              Cancel import
            </button>
          )}
          <button
            type="button"
            disabled
            title="Commit functionality coming in next update"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white opacity-40"
          >
            Confirm import
          </button>
        </div>
      </div>
    </>
  );
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
