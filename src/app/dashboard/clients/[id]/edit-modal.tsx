"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, StickyNote } from "lucide-react";
import { ClientEditForm } from "./edit-form";

/**
 * Phase 9 PR 5 — Edit modal trigger + container.
 *
 * Owns the modal open/close state and renders both:
 *   - The trigger button (style depends on `variant`)
 *   - The conditional modal containing <ClientEditForm>
 *
 * Why this pattern: <ClientEditForm> has its own nested
 * ConsentResetModal (legal-grade SMS opt-in re-confirm). Putting an
 * outer EditModal around it creates modal-on-modal. Both modals use
 * `fixed inset-0 z-50` so the inner mounts later in DOM order and
 * stacks visually on top. Body scroll-lock only fires from THIS
 * outer modal — the inner inherits the locked state.
 *
 * Two trigger variants:
 *   "button" — pencil-icon outline button for the hero tile
 *   "notes"  — bigger, click-the-whole-Notes-tile target (the Notes
 *              tile passes initialFocus="notes" so the textarea is
 *              focused on open)
 *
 * Multiple instances of EditTrigger can coexist on the page (hero
 * has one; Notes tile has one). Each owns its own modal state — when
 * pro clicks Notes, that instance opens; clicking Hero's edit
 * opens a separate instance. Both render the same form and target
 * the same API, just with different initialFocus.
 */

type Variant = "button" | "notes-target";

type Props = {
  clientId: string;
  clientName: string;
  initial: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  smsConsent: boolean;
  variant?: Variant;
  /** Which field to focus on open. */
  initialFocus?: "name" | "notes";
  /** Optional override for the trigger label (default: "Edit"). */
  triggerLabel?: string;
  /** Children render slot for the "notes-target" variant — lets
   *  the Notes tile render its own preview inside the trigger
   *  surface. Ignored for "button" variant. */
  children?: React.ReactNode;
};

export function EditTrigger({
  clientId,
  clientName,
  initial,
  smsConsent,
  variant = "button",
  initialFocus,
  triggerLabel,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  // Escape + body scroll-lock + focus the panel on open. Body lock
  // restores on close. Matches mobile-nav.tsx + tos-reacceptance-
  // modal.tsx conventions; the inner ConsentResetModal does not
  // body-lock so we own the scroll state here.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus the dialog on open; restore focus to the trigger on close.
  // wasOpen guard prevents stealing focus on initial mount.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
      wasOpen.current = false;
    }
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {variant === "button" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] transition-colors hover:border-[#A3A3A3] hover:text-[#0A0A0A]"
        >
          <Pencil size={12} strokeWidth={1.5} />
          {triggerLabel ?? "Edit client"}
        </button>
      ) : (
        /* notes-target — the whole tile is clickable. Caller renders
           its own children inside this button surface. */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel ?? `Edit notes for ${clientName}`}
          className="group relative flex min-h-[120px] w-full flex-col rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-5 text-left transition-colors hover:border-[#A3A3A3]"
        >
          {children}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-client-title"
          onClick={(e) => {
            // Click on backdrop closes; click on panel doesn't bubble.
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className="w-full max-w-xl overflow-hidden rounded-lg border border-[#E7E5E4] bg-white shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between border-b border-[#E7E5E4] px-5 py-4">
              <div className="flex items-center gap-2">
                {initialFocus === "notes" ? (
                  <StickyNote size={16} strokeWidth={1.5} className="text-[#B8896B]" />
                ) : (
                  <Pencil size={16} strokeWidth={1.5} className="text-[#525252]" />
                )}
                <h3
                  id="edit-client-title"
                  className="font-display text-base font-medium text-[#0A0A0A]"
                >
                  Edit {clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-[#737373] transition-colors hover:text-[#0A0A0A]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <ClientEditForm
              clientId={clientId}
              initial={initial}
              smsConsent={smsConsent}
              onClose={close}
              initialFocus={initialFocus}
            />
          </div>
        </div>
      )}
    </>
  );
}
