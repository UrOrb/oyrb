import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { TrialBansAdmin } from "./trial-bans-admin";

export const metadata = { title: "Trial bans" };
export const dynamic = "force-dynamic";

export default async function TrialBansAdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.status === 401) redirect("/login");
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-sm text-[#737373]">{gate.error}</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: bans }, { data: lastRuns }] = await Promise.all([
    admin
      .from("trial_ban_list")
      .select("id, email, phone, reason, trigger_reason, triggering_attempt_ids, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("trial_ban_runs")
      .select("ran_at, attempts_scanned, bans_created, duration_ms, error")
      .order("ran_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">Trial bans</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Free-trial ban list. Auto-detector runs every 15 minutes;
        you can add / remove entries below.
      </p>

      <TrialBansAdmin
        initialBans={(bans ?? []) as never[]}
      />

      <div className="mt-10">
        <h2 className="text-base font-semibold">Detector runs (last 10)</h2>
        <div className="mt-3 overflow-hidden rounded-md border border-[#E7E5E4]">
          <table className="w-full text-xs">
            <thead className="bg-[#FAFAF9] text-left text-[10px] uppercase tracking-wider text-[#A3A3A3]">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Scanned</th>
                <th className="px-3 py-2">Bans created</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {(lastRuns ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-[#A3A3A3]">
                    No runs yet — wait for the first cron tick (max 15 min after deploy).
                  </td>
                </tr>
              ) : (
                (lastRuns ?? []).map((r: { ran_at: string; attempts_scanned?: number; bans_created?: number; duration_ms?: number; error?: string | null }, i: number) => (
                  <tr key={i} className="border-t border-[#F0EFEC]">
                    <td className="px-3 py-2">{new Date(r.ran_at as string).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.attempts_scanned ?? 0}</td>
                    <td className="px-3 py-2">{r.bans_created ?? 0}</td>
                    <td className="px-3 py-2">{r.duration_ms ?? 0}ms</td>
                    <td className="px-3 py-2 text-red-600">{r.error ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
