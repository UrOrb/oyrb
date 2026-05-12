"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { normalizeToE164 } from "@/lib/phone";

type InitialFields = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type Props = {
  clientId: string;
  initial: InitialFields;
  /** Current sms_consent value — drives the "phone change requires
   *  re-opt-in" confirmation modal. */
  smsConsent: boolean;
  /** Optional callback invoked when Cancel is clicked OR a successful
   *  save completes. When present, the form treats itself as embedded
   *  in a parent modal: Cancel becomes a button that calls onClose
   *  (instead of a Link to /dashboard/clients), and successful saves
   *  call onClose after the router.refresh(). When absent (legacy
   *  page-level usage), Cancel is a Link as before. */
  onClose?: () => void;
  /** Which field gets initial focus on mount. Default "name" — matches
   *  pre-PR-5 behavior. The Notes tile passes "notes" so clicking it
   *  opens the modal with the textarea already focused. */
  initialFocus?: "name" | "notes";
};

const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#FAFAF9]";

/**
 * Editable contact-details form. Mirrors the goal-form.tsx pattern
 * (useState + useTransition + inline status) but uses fetch against
 * the PATCH endpoint instead of a server action.
 *
 * Phone-change SMS-consent gate:
 *   When the pro changes the phone field AND the client currently has
 *   sms_consent=true, the Save click pops a confirmation modal first.
 *   On confirm, the PATCH lands and the backend defensively clears
 *   sms_consent_*. Without confirmation, the form returns to the
 *   "Save" state without sending the request.
 *
 * Phone normalization preview:
 *   As the pro types, we attempt normalizeToE164 and surface the
 *   normalized form below the input. Cosmetic — backend re-normalizes
 *   and rejects unparseable values with 400 invalid_phone.
 */
export function ClientEditForm({
  clientId,
  initial,
  smsConsent,
  onClose,
  initialFocus = "name",
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [notes, setNotes] = useState(initial.notes);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Initial focus — fires once on mount. notes is the only other
  // focusable target today; expand the union if a future tile wants
  // to deep-link into email/phone.
  useEffect(() => {
    if (initialFocus === "notes") notesRef.current?.focus();
    else nameRef.current?.focus();
  }, [initialFocus]);

  const dirty =
    name !== initial.name ||
    email !== initial.email ||
    phone !== initial.phone ||
    notes !== initial.notes;

  const phoneChanged = phone.trim() !== initial.phone.trim();
  // Normalize both sides so a cosmetic difference ("(404) 555-1234" vs
  // "+14045551234") doesn't trigger the consent modal when the actual
  // dialable number is the same.
  const phoneEffectivelyChanged = useMemo(() => {
    if (!phoneChanged) return false;
    const a = phone.trim() ? normalizeToE164(phone.trim()) : null;
    const b = initial.phone.trim() ? normalizeToE164(initial.phone.trim()) : null;
    return a !== b;
  }, [phone, phoneChanged, initial.phone]);

  const phonePreview = useMemo(() => {
    const trimmed = phone.trim();
    if (!trimmed) return null;
    const norm = normalizeToE164(trimmed);
    if (!norm) return { ok: false, text: "Could not parse this phone number." } as const;
    if (norm === trimmed) return null;
    return { ok: true, text: `Will be saved as ${norm}` } as const;
  }, [phone]);

  const requiresConsentConfirm = phoneEffectivelyChanged && smsConsent;

  // Body shipped to the PATCH endpoint. Empty strings get coerced to
  // null on the server side; we just send the trimmed user input.
  const buildBody = () => {
    const body: Record<string, string> = {};
    if (name.trim() !== initial.name.trim()) body.name = name;
    if (email.trim() !== initial.email.trim()) body.email = email;
    if (phone.trim() !== initial.phone.trim()) body.phone = phone;
    if (notes.trim() !== initial.notes.trim()) body.notes = notes;
    return body;
  };

  const submit = () => {
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch(`/api/dashboard/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg({
            type: "err",
            text: data?.message ?? errorCopy(data?.error) ?? "Save failed.",
          });
          return;
        }
        setMsg({
          type: "ok",
          text: data.sms_consent_cleared
            ? "Saved. SMS consent cleared — client will need to re-opt-in."
            : "Saved.",
        });
        // router.refresh re-runs the server component so the consent
        // strip + last-visit metadata reflect the new values.
        router.refresh();
        // When embedded in a parent modal, close it after a successful
        // save. The brief flash of the "Saved." message before close
        // is intentional acknowledgement.
        if (onClose) {
          // Give router.refresh a tick to start before unmounting.
          setTimeout(() => onClose(), 0);
        }
      } catch (e) {
        setMsg({ type: "err", text: e instanceof Error ? e.message : "Network error" });
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !dirty) return;
    if (!name.trim()) {
      setMsg({ type: "err", text: "Name is required." });
      return;
    }
    if (requiresConsentConfirm) {
      setShowConsentModal(true);
      return;
    }
    submit();
  };

  const onConfirmConsentReset = () => {
    setShowConsentModal(false);
    submit();
  };

  // Hide the "Saved." message once the user has started editing again
  // — derived from current state, no effect needed. Errors keep showing
  // since they're still actionable when dirty.
  const visibleMsg = msg && msg.type === "ok" && dirty ? null : msg;

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-xs font-medium text-[#0A0A0A]">Name</span>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            required
            className={inputCls}
          />
        </label>

        <label>
          <span className="text-xs font-medium text-[#0A0A0A]">
            Email <span className="font-normal text-[#A3A3A3]">(optional)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className={inputCls}
          />
        </label>

        <label>
          <span className="text-xs font-medium text-[#0A0A0A]">
            Phone <span className="font-normal text-[#A3A3A3]">(optional)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            className={inputCls}
          />
          {phonePreview && (
            <p
              className={`mt-1 text-[11px] ${
                phonePreview.ok ? "text-[#737373]" : "text-rose-700"
              }`}
            >
              {phonePreview.text}
            </p>
          )}
        </label>

        <label className="sm:col-span-2">
          <span className="text-xs font-medium text-[#0A0A0A]">
            Notes <span className="font-normal text-[#A3A3A3]">(only you see these)</span>
          </span>
          <textarea
            ref={notesRef}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            placeholder="Allergies, color formulas, preferences, anything you want to remember."
            className={`${inputCls} resize-y`}
          />
        </label>

        {requiresConsentConfirm && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>
              You&rsquo;re changing the phone number on a client with active
              SMS consent. Saving will clear their SMS opt-in for legal
              compliance — you&rsquo;ll be asked to confirm.
            </span>
          </div>
        )}

        {visibleMsg && (
          <p
            className={`sm:col-span-2 text-xs ${
              visibleMsg.type === "ok" ? "text-green-700" : "text-rose-700"
            }`}
          >
            {visibleMsg.text}
          </p>
        )}

        <div className="sm:col-span-2 flex flex-col-reverse gap-3 border-t border-[#E7E5E4] pt-4 sm:flex-row sm:items-center sm:justify-end">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm text-[#525252] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
            >
              Cancel
            </button>
          ) : (
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm text-[#525252] transition-colors hover:bg-[#F5F5F4]"
            >
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {showConsentModal && (
        <ConsentResetModal
          clientName={initial.name}
          onCancel={() => setShowConsentModal(false)}
          onConfirm={onConfirmConsentReset}
        />
      )}
    </>
  );
}

function ConsentResetModal({
  clientName,
  onCancel,
  onConfirm,
}: {
  clientName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-reset-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[#E7E5E4] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#E7E5E4] px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={1.5} className="text-amber-600" />
            <h3
              id="consent-reset-title"
              className="font-display text-base font-medium text-[#0A0A0A]"
            >
              Confirm SMS consent reset
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-[#737373] hover:text-[#0A0A0A]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-[#525252]">
          <p>
            Changing this phone number will require <strong>{clientName}</strong>{" "}
            to re-opt-in to SMS messages. This is required for legal
            compliance (TCPA — consent applies to the specific phone number).
          </p>
          <p className="mt-3 text-xs text-[#737373]">
            We&rsquo;ll save the new number and clear all SMS opt-in
            metadata. You can always send them a fresh opt-in link later.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-[#FAFAF9] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm text-[#525252] hover:bg-[#F5F5F4]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-85"
          >
            Continue and clear consent
          </button>
        </div>
      </div>
    </div>
  );
}

function errorCopy(code: string | undefined): string | null {
  switch (code) {
    case "invalid_name":
      return "Name is required.";
    case "invalid_email":
      return "Email address is malformed.";
    case "invalid_phone":
      return "Phone number could not be normalized. Use a digits-only or international format.";
    case "not_found":
      return "Client not found.";
    case "unauthorized":
      return "Sign in to continue.";
    case "update_failed":
      return "Save failed unexpectedly. Try again or contact support.";
    case "invalid_json":
      return "Couldn't read the form data. Refresh and try again.";
    default:
      return null;
  }
}
