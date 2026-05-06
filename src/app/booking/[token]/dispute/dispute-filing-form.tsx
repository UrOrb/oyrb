"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CLIENT_REASON_CODES,
  REASON_LABELS,
  MAX_FILES_PER_SIDE,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  MIN_OTHER_DETAIL_CHARS,
  isAllowedMime,
  reasonRequiresDetail,
  type ReasonCode,
} from "@/lib/disputes";

type Step = "reason" | "evidence" | "disclosure" | "submitting";

type Props = {
  token: string;
  proName: string;
};

/**
 * Client-facing Dispute Inquiry filing form. Multi-step state machine:
 *
 *   reason → evidence → disclosure → submitting → /dispute/filed
 *
 * Files uploaded directly to Supabase Storage via signed-URL pattern:
 * for each selected file the form requests an upload-token from the
 * server, PUTs the file to that URL, and accumulates the resulting
 * paths. On final submit, only the paths are sent to the dispute
 * creation route.
 *
 * Section 28 of TOS v1.3 ("OYRB does not process refunds") is shown
 * verbatim in the Disclosure step — clicking "I understand" is the
 * affirmative ack the spec requires.
 */
export function DisputeFilingForm({ token, proName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("reason");
  const [reasonCode, setReasonCode] = useState<ReasonCode | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickFiles(selected: FileList | null) {
    if (!selected) return;
    setError(null);
    const next: File[] = [...files];
    for (const f of Array.from(selected)) {
      if (next.length >= MAX_FILES_PER_SIDE) {
        setError(`Max ${MAX_FILES_PER_SIDE} files.`);
        break;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        setError(`${f.name} is over ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.`);
        continue;
      }
      if (!isAllowedMime(f.type)) {
        setError(`${f.name} isn't an allowed type. Use ${ALLOWED_MIME_TYPES.join(", ")}.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx));
  }

  async function uploadAll(): Promise<string[]> {
    const paths: string[] = [];
    for (const f of files) {
      // Mint a signed upload URL.
      const tokenRes = await fetch("/api/public/bookings/dispute/upload-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          filename: f.name,
          mime_type: f.type,
          size: f.size,
        }),
      });
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't authorize upload.");
      }
      const { uploadUrl, path } = await tokenRes.json();

      // PUT the file to Supabase's signed upload URL. Supabase expects
      // the file body as the request body; Content-Type is the file's
      // mime type.
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type, "x-upsert": "false" },
        body: f,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed for ${f.name}.`);
      }
      paths.push(path);
    }
    return paths;
  }

  async function submit() {
    setError(null);
    setStep("submitting");
    startTransition(async () => {
      try {
        const paths = await uploadAll();
        setUploadedPaths(paths);
        const res = await fetch("/api/public/bookings/dispute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            reason_code: reasonCode,
            reason_detail: reasonDetail,
            evidence_paths: paths,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Couldn't file the inquiry.");
          setStep("disclosure");
          return;
        }
        // Success — route to filed confirmation page.
        router.push(`/booking/${token}/dispute/filed`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStep("disclosure");
      }
    });
  }

  // ── Render per step ─────────────────────────────────────────────
  return (
    <div>
      <Link
        href={`/booking/${token}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#737373] hover:text-[#0A0A0A]"
      >
        ← Back to booking
      </Link>

      <h1 className="mt-3 font-display text-2xl font-medium tracking-tight md:text-3xl">
        File a Dispute Inquiry
      </h1>
      <p className="mt-2 text-sm text-[#737373]">
        About your booking with <strong className="text-[#0A0A0A]">{proName}</strong>.
      </p>

      <Stepper step={step} />

      <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
        {step === "reason" && (
          <div>
            <h2 className="text-base font-semibold">What happened?</h2>
            <p className="mt-1 text-xs text-[#737373]">
              Choose the closest reason. We&apos;ll ask for details and evidence next.
            </p>
            <fieldset className="mt-4 space-y-2">
              {CLIENT_REASON_CODES.map((code) => (
                <label
                  key={code}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer ${
                    reasonCode === code
                      ? "border-[#0A0A0A] bg-[#FAFAF9]"
                      : "border-[#E7E5E4] hover:border-[#B8896B]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={code}
                    checked={reasonCode === code}
                    onChange={() => setReasonCode(code)}
                    className="mt-1"
                  />
                  <span className="text-sm text-[#0A0A0A]">{REASON_LABELS[code]}</span>
                </label>
              ))}
            </fieldset>

            {reasonCode && reasonRequiresDetail(reasonCode) && (
              <label className="mt-4 block text-xs">
                <span className="text-[#525252]">
                  Describe what happened ({MIN_OTHER_DETAIL_CHARS}+ characters)
                </span>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none"
                  placeholder="What happened, when, and any context that helps OYRB review fairly."
                />
              </label>
            )}

            {reasonCode && !reasonRequiresDetail(reasonCode) && (
              <label className="mt-4 block text-xs">
                <span className="text-[#525252]">Anything else (optional, max 1000 chars)</span>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none"
                />
              </label>
            )}

            {error && <ErrorBanner text={error} />}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!reasonCode) {
                    setError("Pick a reason.");
                    return;
                  }
                  if (
                    reasonRequiresDetail(reasonCode) &&
                    reasonDetail.trim().length < MIN_OTHER_DETAIL_CHARS
                  ) {
                    setError(
                      `Please describe what happened (at least ${MIN_OTHER_DETAIL_CHARS} characters).`,
                    );
                    return;
                  }
                  setError(null);
                  setStep("evidence");
                }}
                className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#262626]"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "evidence" && (
          <div>
            <h2 className="text-base font-semibold">Evidence (optional)</h2>
            <p className="mt-1 text-xs text-[#737373]">
              Up to {MAX_FILES_PER_SIDE} files, {Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB
              each. Images (JPG, PNG, WebP) and PDFs only. The professional cannot see your
              evidence — only OYRB does.
            </p>

            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-semibold text-[#0A0A0A] hover:border-[#B8896B]">
              <input
                type="file"
                multiple
                accept={ALLOWED_MIME_TYPES.join(",")}
                onChange={(e) => pickFiles(e.target.files)}
                className="hidden"
              />
              Add files
            </label>

            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-[#E7E5E4] rounded-md border border-[#E7E5E4]">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="truncate text-[#525252]">
                      {f.name} <span className="text-[#A3A3A3]">({Math.round(f.size / 1024)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-3 text-[#737373] hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <ErrorBanner text={error} />}

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                onClick={() => setStep("reason")}
                className="rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAF9]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("disclosure")}
                className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#262626]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "disclosure" && (
          <div>
            <h2 className="text-base font-semibold">Before you file</h2>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">OYRB does not process refunds.</p>
              <p className="mt-2 leading-relaxed">
                Filing this Dispute Inquiry will affect this professional&apos;s rating only. For
                refunds, please contact <strong>{proName}</strong> directly or initiate a chargeback
                through your bank or Stripe.
              </p>
              <p className="mt-2 leading-relaxed">
                The professional has 48 hours to upload counter-evidence. After that, OYRB will
                review documentation from both sides and apply a rating adjustment based on what&apos;s
                there. OYRB is not a small claims court, arbitrator, or judge of disputes — the
                Dispute Inquiry system is a reputation tool, not a legal remedy.
              </p>
              <p className="mt-2 text-xs text-amber-800">
                See{" "}
                <Link href="/terms#section-28" className="underline">
                  Terms of Service §28
                </Link>{" "}
                for the full process.
              </p>
            </div>

            {error && <ErrorBanner text={error} />}

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                onClick={() => setStep("evidence")}
                disabled={pending}
                className="rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAF9] disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#262626] disabled:opacity-50"
              >
                I understand — file inquiry
              </button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold">Filing your inquiry…</p>
            <p className="mt-1 text-xs text-[#737373]">Uploading evidence and submitting.</p>
            {uploadedPaths.length > 0 && (
              <p className="mt-2 text-[11px] text-[#A3A3A3]">
                Uploaded {uploadedPaths.length} of {files.length} files…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels: Array<{ key: Step | "submitting"; label: string }> = [
    { key: "reason", label: "Reason" },
    { key: "evidence", label: "Evidence" },
    { key: "disclosure", label: "Disclosure" },
  ];
  const order: Record<Step, number> = {
    reason: 0,
    evidence: 1,
    disclosure: 2,
    submitting: 3,
  };
  const cur = order[step];
  return (
    <ol className="mt-5 flex items-center gap-2 text-xs text-[#737373]">
      {labels.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              i <= cur ? "bg-[#0A0A0A] text-white" : "bg-[#FAFAF9] text-[#737373]"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= cur ? "text-[#0A0A0A]" : ""}>{s.label}</span>
          {i < labels.length - 1 && <span className="mx-1 text-[#E7E5E4]">·</span>}
        </li>
      ))}
    </ol>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
      {text}
    </div>
  );
}
