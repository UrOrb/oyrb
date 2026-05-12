/**
 * Shared value-format helpers for chart primitives.
 *
 * Server components cannot pass function props to "use client" chart
 * components (Next.js 16 / React 19 — functions aren't serializable
 * across the server/client boundary). So instead of accepting a
 * formatter function, the chart primitives accept a string-enum
 * `format` prop, and build the formatter internally from this helper.
 *
 * Format hints:
 *   "number"   → "1,234"               integer toLocaleString
 *   "currency" → "$1,234"              integer-rounded; caller divides
 *                                       cents/100 BEFORE passing data
 *   "percent"  → "37%"                 assumes input is 0-100
 *   "compact"  → "1.2k" / "999"        thousands-compact for big counts
 *
 * Add new format hints by extending the union below + the switch in
 * `formatterFor`. Keep them serializable (string-only); never push a
 * function into a prop typed against `ValueFormat`.
 */

export type ValueFormat = "number" | "currency" | "percent" | "compact";

export function formatterFor(format: ValueFormat): (v: number) => string {
  switch (format) {
    case "currency":
      return (v) =>
        `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "percent":
      return (v) => `${Math.round(v)}%`;
    case "compact":
      return (v) =>
        v >= 1000
          ? `${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
          : v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "number":
    default:
      return (v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
}
