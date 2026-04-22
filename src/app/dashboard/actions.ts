"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Ends the pro's Supabase session and bounces them to /login. Used by the
// dashboard avatar menu's "Sign out" form.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Stamps businesses.stats_migration_acknowledged_at so the one-time
// "we've updated how stats work" banner stops showing. Owner-scoped so
// one pro can't mark another pro's banner as read.
export async function acknowledgeStatsMigration(businessId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase
    .from("businesses")
    .update({ stats_migration_acknowledged_at: new Date().toISOString() })
    .eq("id", businessId)
    .eq("owner_id", user.id);
  return { ok: true };
}
