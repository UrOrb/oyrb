"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordTosReacceptance } from "@/app/dashboard/accept-tos/actions";

/**
 * Blocking re-acceptance modal. Renders when the current user's latest
 * accepted TOS version is below the current public version. The
 * dashboard layout decides whether to mount this — the component itself
 * always renders the dialog when present.
 *
 * Block semantics:
 *   - No close button, no Escape key, no backdrop dismiss
 *   - Body scroll locked while mounted
 *   - "I accept and continue" is the only way out
 *
 * Recovery: the server action writes the row and returns
 * { success: true } | { error }. Success unmounts via React state and
 * fires router.refresh() so server components on the dashboard re-read
 * any consent-dependent state. Errors leave the modal mounted with an
 * inline retry message — no hard redirect, no broken-state risk.
 */
export function ToSReacceptanceModal({ tosVersion }: { tosVersion: string }) {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while the modal is mounted; restore on unmount.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Swallow Escape so the user can't dismiss with the keyboard. Capture
  // phase so we win against any inner element that might handle Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, []);

  // Initial focus on the primary action.
  useEffect(() => {
    acceptButtonRef.current?.focus();
  }, []);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await recordTosReacceptance();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Success — unmount the modal and re-render server components on
      // the dashboard so any consent-dependent state refreshes.
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tos-reacceptance-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8"
    >
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6 md:px-8 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B8896B]">
            Action required
          </p>
          <h2
            id="tos-reacceptance-title"
            className="mt-1 font-display text-2xl font-medium tracking-tight md:text-3xl"
          >
            We&apos;ve updated our Terms
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#525252]">
            Effective May 5, 2026, version {tosVersion} of OYRB&apos;s Terms of
            Service applies. Please review and accept to continue.
          </p>

          <div className="mt-6 border-t border-[#E7E5E4] pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              What&apos;s new in {tosVersion}
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-relaxed text-[#2a2a2a]">
              <li>
                <strong className="text-[#0A0A0A]">✦ Honesty Clause</strong> —
                Both clients and pros agree to act in good faith. Violations
                may result in account suspension.
              </li>
              <li>
                <strong className="text-[#0A0A0A]">✦ Dispute Inquiry Process</strong>{" "}
                — A reputation tool for documenting disagreements. Affects pro
                ratings only. OYRB doesn&apos;t process refunds.
              </li>
              <li>
                <strong className="text-[#0A0A0A]">✦ Strike System</strong> —
                Pros with multiple unresolved disputes may have their
                storefront paused. Subscription billing continues separately.
              </li>
              <li>
                <strong className="text-[#0A0A0A]">✦ No Payment Guarantee</strong>{" "}
                — OYRB is a software platform, not a payment processor or
                refund service. Disputes go through the pro and Stripe
                directly.
              </li>
            </ul>
          </div>

          <p className="mt-6 text-sm">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B8896B] underline hover:text-[#0A0A0A]"
            >
              Read the full Terms ({tosVersion}) →
            </a>
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-md bg-red-50 px-4 py-3 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              ref={acceptButtonRef}
              type="button"
              onClick={handleAccept}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isPending ? "Saving…" : "I accept and continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
