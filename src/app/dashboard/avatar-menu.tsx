"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, User, ExternalLink, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { signOut } from "./actions";

const FAVICON_GRADIENT =
  "linear-gradient(135deg, #FF6EC7 0%, #D946EF 50%, #A855F7 100%)";
const FAVICON_GLOW =
  "0 0 0 2px #fff, 0 0 0 3px #D946EF, 0 2px 8px rgba(217,70,239,0.45)";

type Props = {
  profileImageUrl: string | null;
  initial: string;
  altLabel: string;
  email: string | null;
  displayName: string | null;
  viewSiteHref: string | null;
};

/**
 * Avatar-triggered dropdown menu for the dashboard header. Clicking the
 * avatar opens a panel with Profile & Settings, Dashboard Home, View my
 * site, and Sign out. Dismissible via the ✕ button, Escape key, or a
 * click on the backdrop — so users never feel stuck.
 */
export function AvatarMenu({
  profileImageUrl,
  initial,
  altLabel,
  email,
  displayName,
  viewSiteHref,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape key + body scroll lock while the menu is open.
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

  // Focus the panel when it opens so keyboard users land inside it.
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white shadow-sm outline-none ring-offset-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#D946EF]"
        style={{ background: FAVICON_GRADIENT, boxShadow: FAVICON_GLOW }}
      >
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt={altLabel}
            fill
            sizes="32px"
            className="object-cover"
          />
        ) : (
          <span className="select-none">{initial}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            role="menu"
            aria-label="Profile menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-4 w-[280px] rounded-xl border border-[#E7E5E4] bg-white shadow-2xl outline-none"
          >
            {/* Header with avatar + close button */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E5E4] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full text-sm font-semibold text-white"
                  style={{ background: FAVICON_GRADIENT }}
                >
                  {profileImageUrl ? (
                    <Image
                      src={profileImageUrl}
                      alt={altLabel}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {initial}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0A0A0A]">
                    {displayName ?? "Your profile"}
                  </p>
                  {email && (
                    <p className="truncate text-[11px] text-[#737373]">{email}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D946EF]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Menu items */}
            <nav className="p-1.5">
              <MenuLink href="/dashboard" onClick={close} icon={<LayoutDashboard size={15} />}>
                Dashboard Home
              </MenuLink>
              <MenuLink href="/dashboard/settings" onClick={close} icon={<User size={15} />}>
                Profile &amp; Settings
              </MenuLink>
              {viewSiteHref && (
                <MenuLink
                  href={viewSiteHref}
                  onClick={close}
                  external
                  icon={<ExternalLink size={15} />}
                >
                  View my site
                </MenuLink>
              )}
              <MenuLink
                href="/"
                onClick={close}
                icon={<Settings size={15} />}
              >
                Back to oyrb.space
              </MenuLink>
            </nav>

            <div className="border-t border-[#E7E5E4] p-1.5">
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] focus-visible:bg-[#FEF2F2] focus-visible:outline-none"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  onClick,
  external,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  external?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F4] focus-visible:bg-[#F5F5F4] focus-visible:outline-none"
    >
      <span className="text-[#737373]">{icon}</span>
      {children}
    </Link>
  );
}
