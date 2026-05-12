"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initiateRemoval } from "@/lib/remove-brand/actions";
import {
  CONFIRMATION_CHECKBOXES,
  BUSINESS_NAME_HINT_TEMPLATE,
  businessNameMatches,
} from "@/lib/remove-brand/confirmation-copy";

/**
 * Three-way confirmation gate (mirrors PR #53's friction-is-feature
 * affirmation modal): both checkboxes ticked + business name match
 * (case-insensitive, trimmed). Submit button stays disabled until
 * all three are true. The server action re-checks all three as
 * defense-in-depth.
 */
export function ConfirmForm({
  businessName,
  dateLabel,
}: {
  businessName: string;
  dateLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONFIRMATION_CHECKBOXES.map((c) => [c.id, false])),
  );
  const [typedName, setTypedName] = useState("");

  const allChecked = CONFIRMATION_CHECKBOXES.every((c) => checks[c.id]);
  const nameOk = businessNameMatches(typedName, businessName);
  const canSubmit = allChecked && nameOk && !pending;

  function onSubmit(formData: FormData) {
    setError(null);
    // Sync hidden checkbox state into the FormData since the server
    // action reads `data_downloaded` and `understand_permanent` keys.
    for (const c of CONFIRMATION_CHECKBOXES) {
      formData.set(c.id, checks[c.id] ? "on" : "");
    }
    formData.set("business_name", typedName);
    startTransition(async () => {
      const result = await initiateRemoval(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2.5">
        {CONFIRMATION_CHECKBOXES.map((box) => (
          <label
            key={box.id}
            htmlFor={`confirm-${box.id}`}
            className="flex cursor-pointer items-start gap-2.5 text-sm text-[#0A0A0A]"
          >
            <input
              id={`confirm-${box.id}`}
              type="checkbox"
              checked={!!checks[box.id]}
              disabled={pending}
              onChange={(e) =>
                setChecks((prev) => ({
                  ...prev,
                  [box.id]: e.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-[#E7E5E4]"
            />
            <span className="leading-relaxed text-[#525252]">
              {box.id === "understand_permanent"
                ? box.label.replace(
                    "on the deletion date",
                    `on ${dateLabel}`,
                  )
                : box.label}
            </span>
          </label>
        ))}
      </div>

      <div>
        <label
          htmlFor="business_name_confirm"
          className="block text-sm font-medium text-[#0A0A0A]"
        >
          Type your business name to confirm
        </label>
        <input
          id="business_name_confirm"
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          autoComplete="off"
          disabled={pending}
          placeholder={businessName}
          className="mt-1.5 block w-full max-w-md rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm focus:border-[#A3A3A3] focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-[#A3A3A3]">
          {BUSINESS_NAME_HINT_TEMPLATE(businessName)}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <a
          href="/dashboard/settings"
          className="inline-flex items-center justify-center rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm text-[#525252] hover:bg-[#F5F5F4]"
        >
          Cancel — back to Settings
        </a>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-md border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {pending ? "Starting removal…" : "Begin 14-day removal"}
        </button>
      </div>
    </form>
  );
}
