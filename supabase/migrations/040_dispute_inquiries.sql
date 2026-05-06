-- 040 - Dispute Inquiries (Phase 2.1)
--
-- Reputation-system foundation. Section 28 of TOS v1.3 (PR #18) commits
-- OYRB to a 48-hour counter-evidence window and admin-reviewed
-- resolution; this migration is the data infrastructure that enacts
-- it. Strike consequences (auto-pause storefront on N strikes) are
-- deliberately out of scope here — that ships in PR 2.2.
--
-- Section 28 from TOS v1.3:
--   "OYRB does not process refunds. Filing a Dispute Inquiry affects
--    the professional's rating only... Both parties have forty-eight
--    (48) hours to submit evidence after a Dispute Inquiry is filed."
--
-- Schema notes:
--   - business_id is denormalized from booking_id → bookings.business_id.
--     Kept here so RLS policies don't need a JOIN, "all disputes
--     against pro X" queries are a single-table read, and bookings.
--     business_id is immutable so there's no sync-drift risk.
--   - reporter_email is denormalized from clients.email (or auth user
--     email for pro-filed disputes) for audit-trail integrity. If the
--     client changes their email later, the dispute record still
--     reflects what was on file at filing time.
--   - unique(booking_id, reporter_type) prevents two filings from the
--     same side per booking. A booking CAN have one client-filed AND
--     one pro-filed (e.g., pro reports client no-show after the
--     client files first).

create table if not exists public.dispute_inquiries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reporter_type text not null check (reporter_type in ('client','pro')),
  reporter_email text not null,
  reason_code text not null check (reason_code in (
    'no_show_pro','no_show_client','service_not_provided',
    'late_arrival_pro','late_arrival_client','quality_issue',
    'communication_issue','fake_business','other'
  )),
  reason_detail text check (char_length(reason_detail) <= 1000),
  -- Storage paths (relative to dispute-evidence bucket), not full URLs.
  -- Resolved to signed URLs at render time so leaked DB exports don't
  -- carry usable file links.
  evidence_urls jsonb not null default '[]',
  counter_evidence_urls jsonb not null default '[]',
  status text not null default 'awaiting_counter'
    check (status in (
      'awaiting_counter',  -- just filed, respondent has 48h to upload counter-evidence
      'under_review',       -- 48h elapsed OR respondent submitted counter-evidence; admin must resolve
      'resolved_strike',    -- admin found insufficient counter-evidence; strike weight applied
      'resolved_dismissed', -- admin found dispute not credible OR counter-evidence sufficient
      'expired'             -- ADMIN-ONLY manual transition after 30 days in under_review without resolution.
                            -- The cron sweeper does NOT write 'expired' — it only handles awaiting_counter→under_review.
    )),
  -- Strike weight per spec:
  --   no_show_pro / service_not_provided / fake_business → 3
  --   late_arrival_pro / quality_issue / communication_issue → 2
  --   no_show_client / late_arrival_client / other → 1
  weight int not null default 1 check (weight between 1 and 3),
  filed_at timestamptz not null default now(),
  counter_deadline timestamptz not null default (now() + interval '48 hours'),
  resolved_at timestamptz,
  admin_notes text,
  -- Anti-revenge marker: set true at filing time when the cross-check
  -- finds a recent reciprocal dispute (within ANTI_REVENGE_WINDOW_DAYS).
  -- The admin queue surfaces flagged rows at the top with a visual hint.
  -- We never block the filing; flag is informational.
  priority_review_flag boolean not null default false,
  unique (booking_id, reporter_type)
);

create index if not exists idx_dispute_business
  on public.dispute_inquiries (business_id);
create index if not exists idx_dispute_status
  on public.dispute_inquiries (status);
-- Cron lookup path — the deadline-sweeper cron scans for expired
-- counter windows hourly. Partial index keeps the scan tight.
create index if not exists idx_dispute_deadline
  on public.dispute_inquiries (counter_deadline)
  where status = 'awaiting_counter';
-- Booking-side joins: the per-booking detail page lists every dispute
-- (both reporter sides) for a single booking_id.
create index if not exists idx_dispute_booking
  on public.dispute_inquiries (booking_id);

alter table public.dispute_inquiries enable row level security;

-- Pros see disputes against (or filed by) their business. SELECT-only
-- via RLS — admin client (service-role) handles writes from the
-- token-gated client filing route and the pro response routes.
create policy "pros see own business disputes"
  on public.dispute_inquiries for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Pros can update counter_evidence_urls on their own disputes via the
-- pro-response server action. The action uses the admin client so this
-- policy is defense-in-depth, not load-bearing.
create policy "pros update counter-evidence on own disputes"
  on public.dispute_inquiries for update using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- ── Storage bucket: dispute-evidence ─────────────────────────────────
-- Private bucket. RLS allows uploaders to read their own files (path-
-- prefixed by dispute id + reporter side) and service-role bypass for
-- admin reads. No public CDN — all reads go through signed URLs minted
-- per request.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dispute-evidence',
  'dispute-evidence',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Path scheme: {disputeId}/{reporterType}/{filename}
-- The {disputeId} prefix lets RLS scope per-dispute reads without
-- exposing other disputes' files.

-- Authenticated users SELECT their own files (pro counter-evidence).
-- Client uploads (token-gated, no auth user) read evidence via signed
-- URLs minted by the server — the SELECT policy doesn't need to cover
-- those because they go through service-role.
drop policy if exists "dispute-evidence: authenticated read own"
  on storage.objects;
create policy "dispute-evidence: authenticated read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] in (
      select id::text from public.dispute_inquiries
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

-- Authenticated INSERT (pros uploading counter-evidence). Anonymous
-- uploads (clients filing) go through service-role-minted signed URLs
-- which bypass RLS.
drop policy if exists "dispute-evidence: authenticated insert"
  on storage.objects;
create policy "dispute-evidence: authenticated insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] in (
      select id::text from public.dispute_inquiries
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );
