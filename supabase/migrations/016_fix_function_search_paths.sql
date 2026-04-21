-- ═════════════════════════════════════════════════════════════════════════
-- 016 — Pin search_path on trigger functions
--
-- Supabase's linter flags functions without an explicit search_path as
-- mutable: a malicious schema in the caller's search_path could shadow
-- unqualified references inside the function body (CVE-class issue). Our
-- touch_* functions only set NEW.updated_at = now(), which does no schema
-- lookups, so pinning search_path to empty is the safest and least
-- invasive fix.
-- ═════════════════════════════════════════════════════════════════════════

alter function public.touch_directory_updated_at() set search_path = '';
alter function public.touch_commpref_updated_at() set search_path = '';
