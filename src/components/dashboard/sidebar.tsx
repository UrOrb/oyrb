import Link from "next/link";
import { DashboardNavLinks } from "@/components/dashboard/nav-links";

type Props = {
  /** Count of incoming pro_referrals in 'pending' state for the active business. */
  pendingTrustedPros?: number;
};

// Desktop sidebar. Hidden on mobile (md:flex) — at <768px the
// `MobileNav` component renders a hamburger + slide-out drawer that
// consumes the same `DashboardNavLinks` body, so the nav item set
// stays in lockstep across both surfaces.
export function Sidebar({ pendingTrustedPros = 0 }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E7E5E4] bg-[#FAFAF9] md:flex">
      <div className="flex h-14 items-center border-b border-[#E7E5E4] px-6">
        <Link href="/" className="font-display text-base font-medium tracking-tight">
          OYRB
        </Link>
      </div>
      <DashboardNavLinks pendingTrustedPros={pendingTrustedPros} />
    </aside>
  );
}
