import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEFAULT_REBOOK_DAYS, CATEGORY_LABELS, type ServiceCategory } from "@/lib/rebook-intervals";
import { RebookForm } from "./form";

export default async function RebookSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: overrides } = await supabase
    .from("pro_rebook_intervals")
    .select("service_category, interval_days")
    .eq("pro_user_id", user.id);

  const overrideMap = new Map<string, number>();
  for (const r of overrides ?? []) {
    overrideMap.set(r.service_category as string, r.interval_days as number);
  }

  const rows = (Object.keys(DEFAULT_REBOOK_DAYS) as ServiceCategory[]).map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    defaultDays: DEFAULT_REBOOK_DAYS[cat],
    currentDays: overrideMap.get(cat) ?? DEFAULT_REBOOK_DAYS[cat],
    overridden: overrideMap.has(cat),
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">Rebook reminders</h1>
      <p className="mt-2 text-sm text-[#737373]">
        How many days after a visit should a rebook reminder email go out? Change defaults per
        service category — clients can opt out anytime.
      </p>

      <RebookForm rows={rows} />
    </div>
  );
}
