import Link from "next/link";

/**
 * Segmented pill: Week / List. Pure server-rendered <Link>s. Active
 * state is derived from the searchParam value passed in by the page.
 *
 * Always uses an explicit `?view=` value so the URL reflects intent
 * even on the default branch.
 */

type Props = {
  active: "week" | "list";
  /** Shared querystring without `view` (e.g. `siteId=...&week=...`). */
  baseQuery: string;
};

export function ViewToggle({ active, baseQuery }: Props) {
  const buildHref = (view: "week" | "list") => {
    const q = baseQuery ? `${baseQuery}&view=${view}` : `view=${view}`;
    return `?${q}`;
  };

  const cls = (isActive: boolean) =>
    `inline-flex h-8 items-center px-3 text-xs font-medium ${
      isActive
        ? "bg-[#0A0A0A] text-white"
        : "text-[#525252] hover:text-[#0A0A0A]"
    }`;

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-[#E7E5E4]">
      <Link
        href={buildHref("week")}
        aria-current={active === "week" ? "page" : undefined}
        className={cls(active === "week")}
      >
        Week
      </Link>
      <Link
        href={buildHref("list")}
        aria-current={active === "list" ? "page" : undefined}
        className={`border-l border-[#E7E5E4] ${cls(active === "list")}`}
      >
        List
      </Link>
    </div>
  );
}
