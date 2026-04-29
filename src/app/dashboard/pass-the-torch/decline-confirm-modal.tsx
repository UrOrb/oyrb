"use client";

import { useTransition, useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Display name of the pro whose request is being declined. */
  peerName: string;
  /** Fires the actual server-side decline. Returns the action result so
   *  this modal can surface server errors inline. */
  onConfirm: () => Promise<{ success: true } | { error: string }>;
};

/**
 * Two-button confirmation in front of declineReferral. Exists because
 * a stray click previously locked the requesting pro out for 30 days
 * with no easy recovery path on either side. Reversal lives in the
 * "Declined" section on /dashboard/pass-the-torch.
 */
export function DeclineConfirmModal({ open, onClose, peerName, onConfirm }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  function handleConfirm() {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decline-confirm-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E7E5E4] px-6 py-4">
          <h2 id="decline-confirm-title" className="font-display text-lg font-medium tracking-tight">
            Decline this request?
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
          <p className="text-sm leading-relaxed text-[#525252]">
            <strong className="font-semibold text-[#0A0A0A]">{peerName}</strong>{" "}
            won&apos;t be able to send you another request for 30 days.
            Make sure this is what you want.
          </p>
          <p className="text-xs leading-relaxed text-[#737373]">
            You can reverse a decline anytime from the &ldquo;Declined&rdquo;
            section on this page.
          </p>

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
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-50"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
