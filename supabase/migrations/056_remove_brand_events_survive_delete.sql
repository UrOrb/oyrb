-- 056 - Let business_removal_events outlive the business itself
--      (Phase 8 PR 5 of 5)
--
-- Migration 055 created business_removal_events with
-- `business_id ... on delete cascade`. That was the right default
-- when the only consumers were initiated / restored events for a
-- live business — those rows don't need to outlive the business
-- they reference.
--
-- Phase 8 PR 5 adds the `finalized` event written when the daily
-- cron deletes a business whose grace period has elapsed. If the
-- FK stays CASCADE, the finalized row inserted seconds before
-- `delete from businesses` gets wiped along with everything else,
-- leaving zero on-platform record that the business ever existed.
-- Vercel logs preserve the action trace for ~24h; Supabase logs
-- a bit longer; neither is durable.
--
-- This migration swaps the FK to ON DELETE SET NULL so the
-- finalized row survives. Side effect: any initiated/restored
-- events for the same business also survive with business_id=NULL.
-- That's correct — they're the only on-platform record that the
-- business ever existed, useful for compliance and forensic
-- replay.
--
-- Idempotent ALTER (drop-and-add). Safe to re-run.
--
-- RLS impact: the existing "pros read own removal events" policy
-- joins through businesses.owner_id. After deletion, business_id
-- is NULL → the IN-subquery returns no match → no pro can read
-- finalized rows. That's correct: finalized rows are admin-only
-- (the business is gone, the pro can't log in anyway, and the
-- platform-wide audit surface for these events is admin-only).

alter table public.business_removal_events
  drop constraint business_removal_events_business_id_fkey,
  alter column business_id drop not null,
  add constraint business_removal_events_business_id_fkey
    foreign key (business_id) references public.businesses(id)
    on delete set null;
