/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";

type Mode = "request" | "accept";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Display name of the OTHER pro shown in the body copy. */
  peerName: string;
  /** "request" = I'm vouching FOR them. "accept" = they vouched for me, I'm consenting to be on their site. */
  mode: Mode;
  /** Optional secondary action label. Defaults: "Cancel" for request, "Decline" for accept. */
  secondaryLabel?: string;
  /** Optional secondary action handler (e.g., decline-on-modal-close for accept mode). */
  onSecondary?: () => void | Promise<void>;
  /** Called when the user confirms with checkbox checked. Returns server result. */
  onConfirm: () => Promise<{ success: true } | { error: string }>;
  /** Optional below-checkbox slot for things like a vouch-note input on request mode. */
  children?: React.ReactNode;
};

export function VouchModal({
  open,
  onClose,
  peerName,
  mode,
  secondaryLabel,
  onSecondary,
  onConfirm,
  children,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Reset internal state every time the modal closes/reopens.
  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const heading =
    mode === "request"
      ? `Before you vouch for ${peerName}`
      : `Before you accept ${peerName}'s request`;

  const body =
    mode === "request"
      ? `Your reputation is on this recommendation. When you're unavailable, your clients will see ${peerName} on your storefront and may book with them based on your trust.`
      : `By accepting, your business will appear on ${peerName}'s storefront when they're unavailable. Make sure you're comfortable being publicly tied to their brand.`;

  const checkboxText =
    mode === "request"
      ? `I personally vouch for ${peerName}'s work and professionalism. I understand my clients may book with them based on this recommendation, and that I'm not liable for services they provide.`
      : `I accept this referral and consent to being shown on ${peerName}'s storefront when they're unavailable.`;

  const primaryLabel = mode === "request" ? "Send Request" : "Accept Referral";
  const secondaryActualLabel = secondaryLabel ?? (mode === "request" ? "Cancel" : "Decline");

  function handleConfirm() {
    if (!acknowledged) return;
    setError(null);
    start(async () => {
      const result = await onConfirm();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  function handleSecondary() {
    if (onSecondary) {
      Promise.resolve(onSecondary()).finally(() => onClose());
    } else {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vouch-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E7E5E4] px-6 py-4">
          <h2 id="vouch-modal-title" className="font-display text-lg font-medium tracking-tight">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-[#525252]">{body}</p>

          {children}

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A0A0A]"
            />
            <span className="leading-relaxed text-[#0A0A0A]">{checkboxText}</span>
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E7E5E4] px-6 py-4">
          <button
            type="button"
            onClick={handleSecondary}
            disabled={pending}
            className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
          >
            {secondaryActualLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!acknowledged || pending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
