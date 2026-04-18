"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Scissors,
  CalendarDays,
  Users,
  Settings,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Site", href: "/dashboard/site", icon: Globe },
  { label: "Services", href: "/dashboard/services", icon: Scissors },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E7E5E4] bg-[#FAFAF9] md:flex">
      <div className="flex h-14 items-center border-b border-[#E7E5E4] px-6">
        <Link href="/" className="font-display text-base font-medium tracking-tight">
          GlamStack
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[#F5F5F4] font-medium text-[#0A0A0A]"
                  : "text-[#525252] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
