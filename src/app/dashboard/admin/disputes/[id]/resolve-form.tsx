"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveDispute } from "./resolve/actions";

type Props = { disputeId: string };

/**
 * Admin resolve form. Renders two action buttons (Strike vs Dismiss)
 * with a shared adminNotes textarea above. Confirm step prevents
 * accidental clicks since the resolution emails fire immediately.
 */
export function ResolveForm({ disputeId }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(outcome: "strike" | "dismissed") {
    const verb = outcome === "strike" ? "apply a strike" : "dismiss the inquiry";
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)}? Both sides will be emailed.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await resolveDispute(disputeId, outcome, notes);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block text-xs">
        <span className="text-[#525252]">Admin notes (optional, max 2000 chars — included in resolution emails)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none"
          placeholder="What you found in the documentation, why this outcome…"
        />
      </label>
      {error && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("strike")}
          disabled={pending}
          className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Resolving…" : "Apply strike"}
        </button>
        <button
          type="button"
          onClick={() => submit("dismissed")}
          disabled={pending}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Resolving…" : "Dismiss inquiry"}
        </button>
      </div>
    </div>
  );
}
