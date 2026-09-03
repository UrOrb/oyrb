import type { SupabaseClient } from "@supabase/supabase-js";
import type { TemplateUnlock } from "@/lib/template-access";

export async function loadTemplateUnlocks(
  supabase: SupabaseClient,
  userId: string,
  businessId: string,
): Promise<TemplateUnlock[]> {
  const { data, error } = await supabase
    .from("template_unlocks")
    .select("layout_id, theme_id")
    .eq("user_id", userId)
    .eq("business_id", businessId);

  if (error) {
    console.error("Failed to load template unlocks:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => typeof row.theme_id === "string")
    .map((row) => ({
      layout_id: typeof row.layout_id === "string" ? row.layout_id : null,
      theme_id: row.theme_id,
    }));
}
