"use client";

// Mobile bottom tab bar with raised center Approvals action (SPEC §2).
// Hidden on md+ where the top nav takes over.
import {
  Contact,
  Inbox,
  KanbanSquare,
  Radar,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Dashboard", icon: Radar },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/approvals", label: "Approvals", icon: Inbox, raised: true },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end justify-between px-4">
        {tabs.map(({ href, label, icon: Icon, ...t }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const raised = "raised" in t && t.raised;
          return (
            <li key={href} className={cn(raised && "-mt-5")}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium",
                  active ? "text-signal" : "text-muted hover:text-fg",
                  raised &&
                    "rounded-full border border-line bg-surface-2 px-4 py-3 shadow-lg",
                  raised && active && "border-signal",
                )}
              >
                <Icon size={raised ? 24 : 20} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      {tabs.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              active
                ? "bg-surface-2 text-signal"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
