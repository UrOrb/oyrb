-- 053 - Client imports consent affirmation audit columns (Phase 7 PR 5 of 5)
--
-- The existing `consent_affirmed` boolean on client_imports (added in
-- migration 049) was a placeholder for "did the pro click the
-- affirmation checkbox?" PR 5 hardens that into a defensible audit
-- trail with five new columns capturing WHO affirmed, WHEN, FROM
-- WHERE, with WHAT user agent, and against WHICH version of the
-- affirmation copy. The boolean stays — it's the cheap "yes/no" the
-- commit route still uses as a gate.
--
-- Why a separate `consent_affirmed_by_user_id` instead of reusing the
-- existing `initiated_by_user_id`:
--   In v1's single-pro-per-business reality these will always match.
--   But once multi-user pro accounts ship (Phase 9+), the person who
--   started the import upload may not be the person who reviewed the
--   preview and clicked through the affirmation. Capturing them
--   separately now prevents conflation costs later. The legal record
--   should attest to who clicked through the consent moment, not who
--   started the file upload.
--   ON DELETE RESTRICT mirrors initiated_by_user_id (mig 049): if the
--   user is removed from the system, we refuse the delete rather than
--   silently null out the affirmation record. Compliance evidence
--   must persist.
--
-- consent_affirmation_version is an int (not a text version string)
-- because the version constant lives in
-- src/lib/client-imports/consent-affirmation.ts and is incremented
-- monotonically when the copy changes. Keeping it numeric here means
-- a simple integer comparison can find "all imports affirmed against
-- v1 copy" without parsing.
--
-- Idempotent additive migration; same shape as 051/052. Manual
-- post-merge run via Supabase SQL Editor required.

alter table public.client_imports
  add column if not exists consent_affirmed_at         timestamptz,
  add column if not exists consent_affirmed_by_user_id uuid
    references auth.users(id) on delete restrict,
  add column if not exists consent_affirmation_ip         inet,
  add column if not exists consent_affirmation_user_agent text,
  add column if not exists consent_affirmation_version    int;

-- Index for compliance queries: "show me every import affirmed
-- against the current copy version" or "audit imports by a specific
-- user." Cheap because the column cardinality is low (one version
-- bump per legal-copy revision, and a single business has a small
-- set of pro users).
create index if not exists idx_client_imports_consent_version
  on public.client_imports (consent_affirmation_version)
  where consent_affirmation_version is not null;

create index if not exists idx_client_imports_consent_by
  on public.client_imports (consent_affirmed_by_user_id)
  where consent_affirmed_by_user_id is not null;
