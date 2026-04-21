"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULT_REBOOK_DAYS, type ServiceCategory } from "@/lib/rebook-intervals";

type UpdateInput = {
  overrides: Array<{ category: ServiceCategory; interval_days: number | null }>;
};

export async function updateRebookIntervals(input: UpdateInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const validCategories = new Set(Object.keys(DEFAULT_REBOOK_DAYS));

  for (const row of input.overrides) {
    if (!validCategories.has(row.category)) {
      return { ok: false, error: `Unknown category: ${row.category}` };
    }

    if (row.interval_days === null) {
      // Revert to default = delete the override row
      await supabase
        .from("pro_rebook_intervals")
        .delete()
        .eq("pro_user_id", user.id)
        .eq("service_category", row.category);
      continue;
    }

    const n = Math.floor(row.interval_days);
    if (!Number.isFinite(n) || n < 3 || n > 365) {
      return { ok: false, error: `Interval for ${row.category} must be 3–365 days` };
    }

    await supabase
      .from("pro_rebook_intervals")
      .upsert(
        {
          pro_user_id: user.id,
          service_category: row.category,
          interval_days: n,
        },
        { onConflict: "pro_user_id,service_category" }
      );
  }

  revalidatePath("/dashboard/settings/rebook");
  revalidatePath("/dashboard/clients");
  return { ok: true };
}
