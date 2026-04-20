"use client";

import { useState, useTransition } from "react";
import { acceptAgreement } from "./actions";

export function AgreementForm({ version }: { version: string }) {
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onAgree = () => {
    setErr(null);
    startTransition(async () => {
      const r = await acceptAgreement();
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <div className="mt-6">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I&apos;ve read and agree to the{" "}
          <a href="/terms#directory" target="_blank" rel="noreferrer" className="underline">
            OYRB Directory Terms
          </a>
          . (Agreement version {version})
        </span>
      </label>
      <div className="mt-4 flex items-center gap-3">
        <a
          href="/dashboard"
          className="inline-flex rounded-md border border-[#E7E5E4] bg-white px-4 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
        >
          Cancel
        </a>
        <button
          type="button"
          disabled={!checked || pending}
          onClick={onAgree}
          className="inline-flex rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Saving…" : "I agree — continue to setup"}
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
