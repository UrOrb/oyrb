import { redirect } from "next/navigation";
import { GoalForm } from "../goal-form";
import { ensureGoalSettings } from "@/lib/goal-tracking";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goalSettings = await ensureGoalSettings(user.id);

  return (
    <section id="goal" className="scroll-mt-24 rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="text-base font-semibold">Goal Tracking</h2>
      <p className="mt-0.5 text-xs text-[#737373]">
        Set a monthly income target and choose what counts toward it. Progress is calculated
        across all the sites you own; resets at the start of each UTC month.
      </p>
      <div className="mt-5">
        <GoalForm initial={goalSettings} />
      </div>
    </section>
  );
}
