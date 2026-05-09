"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { DashboardNavLinks } from "@/components/dashboard/nav-links";

type Props = {
  /** Count of incoming pro_referrals in 'pending' state for the active business. */
  pendingTrustedPros?: number;
};

// Mobile-only navigation: hamburger button in the dashboard header
// triggers a left-anchored slide-out drawer rendering the same nav
// items the desktop sidebar shows. Pattern mirrors AvatarMenu — the
// canonical OYRB overlay treatment (backdrop, scroll lock, Escape,
// initial focus, ARIA roles) — and adds an explicit Tab focus trap on
// top, since the drawer is a navigation dialog rather than a small
// menu. Browser-back closes the drawer too, so swipe-back on iOS
// dismisses without leaving the page.
//
// All chrome carries `md:hidden` so this component is fully transparent
// at desktop breakpoints — the desktop `Sidebar` stays pixel-identical.
export function MobileNav({ pendingTrustedPros = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Tracks whether the drawer was previously open so we only return
  // focus to the trigger after a real close — not on initial mount,
  // which would steal focus from wherever the user was on page load.
  const wasOpen = useRef(false);

  // Escape key + body scroll lock + browser-back ("popstate") all close
  // the drawer. Cleaned up on close so background pages stay scrollable
  // and key events stop firing into a dismissed surface.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPop = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Initial focus on the panel when opening so screen readers announce
  // the dialog. On close, return focus to the trigger button (only if
  // the drawer was previously open — guards against the mount-time
  // false trigger).
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
      wasOpen.current = false;
    }
  }, [open]);

  // Tab focus trap. While the drawer is open, Tab/Shift-Tab cycles
  // through focusables inside the panel — escaping into the dimmed
  // background would defeat the dialog semantics. Re-queries on every
  // key press so dynamically-rendered children (badges with conditional
  // tabindex, etc.) are picked up without extra wiring. Portable to
  // AvatarMenu in a follow-up a11y-audit PR; intentionally not applied
  // there in this PR to keep scope tight.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="dashboard-mobile-nav"
        className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#525252] transition-colors hover:bg-[#F5F5F4] hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D946EF] md:hidden"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Outer drawer container. Always mounted so the slide-out and
          slide-in animations work; `inert` removes it from the tab
          order and AT tree when closed (React 19 supports this as a
          boolean prop). `pointer-events-none` belt-and-suspenders for
          older browsers without inert support. */}
      <div
        id="dashboard-mobile-nav"
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
        inert={!open}
      >
        {/* Backdrop. Tap to dismiss. Fades with the drawer. */}
        <div
          onClick={close}
          aria-hidden="true"
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:duration-0 motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Slide-out panel. 80% viewport width, capped at 320px so it
            looks right on both small phones and large phones. Border
            and bg match the desktop sidebar exactly. */}
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation"
          className={`absolute inset-y-0 left-0 flex w-[80%] max-w-[320px] flex-col border-r border-[#E7E5E4] bg-[#FAFAF9] shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:duration-0 motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E7E5E4] px-6">
            <Link
              href="/"
              onClick={close}
              className="font-display text-base font-medium tracking-tight"
            >
              OYRB
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#F5F5F4] hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D946EF]"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <DashboardNavLinks pendingTrustedPros={pendingTrustedPros} onNavigate={close} />
        </div>
      </div>
    </>
  );
}
