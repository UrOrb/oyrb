import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import type { ClientImport } from "@/lib/client-imports/types";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * List of every client_imports row for this pro's business, most
 * recent first. Each row shows status, counts (once parsed), and an
 * action button keyed to the row's lifecycle stage.
 *
 * The "what to do next" CTA on each row is the single load-bearing
 * piece of UX here: pros bouncing back into a half-finished import
 * need a one-click resume, not a remember-where-you-left-off puzzle.
 */
export default async function ClientImportsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Imports</h1>
        <p className="mt-4 text-sm text-[#737373]">
          Complete checkout first to start importing clients.
        </p>
      </div>
    );
  }

  const { data: importsRaw } = await supabase
    .from("client_imports")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const imports = (importsRaw ?? []) as ClientImport[];

  // Capture render-start time once so the UndoBadge stays pure during
  // render. Server components run once per request, so this is the
  // single moment of truth for "is this commit still inside the 7-day
  // undo window." Same pattern as src/app/dashboard/clients/page.tsx
  // — purity rule is overzealous for async server components.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Imports</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Bring your client list with you when you switch from another platform.
          </p>
        </div>
        {imports.length > 0 && (
          <Link
            href="/dashboard/clients/imports/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
          >
            <Upload size={14} strokeWidth={1.5} />
            New import
          </Link>
        )}
      </div>

      {imports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-[#E7E5E4] bg-[#FAFAF9] text-xs uppercase text-[#737373]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">File</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Counts</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0A0A0A]">{imp.source_filename}</p>
                    <p className="text-xs text-[#A3A3A3]">
                      {imp.vendor_hint ? labelForVendor(imp.vendor_hint) : "Format unknown"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={imp.status} />
                    <UndoBadge imp={imp} now={renderedAt} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#525252]">
                    <CountsCell imp={imp} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#525252]">
                    {relativeTime(imp.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionButton imp={imp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile card stack */}
          <ul className="divide-y divide-[#E7E5E4] md:hidden">
            {imports.map((imp) => (
              <li key={imp.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0A0A0A]">{imp.source_filename}</p>
                    <p className="text-xs text-[#A3A3A3]">
                      {imp.vendor_hint ? labelForVendor(imp.vendor_hint) : "Format unknown"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill status={imp.status} />
                    <UndoBadge imp={imp} now={renderedAt} />
                  </div>
                </div>
                <div className="text-xs text-[#525252]">
                  <CountsCell imp={imp} />
                </div>
                <div className="flex items-center justify-between text-xs text-[#737373]">
                  <span>{relativeTime(imp.created_at)}</span>
                  <ActionButton imp={imp} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-[#E7E5E4] bg-white p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F4]">
        <Upload size={20} strokeWidth={1.5} className="text-[#525252]" />
      </div>
      <h2 className="mt-4 font-display text-lg font-medium text-[#0A0A0A]">
        No imports yet
      </h2>
      <p className="mt-1 text-sm text-[#737373]">
        Upload a client list from your previous platform.
      </p>
      <Link
        href="/dashboard/clients/imports/new"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
      >
        <Upload size={14} strokeWidth={1.5} />
        Start an import
      </Link>
    </div>
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

function CountsCell({ imp }: { imp: ClientImport }) {
  // Committed and rolled_back rows show the more useful audit number
  // (clients added / removed) instead of the parse-time breakdown the
  // pro already saw on the preview page.
  if (imp.status === "committed" && imp.clients_created != null) {
    return (
      <span>
        <span className="font-medium text-emerald-700">{imp.clients_created}</span> imported
      </span>
    );
  }
  if (imp.status === "rolled_back" && imp.clients_deleted != null) {
    return (
      <span>
        <span className="font-medium text-[#525252]">{imp.clients_deleted}</span> rolled back
      </span>
    );
  }
  if (imp.total_rows == null) {
    return <span className="text-[#A3A3A3]">—</span>;
  }
  return (
    <span>
      <span className="font-medium text-[#0A0A0A]">{imp.total_rows}</span> total
      <span className="mx-1 text-[#D6D3D1]">·</span>
      <span className="text-emerald-700">{imp.valid_rows ?? 0} valid</span>
      <span className="mx-1 text-[#D6D3D1]">·</span>
      <span className="text-amber-700">{imp.duplicate_rows ?? 0} dup</span>
      <span className="mx-1 text-[#D6D3D1]">·</span>
      <span className="text-rose-700">{imp.error_rows ?? 0} err</span>
    </span>
  );
}

const ROLLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function UndoBadge({ imp, now }: { imp: ClientImport; now: number }) {
  if (imp.status !== "committed" || !imp.committed_at) return null;
  const ms = now - new Date(imp.committed_at).getTime();
  if (ms >= ROLLBACK_WINDOW_MS) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
      Undo available
    </span>
  );
}

function ActionButton({ imp }: { imp: ClientImport }) {
  const baseLink =
    "inline-flex items-center justify-center rounded-md border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4]";
  if (imp.status === "pending_upload") {
    return (
      <Link href="/dashboard/clients/imports/new" className={baseLink}>
        Resume
      </Link>
    );
  }
  if (imp.status === "pending_parse" || imp.status === "pending_review") {
    return (
      <Link href={`/dashboard/clients/imports/${imp.id}`} className={baseLink}>
        Review
      </Link>
    );
  }
  if (imp.status === "committed") {
    return (
      <Link href={`/dashboard/clients/imports/${imp.id}`} className={baseLink}>
        View
      </Link>
    );
  }
  return null;
}

const STATUS_META: Record<ClientImport["status"], { label: string; classes: string }> = {
  pending_upload: { label: "Pending upload", classes: "bg-amber-50 text-amber-800" },
  pending_parse: { label: "Parsing", classes: "bg-amber-50 text-amber-800" },
  pending_review: { label: "Pending review", classes: "bg-sky-50 text-sky-800" },
  committed: { label: "Imported", classes: "bg-emerald-50 text-emerald-800" },
  cancelled: { label: "Cancelled", classes: "bg-[#F5F5F4] text-[#525252]" },
  rolled_back: { label: "Rolled back", classes: "bg-[#F5F5F4] text-[#525252]" },
  failed: { label: "Failed", classes: "bg-[#F5F5F4] text-[#525252]" },
};

function labelForVendor(vendor: string): string {
  switch (vendor) {
    case "acuity": return "Acuity export";
    case "glossgenius": return "GlossGenius export";
    case "booksy": return "Booksy export";
    case "stylesheat": return "StyleSeat export";
    default: return "Custom CSV";
  }
}

// Lightweight relative-time helper. Inlined here because the rest of
// the dashboard formats dates absolutely; this is the first surface
// where "X ago" beats a calendar date — uploads are usually viewed
// within minutes/hours of creation, not weeks later.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) {
    const m = Math.round(diffMs / minute);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const h = Math.round(diffMs / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day * 2) return "Yesterday";
  if (diffMs < day * 7) {
    const d = Math.round(diffMs / day);
    return `${d} days ago`;
  }
  return new Date(iso).toLocaleDateString();
}
