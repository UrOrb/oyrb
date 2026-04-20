"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#E7E5E4] bg-[#FAFAF9]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          title="Own Your Brand"
          className="font-display text-lg font-medium tracking-tight"
        >
          OYRB
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[#525252] md:flex">
          <Link href="/find" className="hover:text-[#0A0A0A] transition-colors">
            Find Pros
          </Link>
          <Link href="/features" className="hover:text-[#0A0A0A] transition-colors">
            Features
          </Link>
          <Link href="/templates" className="hover:text-[#0A0A0A] transition-colors">
            Templates
          </Link>
          <Link href="/pricing" className="hover:text-[#0A0A0A] transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-[#0A0A0A] transition-colors">
            About
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
          >
            Get started
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#E7E5E4] bg-[#FAFAF9] px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm">
            <Link href="/find" onClick={() => setOpen(false)}>Find Pros</Link>
            <Link href="/features" onClick={() => setOpen(false)}>Features</Link>
            <Link href="/templates" onClick={() => setOpen(false)}>Templates</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="w-fit rounded-md bg-[#0A0A0A] px-4 py-2 text-white"
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
