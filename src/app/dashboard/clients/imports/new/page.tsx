"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";

/**
 * Three-step new-import flow:
 *   1) Pick the platform you're coming from → see export instructions
 *   2) Drop or pick the CSV file
 *   3) Upload + parse + redirect to the preview page
 *
 * Steps 1 and 2 are stacked on a single page (not separate routes) so
 * a pro can tab back to instructions without losing the file picker.
 * Step 3 is the in-progress overlay shown after `Begin upload`.
 *
 * Concurrency: if another import is already in flight, the
 * upload-token route returns 409 with the existing id — we redirect
 * the pro to that import instead of starting a second.
 */

const VENDOR_TABS: Array<{
  id: string;
  label: string;
  steps: string[];
}> = [
  {
    id: "acuity",
    label: "Acuity",
    steps: [
      "Sign in to your Acuity account",
      "Open Settings → Import & Export",
      "Choose Export Client List",
      "Select CSV format and download the file",
    ],
  },
  {
    id: "glossgenius",
    label: "GlossGenius",
    steps: [
      "Open the GlossGenius web dashboard",
      "Go to Settings → Clients",
      "Choose Export → CSV",
      "Save the downloaded file to your computer",
    ],
  },
  {
    id: "booksy",
    label: "Booksy",
    steps: [
      "Sign in to your Booksy Biz account",
      "Open Manage → Customers",
      "Click Export → Download CSV",
      "Save the file to your computer",
    ],
  },
  {
    id: "stylesheat",
    label: "StyleSeat",
    steps: [
      "Sign in to your StyleSeat pro dashboard",
      "Open Settings → Account",
      "Go to Export Data",
      "Choose Customers and download the CSV",
    ],
  },
];

const ACCEPTED_EXTENSIONS = [".csv"];
const ACCEPTED_MIMES = new Set(["text/csv", "application/vnd.ms-excel", "text/plain"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type Phase = "idle" | "minting" | "uploading" | "parsing" | "done";

export default function NewImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<string>(VENDOR_TABS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // The drop zone listens for browser-level dragover so dropping
  // outside the box doesn't open the file in a new tab. Cleaned up
  // on unmount.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleFile = (incoming: File | null) => {
    setError(null);
    if (!incoming) {
      setFile(null);
      return;
    }
    const ext = incoming.name.toLowerCase().slice(incoming.name.lastIndexOf("."));
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError("Only .csv files are supported. PDF support is coming later.");
      return;
    }
    // Browser MIME detection is unreliable for CSV (some report
    // text/plain, some application/vnd.ms-excel). We accept any of
    // the three the storage bucket allows; the real check happens
    // server-side in the upload-token route.
    if (incoming.type && !ACCEPTED_MIMES.has(incoming.type)) {
      // Don't block on a mismatched MIME — the extension already
      // passed and the server will re-validate. But surface a hint
      // so the pro knows what we saw.
      console.warn("Unexpected MIME for CSV:", incoming.type);
    }
    if (incoming.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (incoming.size > MAX_FILE_SIZE_BYTES) {
      setError("File is larger than 10 MB. Split the export and try again.");
      return;
    }
    setFile(incoming);
  };

  const onUpload = async () => {
    if (!file) return;
    setError(null);
    setPhase("minting");
    try {
      // Step A — mint a signed upload URL + create the import row.
      const tokenRes = await fetch("/api/dashboard/clients/imports/upload-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "text/csv",
          size: file.size,
        }),
      });
      const tokenJson = await tokenRes.json();

      if (tokenRes.status === 409 && tokenJson?.existingImportId) {
        // Concurrency guard tripped — bounce the pro to the in-flight
        // import instead of letting them start a second one.
        router.push(`/dashboard/clients/imports/${tokenJson.existingImportId}`);
        return;
      }
      if (!tokenRes.ok) {
        throw new Error(tokenJson?.error ?? "Upload failed to start.");
      }

      const { importId, uploadUrl } = tokenJson as {
        importId: string;
        uploadUrl: string;
      };

      // Step B — PUT the file directly to Supabase Storage.
      setPhase("uploading");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "text/csv" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error("Upload to storage failed.");
      }

      // Step C — kick off the parse. Server response is the final
      // import row; we only need its id to navigate.
      setPhase("parsing");
      const parseRes = await fetch(`/api/dashboard/clients/imports/${importId}/parse`, {
        method: "POST",
      });
      if (!parseRes.ok) {
        const j = await parseRes.json().catch(() => ({}));
        throw new Error(j?.error ?? "Parsing failed.");
      }

      setPhase("done");
      router.push(`/dashboard/clients/imports/${importId}`);
    } catch (err) {
      console.error("Import upload failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("idle");
    }
  };

  const isWorking = phase !== "idle" && phase !== "done";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Import clients</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Bring your client list over from another platform. We&rsquo;ll show
            you a preview before anything is added.
          </p>
        </div>
        <Link
          href="/dashboard/clients/imports"
          className="text-sm text-[#737373] transition-colors hover:text-[#0A0A0A]"
        >
          Back
        </Link>
      </div>

      {/* Step 1 — instructions */}
      <section className="mt-8 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="border-b border-[#E7E5E4] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
            Step 1
          </p>
          <h2 className="mt-1 font-display text-base font-medium text-[#0A0A0A]">
            Export your client list
          </h2>
        </header>
        <div className="px-5 pt-3">
          <Tabs tabs={VENDOR_TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} />
        </div>
        <div className="px-5 py-5">
          <ol className="space-y-2">
            {(VENDOR_TABS.find((t) => t.id === tab)?.steps ?? []).map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#0A0A0A]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5F5F4] text-[11px] font-semibold text-[#525252]">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[#A3A3A3]">
            Format may have changed since these instructions were written. If
            the screens don&rsquo;t match what you see, email{" "}
            <a href="mailto:support@oyrb.space" className="underline hover:text-[#525252]">
              support@oyrb.space
            </a>
            .
          </p>
        </div>
      </section>

      {/* Step 2 — upload */}
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="border-b border-[#E7E5E4] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
            Step 2
          </p>
          <h2 className="mt-1 font-display text-base font-medium text-[#0A0A0A]">
            Upload the CSV
          </h2>
        </header>
        <div className="p-5">
          <label
            htmlFor="client-import-file"
            onDragEnter={(e) => {
              e.preventDefault();
              if (!isWorking) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (isWorking) return;
              const dropped = e.dataTransfer.files?.[0] ?? null;
              handleFile(dropped);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-5 py-10 text-center transition-colors ${
              dragOver
                ? "border-[#0A0A0A] bg-[#FAFAF9]"
                : "border-[#E7E5E4] bg-[#FAFAF9] hover:bg-[#F5F5F4]"
            } ${isWorking ? "pointer-events-none opacity-60" : ""}`}
          >
            {file ? (
              <>
                <FileText size={24} strokeWidth={1.5} className="text-[#525252]" />
                <p className="mt-3 text-sm font-medium text-[#0A0A0A]">{file.name}</p>
                <p className="mt-1 text-xs text-[#737373]">
                  {(file.size / 1024).toFixed(1)} KB · click to choose a different file
                </p>
              </>
            ) : (
              <>
                <Upload size={24} strokeWidth={1.5} className="text-[#525252]" />
                <p className="mt-3 text-sm font-medium text-[#0A0A0A]">
                  Drop your CSV here, or click to choose
                </p>
                <p className="mt-1 text-xs text-[#737373]">
                  CSV only · up to 10 MB
                </p>
              </>
            )}
            <input
              id="client-import-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/dashboard/clients/imports"
              className="text-center text-sm text-[#737373] transition-colors hover:text-[#0A0A0A]"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={!file || isWorking}
              onClick={onUpload}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isWorking && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
              {phaseLabel(phase)}
            </button>
          </div>
        </div>
      </section>

      {isWorking && (
        // Translucent overlay locks the surface during upload + parse
        // so the pro doesn't double-submit by re-clicking. The "what's
        // happening" caption updates as the phase advances.
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white px-6 py-5 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-[#525252]" />
              <p className="text-sm font-medium text-[#0A0A0A]">{phaseCaption(phase)}</p>
            </div>
            <p className="mt-1 text-xs text-[#737373]">
              Don&rsquo;t close this tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight tab strip — state-driven, no URL changes. Visual
// treatment mirrors src/app/dashboard/business-brain/_components/tab-bar.tsx
// so the surface looks like the rest of the dashboard.
function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav role="tablist" aria-label="Vendor instructions" className="flex flex-wrap gap-1 border-b border-[#E7E5E4]">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              isActive
                ? "border-[#0A0A0A] font-semibold text-[#0A0A0A]"
                : "border-transparent text-[#737373] hover:text-[#0A0A0A]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "minting": return "Preparing…";
    case "uploading": return "Uploading…";
    case "parsing": return "Parsing…";
    case "done": return "Redirecting…";
    default: return "Begin upload";
  }
}

function phaseCaption(phase: Phase): string {
  switch (phase) {
    case "minting": return "Preparing upload";
    case "uploading": return "Uploading file";
    case "parsing": return "Parsing rows";
    case "done": return "Almost done";
    default: return "Working";
  }
}
