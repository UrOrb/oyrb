import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import type { ClientImport } from "@/lib/client-imports/types";
import { ImportPreviewClient } from "./preview-client";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Server-rendered shell for the preview page. Fetches the import row
 * with the existence-leak posture (404 for both "not found" and "not
 * yours"), then hands off to the client component for rendering the
 * dropdowns, table, and footer actions.
 *
 * For pending_upload rows we redirect back to the upload page —
 * there's nothing to preview yet, and "resume" is the only sensible
 * affordance.
 */
export default async function ClientImportPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { siteId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness(siteId);
  if (!business) notFound();

  const { data: importRowRaw } = await supabase
    .from("client_imports")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!importRowRaw) notFound();

  const importRow = importRowRaw as ClientImport;

  if (importRow.status === "pending_upload") {
    redirect("/dashboard/clients/imports/new");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {importRow.source_filename}
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Uploaded {formatTimestamp(importRow.created_at)}
            {importRow.parsed_at && (
              <> · Parsed {formatTimestamp(importRow.parsed_at)}</>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/clients/imports"
          className="text-sm text-[#737373] transition-colors hover:text-[#0A0A0A]"
        >
          All imports
        </Link>
      </div>

      <ImportPreviewClient importRow={importRow} />
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
