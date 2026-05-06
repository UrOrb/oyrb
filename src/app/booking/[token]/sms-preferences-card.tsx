"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  businessName: string;
  /** Current consent state from the clients row. */
  initialConsent: boolean;
  /** Phone on file at the moment the page rendered. NULL or empty
   *  means we'll show an inline phone input alongside the opt-in
   *  control so the client can opt in without a second round-trip. */
  initialPhone: string | null;
};

/**
 * SMS reminders preferences card. Renders below the booking detail
 * card on /booking/[token]. The card itself is the only mutable
 * piece of the magic-link page beyond cancel/reschedule.
 *
 * Two layouts depending on phone-on-file:
 *   - Phone present → masked-number display + toggle
 *   - No phone     → inline tel input + combined save+opt-in action
 *
 * Both layouts surface the TCPA-required disclosure adjacent to the
 * opt-in control. The disclosure is verbatim from the public booking
 * widget so the two surfaces stay in legal sync.
 */
export function SmsPreferencesCard({
  token,
  businessName,
  initialConsent,
  initialPhone,
}: Props) {
  const router = useRouter();
  const [consent, setConsent] = useState(initialConsent);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const hasPhoneOnFile = (initialPhone ?? "").trim().length > 0;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function maskedPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 4) return "***-***-****";
    return `***-***-${digits.slice(-4)}`;
  }

  function submit(nextConsent: boolean) {
    setError(null);
    setConfirmation(null);
    startTransition(async () => {
      const res = await fetch("/api/public/bookings/sms-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          consent: nextConsent,
          phone: hasPhoneOnFile ? undefined : phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your preference. Please try again.");
        return;
      }
      setConsent(nextConsent);
      setConfirmation(
        nextConsent
          ? `✓ You're now receiving SMS reminders from ${businessName}.`
          : `You've opted out of SMS reminders from ${businessName}.`,
      );
      router.refresh();
    });
  }

  // ── Phone-on-file layout: toggle + masked number ──────────────────
  if (hasPhoneOnFile) {
    return (
      <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
          SMS reminders
        </p>
        <h2 className="mt-2 font-display text-xl font-medium">
          {consent
            ? `You're receiving SMS reminders.`
            : `You're not receiving SMS reminders.`}
        </h2>
        <p className="mt-2 text-sm text-[#525252]">
          {consent
            ? `${businessName} will text appointment reminders to ${maskedPhone(initialPhone ?? "")}.`
            : `Opt in to get appointment reminders by text from ${businessName} at ${maskedPhone(initialPhone ?? "")}.`}
        </p>

        <Disclosure />

        {error && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {confirmation && (
          <div role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {confirmation}
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => submit(!consent)}
            disabled={pending}
            className={
              consent
                ? "inline-flex items-center rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9] disabled:opacity-50"
                : "inline-flex items-center rounded-full bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            }
          >
            {pending ? "Saving…" : consent ? "Turn off SMS reminders" : "Turn on SMS reminders"}
          </button>
        </div>
      </div>
    );
  }

  // ── No-phone layout: inline tel input + combined save+opt-in ──────
  return (
    <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
        SMS reminders
      </p>
      <h2 className="mt-2 font-display text-xl font-medium">
        Add a phone number to enable SMS reminders.
      </h2>
      <p className="mt-2 text-sm text-[#525252]">
        {businessName} will text appointment reminders to the number you save below.
      </p>

      <label className="mt-4 block text-xs font-medium text-[#525252]">
        Mobile phone
      </label>
      <input
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 555-1234"
        className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none"
      />

      <Disclosure />

      {error && (
        <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {confirmation && (
        <div role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {confirmation}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            if (phone.replace(/\D/g, "").length < 10) {
              setError("Please enter a valid phone number (10 digits).");
              return;
            }
            submit(true);
          }}
          disabled={pending || phone.trim().length === 0}
          className="inline-flex items-center rounded-full bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & opt in"}
        </button>
      </div>
    </div>
  );
}

/**
 * TCPA-required disclosure block. Verbatim copy from the public
 * booking widget so the two consent capture surfaces stay aligned for
 * legal review. Linking "SMS Policy" in the same tab matches the
 * compliance UX guideline (don't bury policy access in a new tab).
 */
function Disclosure() {
  return (
    <p className="mt-3 text-[11px] leading-relaxed text-[#737373]">
      Message frequency varies. Message and data rates may apply. Reply STOP to
      unsubscribe.{" "}
      <Link href="/sms-policy" className="underline hover:text-[#0A0A0A]">
        View our SMS Policy
      </Link>
      .
    </p>
  );
}
