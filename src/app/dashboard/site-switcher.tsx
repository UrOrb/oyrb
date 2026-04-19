"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";

type Site = { id: string; business_name: string; slug: string };

type Props = {
  sites: Site[];
  activeId: string;
  /** When true, page-level params drive `siteId`; switching pushes a query
   *  param. When false (e.g. on /dashboard) we just persist the cookie and
   *  refresh, since the dashboard reads every business anyway. */
  pushQuery?: boolean;
};

export function SiteSwitcher({ sites, activeId, pushQuery = true }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const active = sites.find((s) => s.id === activeId) ?? sites[0];
  if (!active) return null;

  async function pick(siteId: string) {
    setOpen(false);
    // Persist as the active site so server actions and other pages pick it
    // up automatically.
    await fetch("/api/dashboard/active-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    if (pushQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set("siteId", siteId);
      router.replace(url.pathname + url.search);
    }
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1 text-xs font-medium hover:bg-[#FAFAF9]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[160px] truncate">{active.business_name}</span>
        <ChevronDown size={12} className="opacity-60" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-md border border-[#E7E5E4] bg-white shadow-lg"
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Your sites
          </p>
          {sites.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[#FAFAF9] ${
                s.id === activeId ? "font-semibold" : ""
              }`}
              role="option"
              aria-selected={s.id === activeId}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{s.business_name}</div>
                <div className="truncate text-[10px] font-mono text-[#A3A3A3]">/s/{s.slug}</div>
              </div>
              {s.id === activeId && <Check size={12} className="ml-2 shrink-0 text-[#B8896B]" />}
            </button>
          ))}
          <div className="border-t border-[#E7E5E4]">
            <Link
              href="/dashboard/site/new"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0A0A0A] hover:bg-[#FAFAF9]"
              onClick={() => setOpen(false)}
            >
              <Plus size={12} /> Add a new site
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#737373] hover:bg-[#FAFAF9]"
              onClick={() => setOpen(false)}
            >
              ← All sites
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
