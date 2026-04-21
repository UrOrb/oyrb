"use client";

import { useState, useTransition } from "react";
import { acceptAgreement } from "./actions";

// The three required acknowledgements match the public directory terms.
// Every checkbox must be ticked before we call acceptAgreement() — the
// server still re-validates that the version sent matches the current
// DIRECTORY_AGREEMENT_VERSION, so client-side bypass doesn't skip it.
const REQUIRED_CHECKS = [
  {
    id: "public",
    label:
      "I understand my profile will be visible on the public internet at oyrb.space/find.",
  },
  {
    id: "no_pii",
    label:
      "I will not put personal email, phone, or home address into any field that goes public. (We also auto-block these patterns.)",
  },
  {
    id: "remove_anytime",
    label:
      "I can remove my listing at any time from this page — it disappears from /find within 5 minutes.",
  },
] as const;

type CheckId = (typeof REQUIRED_CHECKS)[number]["id"];

export function AgreementForm({ version }: { version: string }) {
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({
    public: false,
    no_pii: false,
    remove_anytime: false,
  });
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const allChecked = REQUIRED_CHECKS.every((c) => checks[c.id]);

  const onAgree = () => {
    setErr(null);
    startTransition(async () => {
      const r = await acceptAgreement();
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {REQUIRED_CHECKS.map((c) => (
          <label key={c.id} className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={checks[c.id]}
              onChange={(e) =>
                setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span className="text-[#525252]">{c.label}</span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-[#A3A3A3]">
        By agreeing you also accept the{" "}
        <a
          href="/terms#directory"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-[#525252]"
        >
          OYRB Directory Terms
        </a>
        . Agreement version: {version}.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <a
          href="/dashboard/directory"
          className="inline-flex rounded-md border border-[#E7E5E4] bg-white px-4 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
        >
          ← Back
        </a>
        <button
          type="button"
          disabled={!allChecked || pending}
          onClick={onAgree}
          className="inline-flex rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Saving…" : "I Agree — Continue"}
        </button>
        <a
          href="/dashboard/settings"
          className="ml-auto text-xs text-[#A3A3A3] hover:text-[#525252]"
        >
          Exit setup
        </a>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
