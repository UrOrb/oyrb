-- Fix: Bridge's intro asks need an address to send to — the network table
-- (your LinkedIn export + manual adds) now carries one, and contacts get a
-- natural key so agent re-runs upsert instead of duplicating people.

alter table network add column if not exists email text;

-- One row per person per company per user. Bridge and Sleuth upsert on this.
create unique index if not exists contacts_person_key
  on contacts (user_id, company_id, full_name);
