import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const ACTIVE_SITE_COOKIE = "oyrb_active_site_id";

/**
 * Resolves which site the user is currently working on. Priority:
 *  1. Explicit `siteId` param (passed from a page's searchParams).
 *  2. `oyrb_active_site_id` cookie (set by the SiteSwitcher when the user
 *     picks a site from the dashboard or sidebar).
 *  3. The user's oldest business (preserves prior single-site behavior).
 *
 * Always re-validates ownership so a stale cookie or a hand-typed id
 * for someone else's site can't leak into a query.
 */
export async function getCurrentBusiness(siteIdParam?: string | null): Promise<Business | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const sites = (rows ?? []) as Business[];
  if (sites.length === 0) return null;

  const cookieJar = await cookies();
  const cookieId = cookieJar.get(ACTIVE_SITE_COOKIE)?.value;

  const candidates = [siteIdParam, cookieId];
  for (const id of candidates) {
    if (!id) continue;
    const match = sites.find((s) => s.id === id);
    if (match) return match;
  }
  return sites[0];
}

export async function listMySites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("businesses")
    .select("id, business_name, slug, is_published, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  return data ?? [];
}
