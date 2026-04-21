-- ═════════════════════════════════════════════════════════════════════════
-- 017 — Remove overly permissive INSERT policy on directory_reports
--
-- Background: 014 created `with check (true)` so any anon/authenticated
-- user could insert reports directly from the browser. In practice, the
-- app never does that — reportListing() in src/app/dashboard/directory/
-- actions.ts uses the service-role admin client and bypasses RLS. The
-- policy only widens the attack surface (spam inserts, crafted reason
-- payloads) without buying any functionality.
--
-- Dropping the policy keeps RLS enabled on the table, which means no
-- anon or authenticated role can write directly anymore. Service role
-- continues to bypass RLS, so reportListing() is unaffected.
-- ═════════════════════════════════════════════════════════════════════════

drop policy if exists "anyone reports" on public.directory_reports;

-- Sanity: confirm RLS remains enabled. No-op if already on.
alter table public.directory_reports enable row level security;
