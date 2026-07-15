// Service-role client for Inngest background functions (no user session).
// SERVER ONLY — never import from client-reachable code (CLAUDE.md hard rule).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Single-user app: background jobs write rows for this user.
export function staxkUserId(): string {
  const id = process.env.STAXK_USER_ID;
  if (!id) throw new Error("STAXK_USER_ID is not set");
  return id;
}
