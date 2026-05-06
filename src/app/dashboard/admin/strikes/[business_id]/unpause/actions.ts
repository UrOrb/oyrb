"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { unpauseFromStrike } from "@/lib/strikes";

type ActionResult = { success: true } | { error: string };

/**
 * Admin unpauses a strike-paused business. Clears `strike_paused_at`
 * and re-publishes the storefront. Past dispute records remain in
 * `dispute_inquiries` for audit; strikes within the rolling window
 * still display in the pro's standing until they age out naturally.
 *
 * Idempotent — the underlying update is filtered by
 * `strike_paused_at IS NOT NULL`, so re-running on an already-cleared
 * row is a no-op.
 *
 * Note: there is no automatic recovery cron. The pause stays until an
 * admin runs this action. That's intentional, per Section 29 — we
 * want manual review in the loop.
 */
export async function adminUnpauseStrike(businessId: string): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const result = await unpauseFromStrike(businessId);
  if ("error" in result) return result;

  revalidatePath(`/dashboard/admin/strikes/${businessId}`);
  revalidatePath(`/dashboard/admin/strikes`);
  return { success: true };
}
