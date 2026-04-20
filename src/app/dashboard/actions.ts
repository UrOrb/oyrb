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
