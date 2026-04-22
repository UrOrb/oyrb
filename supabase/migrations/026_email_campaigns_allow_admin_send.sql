-- Drop NOT NULL on email_campaigns.business_id so admin-wide announcements
-- (is_admin_send = true, no specific business) can be audited in the same
-- table as per-pro campaigns. Without this change, inserts from
-- src/app/dashboard/admin/announcements/actions.ts fail with a constraint
-- violation because admin sends have no business scope.
alter table public.email_campaigns
  alter column business_id drop not null;
