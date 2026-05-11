-- 054 - Data exports audit log (Phase 8 PR 1 of 3 — foundation)
--
-- Pros need a way to pull their own data off OYRB on demand: client list
-- (this PR), booking history (PR 2), income/revenue (PR 3). The Remove
-- Brand flow that follows will also want to verify "did the pro export
-- their data before deletion?" — that check needs a queryable record,
-- not a log file.
--
-- This migration adds the single audit table shared by all three export
-- types. The contacts CSV route (PR 1) writes the first row shape;
-- bookings and income land in the same table with different export_type
-- values. Reusing the table keeps the Remove Brand check uniform:
--
--   select 1 from data_exports
--     where business_id = $1 and export_type = 'contacts'
--
-- regardless of which export the pro pulled.
--
-- export_type is intentionally free-text (with the canonical set in
-- src/lib/exports/types.ts), mirroring notification_log.purpose from
-- migration 035. A new export variant ships without a migration.
--
-- ON DELETE behavior:
--   business_id ON DELETE CASCADE — when a business is deleted, its
--     export history goes with it. Matches client_imports (mig 049).
--   initiated_by_user_id ON DELETE RESTRICT — blocks accidental
--     auth.users deletion when an export references that user. Audit
--     evidence must persist. Mirrors client_imports.initiated_by_user_id.
--
-- RLS: pros read their own rows joined through businesses.owner_id.
-- Writes are service-role only — the API route at
-- /api/dashboard/exports/contacts uses createAdminClient before
-- inserting, so no public INSERT policy is needed by design (matches
-- notification_log mig 035 + user_consents mig 027).
--
-- Idempotent additive migration; manual post-merge run via Supabase SQL
-- Editor required.

create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  initiated_by_user_id uuid not null references auth.users(id) on delete restrict,
  -- Free-text on purpose: canonical values live in
  -- src/lib/exports/types.ts (EXPORT_TYPES). Adding a new export
  -- variant should not require a migration.
  export_type text not null,
  row_count int not null default 0,
  -- Total byte size of the served CSV including the UTF-8 BOM. Null
  -- only if the build somehow returns before the size is known (e.g.
  -- audit-row-first ordering changes later) — current code path
  -- always populates it.
  byte_size int,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Dashboard / Remove-Brand lookup path: "did this business export
-- contacts before deletion?" — index covers (business_id, export_type).
create index if not exists idx_data_exports_business_type
  on public.data_exports (business_id, export_type);

-- Most-recent-first listing for the future "Recent exports" UI.
create index if not exists idx_data_exports_business_created
  on public.data_exports (business_id, created_at desc);

alter table public.data_exports enable row level security;

drop policy if exists "pros read own exports" on public.data_exports;
create policy "pros read own exports"
  on public.data_exports for select using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
