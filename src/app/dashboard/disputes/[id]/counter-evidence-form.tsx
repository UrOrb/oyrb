"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_FILES_PER_SIDE,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  isAllowedMime,
} from "@/lib/disputes";
import { submitCounterEvidence } from "./respond/actions";

type Props = {
  disputeId: string;
  existingPaths: string[];
};

/**
 * Pro counter-evidence upload form. Mirrors the client-side filing
 * form's signed-URL upload pattern but routes through the auth-gated
 * pro upload-token endpoint.
 *
 * Existing uploaded paths are accumulated across submissions — each
 * call to submitCounterEvidence replaces the full counter_evidence_urls
 * array, so the form preserves any previously-saved paths plus the
 * new uploads.
 */
export function CounterEvidenceForm({ disputeId, existingPaths }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickFiles(selected: FileList | null) {
    if (!selected) return;
    setError(null);
    const next: File[] = [...files];
    const allowance = MAX_FILES_PER_SIDE - existingPaths.length - next.length;
    let added = 0;
    for (const f of Array.from(selected)) {
      if (added >= allowance) {
        setError(`Max ${MAX_FILES_PER_SIDE} files total.`);
        break;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        setError(`${f.name} is over ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.`);
        continue;
      }
      if (!isAllowedMime(f.type)) {
        setError(`${f.name} isn't an allowed type.`);
        continue;
      }
      next.push(f);
      added++;
    }
    setFiles(next);
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx));
  }

  async function uploadAll(): Promise<string[]> {
    const paths: string[] = [];
    for (const f of files) {
      const tokenRes = await fetch(`/api/dashboard/disputes/${disputeId}/upload-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, mime_type: f.type, size: f.size }),
      });
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't authorize upload.");
      }
      const { uploadUrl, path } = await tokenRes.json();
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type, "x-upsert": "false" },
        body: f,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed for ${f.name}.`);
      paths.push(path);
    }
    return paths;
  }

  function submit() {
    setError(null);
    setSuccess(null);
    if (files.length === 0) {
      setError("Add at least one file.");
      return;
    }
    startTransition(async () => {
      try {
        const newPaths = await uploadAll();
        const all = [...existingPaths, ...newPaths];
        const result = await submitCounterEvidence(disputeId, all);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setFiles([]);
        setSuccess("Counter-evidence saved. OYRB will review when the 48-hour window closes.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <div>
      <p className="text-xs text-[#737373]">
        Upload up to {MAX_FILES_PER_SIDE - existingPaths.length} more file
        {MAX_FILES_PER_SIDE - existingPaths.length === 1 ? "" : "s"}. Images (JPG, PNG, WebP) and
        PDFs only, {Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB each. The reporter cannot see
        your evidence — only OYRB does.
      </p>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-semibold text-[#0A0A0A] hover:border-[#B8896B]">
        <input
          type="file"
          multiple
          accept={ALLOWED_MIME_TYPES.join(",")}
          onChange={(e) => pickFiles(e.target.files)}
          disabled={existingPaths.length >= MAX_FILES_PER_SIDE}
          className="hidden"
        />
        Add files
      </label>

      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-[#E7E5E4] rounded-md border border-[#E7E5E4]">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="truncate text-[#525252]">
                {f.name}{" "}
                <span className="text-[#A3A3A3]">({Math.round(f.size / 1024)} KB)</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={pending}
                className="ml-3 text-[#737373] hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {success}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Submit counter-evidence"}
          </button>
        </div>
      )}
    </div>
  );
}
