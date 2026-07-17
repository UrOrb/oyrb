// Resume resolution for background agents. The app now supports MORE THAN ONE
// active resume (e.g. a Technical and a Creative one running side by side), so
// nothing here may assume a single active row — `.single()` would throw.
import type { SupabaseClient } from "@supabase/supabase-js";

// The resume a given job should be screened/tailored against: the one Scout
// bound it to (jobs.resume_id), or — for legacy jobs saved before that column
// existed, or if that resume was since removed — the most recent active resume.
export async function resolveJobResume(
  supabase: SupabaseClient,
  resumeId: string | null | undefined,
) {
  if (resumeId) {
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase
    .from("resumes")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}
