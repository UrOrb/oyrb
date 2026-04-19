import { createClient } from "@/lib/supabase/server";

/**
 * Admin gate. Driven by a comma-separated list of emails in the
 * `ADMIN_EMAILS` env var. Set in Vercel → Settings → Environment Variables.
 *
 * No new tables, no per-user flags — at OYRB scale a tiny env-var allowlist
 * is enough. Returns the user object on success so the caller can audit who
 * performed an action.
 */
export async function requireAdmin(): Promise<
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.includes(user.email.toLowerCase())) {
    return { ok: false, status: 403, error: "Admin access required" };
  }
  return { ok: true, user: { id: user.id, email: user.email } };
}
