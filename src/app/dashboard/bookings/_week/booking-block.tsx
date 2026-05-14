import Link from "next/link";

import { SLOT_HEIGHT_PX } from "./week-helpers";

/**
 * Compact booking tile rendered inside a day column on the week grid.
 *
 * Position + dimension are caller-driven so the parent can lane-pack
 * overlaps without this component knowing about siblings:
 *   topPx        — pixels from the top of the day column (0 = 7am)
 *   heightPx     — duration in pixels (minHeight enforced visually)
 *   leftPercent  — 0 / 50 for two-lane stacking
 *   widthPercent — 100 / 50
 *
 * Truncation cascade based on rendered height:
 *   ≥60px → 3 lines (client / service / time)
 *   44–59px → 2 lines (client / service · time)
 *   <44px → 1 line (client) with tooltip carrying the full label
 *
 * Status visual language is fixed across the app for this surface:
 *   confirmed  peach + brand warm-brown left anchor
 *   pending    amber
 *   completed  emerald
 *   cancelled  gray + line-through (inert read)
 *
 * Wraps its body in a Link to /dashboard/bookings/[id] — same target
 * as the list-view BookingRow's overlay link.
 */

export type BookingBlockData = {
  id: string;
  status: string;
  start_at: string;
  end_at: string;
  clientName: string;
  serviceName: string;
  /** Pre-formatted "9:30 AM" (already in pro tz). */
  startLabel: string;
  /** Pre-formatted "10:30 AM". */
  endLabel: string;
  /** True when the booking starts before DAY_START_HOUR — render ↑. */
  clipsTop: boolean;
  /** True when the booking ends after DAY_END_HOUR — render ↓. */
  clipsBottom: boolean;
};

type Props = BookingBlockData & {
  topPx: number;
  heightPx: number;
  leftPercent: number;
  widthPercent: number;
};

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "bg-[#FCE4D8] border-l-2 border-[#B8896B] text-[#3a2a1c]",
  pending: "bg-amber-50 border border-amber-200 text-amber-900",
  completed: "bg-emerald-50 border border-emerald-200 text-emerald-900",
  cancelled:
    "bg-[#FAFAF9] border border-[#E7E5E4] text-[#A3A3A3] line-through",
};

export function BookingBlock(props: Props) {
  const {
    id,
    status,
    clientName,
    serviceName,
    startLabel,
    endLabel,
    clipsTop,
    clipsBottom,
    topPx,
    heightPx,
    leftPercent,
    widthPercent,
  } = props;

  const lines = heightPx >= SLOT_HEIGHT_PX ? 3 : heightPx >= 44 ? 2 : 1;
  const statusClass = STATUS_CLASSES[status] ?? STATUS_CLASSES.pending;
  const tooltip = `${clientName} · ${serviceName} · ${startLabel}–${endLabel} · ${status}`;

  // Math.max enforces the 44px touch target floor even when duration
  // would render shorter — short blocks are rare (back-to-back 15-min
  // services) but still need to be tappable.
  const renderedHeight = Math.max(44, heightPx);

  return (
    <Link
      href={`/dashboard/bookings/${id}`}
      title={tooltip}
      aria-label={tooltip}
      className={`absolute overflow-hidden rounded-md px-2 py-1 text-[11px] leading-tight transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#B8896B] focus-visible:ring-offset-1 focus-visible:outline-none ${statusClass}`}
      style={{
        top: `${topPx}px`,
        height: `${renderedHeight}px`,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
      }}
    >
      {clipsTop && (
        <span className="pointer-events-none absolute top-0 right-1 text-[9px] opacity-60">↑</span>
      )}
      {clipsBottom && (
        <span className="pointer-events-none absolute right-1 bottom-0 text-[9px] opacity-60">↓</span>
      )}

      {lines === 3 && (
        <>
          <p className="truncate font-semibold">{clientName}</p>
          <p className="truncate">{serviceName}</p>
          <p className="truncate text-[10px] opacity-75">
            {startLabel} – {endLabel}
          </p>
        </>
      )}
      {lines === 2 && (
        <>
          <p className="truncate font-semibold">{clientName}</p>
          <p className="truncate text-[10px] opacity-75">
            {serviceName} · {startLabel}
          </p>
        </>
      )}
      {lines === 1 && (
        <p className="truncate font-medium">{clientName}</p>
      )}
    </Link>
  );
}
