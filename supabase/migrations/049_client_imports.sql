-- 049 - Client imports (Phase 7 PR 1 of 5 — foundation)
--
-- Pros migrating to OYRB from competitor platforms (Acuity, GlossGenius,
-- Booksy, StyleSeat) need a way to import their existing client lists
-- without re-entering each contact by hand. This migration is the
-- data infrastructure that enacts that flow; the upload/parse/commit
-- routes ship in PR 2/3, the field-mapping UI in PR 4, and the
-- consent-affirmation UX in PR 5.
--
-- Per the Phase 7 discovery report (§3.2):
--
-- Status state machine:
--   pending_upload → pending_parse → pending_review →
--     committed | cancelled | rolled_back | failed
--
--   pending_upload  → row created, signed URL minted, file not yet uploaded
--   pending_parse   → file in storage, parse job pending
--   pending_review  → parsed successfully, awaiting pro's commit/cancel
--   committed       → rows inserted into public.clients, source file deletable
--   cancelled       → pro abandoned at preview; source file scheduled for TTL cleanup
--   rolled_back     → pro reverted a committed import; clients with imported_via_id deleted
--                     (un-booked rows) or preserved (rows already attached to bookings)
--   failed          → parse error or commit error; preview_data may be partial
--
-- Why preview_data is jsonb (and not a separate preview-rows table):
--   ~25 KB per pending import (50 sample rows × ~500 bytes), server-side so
--   tab-close survives, GC'd via TTL when import transitions out of
--   pending_review. A separate table would be over-engineered for the
--   bounded sample size and would require its own RLS plumbing.
--
-- Why imported_via_id uses ON DELETE SET NULL on clients:
--   If a pro deletes the audit row later, the imported clients survive
--   (just lose their lineage marker). Mirrors the existing pattern on
--   bookings.client_id (also SET NULL) — preserves user-facing data
--   when audit metadata gets pruned.

create table if not exists public.client_imports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  -- ON DELETE RESTRICT: blocks accidental auth.users deletion when an
  -- import row references that user. Account-deletion is a manual ops
  -- process today; restricting here keeps audit history intact.
  initiated_by_user_id uuid not null references auth.users(id) on delete restrict,

  -- Source-file metadata. `source_path` is null until the upload-token
  -- route mints a signed URL and the browser uploads (PR 2). Path
  -- scheme: {business_id}/{import_id}/{ts}-{filename} — mirrors
  -- dispute-evidence's path convention so RLS scoping works the same way.
  source_filename text not null,
  source_path text,
  source_mime text,
  source_size_bytes int,

  -- Auto-detected vendor (acuity / glossgenius / booksy / stylesheat /
  -- unknown). Free-text in DB; canonical values live in TS so adding a
  -- new vendor preset doesn't require a migration. Mirrors the
  -- notification_log.purpose convention from migration 035.
  vendor_hint text,

  status text not null default 'pending_upload' check (status in (
    'pending_upload',
    'pending_parse',
    'pending_review',
    'committed',
    'cancelled',
    'rolled_back',
    'failed'
  )),

  -- Set at parse time (PR 2). Maps source CSV header -> OYRB field
  -- (name|email|phone|notes|ignore). Pro can override before commit.
  column_mapping jsonb,

  -- Row-count summary set at parse time (PR 2). Null until parse runs.
  total_rows int,
  valid_rows int,
  duplicate_rows int,
  error_rows int,

  -- Up to 50 sample rows for the review UI. Each entry:
  --   { row_index, status: 'valid'|'duplicate'|'error',
  --     name, email, phone, notes, errors? }
  -- Truncated sample, not the full import — full data lives in the
  -- source file until commit, then in public.clients.
  preview_data jsonb,

  -- Per-row errors surfaced to the pro at preview time. Each entry:
  --   { row_index, field, message }
  errors jsonb,

  -- Pro affirms "I have permission to import these contacts" at upload
  -- time (PR 5). Captured here as part of the import audit trail.
  -- Imported clients land with marketing_opt_in=false regardless;
  -- this column attests to the source-of-collection consent only.
  consent_affirmed boolean not null default false,

  created_at timestamptz not null default now(),
  parsed_at timestamptz,
  committed_at timestamptz,
  rolled_back_at timestamptz,
  cancelled_at timestamptz
);

-- Dashboard list view filters by (business_id, status) — e.g., "show
-- me my pending imports" or "show me my committed imports."
create index if not exists idx_client_imports_business_status
  on public.client_imports (business_id, status);

-- Audit-log ordering — most recent imports first.
create index if not exists idx_client_imports_business_created
  on public.client_imports (business_id, created_at desc);

alter table public.client_imports enable row level security;

-- Mirrors the clients-table RLS policy from 001_initial_schema.sql:54.
-- Pros see and manage imports for businesses they own; everything else
-- goes through service-role from server-side routes that validate
-- ownership in TypeScript before bypassing RLS.
drop policy if exists "Business owners manage their imports"
  on public.client_imports;
create policy "Business owners manage their imports"
  on public.client_imports for all using (
    exists (
      select 1 from public.businesses b
      where b.id = client_imports.business_id and b.owner_id = auth.uid()
    )
  );

-- ── clients.imported_via_id ──────────────────────────────────────────
-- Lineage marker on clients rows imported via this system. Drives the
-- rollback query in PR 3:
--   delete from clients where imported_via_id = $importId
-- and the side-effect gate (don't fire welcome emails / capture
-- attribution / etc. when imported_via_id IS NOT NULL).
alter table public.clients
  add column if not exists imported_via_id uuid
    references public.client_imports(id) on delete set null;

-- Indexed so the rollback query is fast even on a pro with thousands of
-- clients across multiple imports.
create index if not exists idx_clients_imported_via
  on public.clients (imported_via_id)
  where imported_via_id is not null;

-- ── Storage bucket: client-imports ───────────────────────────────────
-- Private bucket. Mirrors dispute-evidence (migration 040) verbatim:
-- signed URL minting via admin client at upload time, RLS as defense-
-- in-depth in case the signed-URL logic ever has a bug. No public CDN.
--
-- File-size cap: 10 MB. A 5,000-row CSV with verbose columns sits at
-- ~1–2 MB — 10 MB leaves ample headroom. If pros routinely show up
-- with bigger files, raise the cap and consider chunked upload.
--
-- MIME allowlist: text/csv canonical, plus application/vnd.ms-excel
-- (Excel often labels CSV exports with this MIME) and text/plain
-- (some browsers fall back to text/plain for .csv files).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-imports',
  'client-imports',
  false,
  10485760,  -- 10 MB
  array['text/csv', 'application/vnd.ms-excel', 'text/plain']
)
on conflict (id) do nothing;

-- Path scheme: {business_id}/{import_id}/{ts}-{filename}
-- The {business_id} prefix lets RLS scope per-business reads via
-- a join against client_imports, mirroring how dispute-evidence's
-- {disputeId} prefix scopes per-dispute reads.

drop policy if exists "client-imports: authenticated read own"
  on storage.objects;
create policy "client-imports: authenticated read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-imports'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses
      where owner_id = auth.uid()
    )
  );

drop policy if exists "client-imports: authenticated insert"
  on storage.objects;
create policy "client-imports: authenticated insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-imports'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses
      where owner_id = auth.uid()
    )
  );
