import { GoalMeter } from "../../goal-meter";
import type { GoalSnapshot } from "@/lib/goal-tracking";

/**
 * Goal tile — wraps the existing <GoalMeter> in the bento grid's
 * responsive sizing.
 *
 * Not wrapped in <BentoTile> because GoalMeter contains its own inner
 * <Link>s (Edit goal, Set goal) — nesting them inside an outer Link
 * would be invalid HTML. Instead, this wrapper applies the col-span
 * classes and lets GoalMeter's existing chrome handle the visual.
 *
 * GoalMeter returns null when the pro has toggled showOnDashboard
 * off; in that case the tile slot disappears from the bento and CSS
 * Grid reflows the remaining tiles. Acceptable — the bento doesn't
 * insist on showing every tile.
 */
export function GoalTile({ snapshot }: { snapshot: GoalSnapshot }) {
  // Mirror GoalMeter's own gate so the col-span placeholder doesn't
  // render an empty slot.
  if (!snapshot.showOnDashboard) return null;
  return (
    <div className="col-span-2 sm:col-span-2 lg:col-span-3">
      <GoalMeter snapshot={snapshot} />
    </div>
  );
}
