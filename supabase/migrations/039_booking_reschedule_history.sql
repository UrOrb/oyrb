-- 039 - bookings reschedule history (Phase 1 closer)
--
-- Records the most-recent prior start time and the timestamp of the
-- last reschedule. Populated by both reschedule paths going forward:
--   - /api/bookings/[id]/reschedule       (pro-side, this PR)
--   - /api/public/bookings/reschedule     (client-side, predates this
--                                          PR; the audit-column writes
--                                          land alongside this migration)
--
-- Why two columns and not a separate history table: for v1 the most-
-- recent prior time is the useful framing — the client email shows
-- "Original time: X, New time: Y" where X is the immediate-prior time,
-- not the original-original. Full chronological history of every
-- reschedule event lives implicitly in notification_log (purpose IN
-- 'booking_rescheduled' / 'booking_rescheduled_by_pro' /
-- 'owner_reschedule_alert'). If product later needs structured
-- per-event reschedule history (e.g., for Phase 2.1 dispute resolution
-- patterns), that's a follow-up table — not v1.

alter table public.bookings
  add column if not exists previous_start_at timestamptz,
  add column if not exists rescheduled_at    timestamptz;
