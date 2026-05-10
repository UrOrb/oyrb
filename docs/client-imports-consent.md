# Client Imports — Consent Affirmation

> **Lawyer review pending.** The affirmation copy below is best-effort plain English written by the OYRB team for v1 of the bulk-import flow. It has not been reviewed by counsel. Reviewers should align this language with TOS sections 27–30 and the SMS Policy at `/sms-policy`.

## What this document is

A reference for the consent affirmation step shown to pros before they commit a CSV import to their client database. Captures:

- The exact copy currently in force
- When the affirmation was introduced
- What constitutes valid consent under the relevant US frameworks (TCPA, CAN-SPAM)
- How OYRB enforces consent in product
- Where the audit trail lives

## Introduced

Phase 7 PR 5 of 5, May 2026. Migration `053_client_imports_consent_affirmation.sql` added the audit columns. Source of truth for the copy: `src/lib/client-imports/consent-affirmation.ts`.

## Affirmation language (version 1)

Title shown above the modal:

> Before we add these clients to your database

Lead-in:

> By importing these {N} clients, you confirm:

Three pre-tense affirmations:

1. You collected this contact information directly from these clients in connection with your beauty business.
2. You have a legitimate business relationship with each of these clients.
3. These clients have not asked to receive promotional messages from OYRB.

Lead-in:

> You agree to:

One forward-looking commitment:

1. Not use this list for unsolicited marketing. To send these clients marketing emails or SMS, you must first collect fresh opt-in consent through OYRB's booking widget, the per-client edit page, or the magic-link booking flow.

Closing reassurance:

> OYRB will store these contacts in your private client database. They will not receive any messages from OYRB until you explicitly enable marketing or SMS consent for each individual client.

Two checkboxes — both required to enable the Confirm button:

1. I confirm I collected this information legitimately from these clients.
2. I understand these clients will not receive marketing or SMS messages until I obtain fresh consent.

The version constant is `CONSENT_AFFIRMATION_VERSION = 1` and is written into `client_imports.consent_affirmation_version` on every commit. When the copy changes, bump the constant. Past imports retain their version-stamped audit record.

## What constitutes valid consent

OYRB sends two kinds of messages to clients on a pro's behalf: transactional (booking confirmations, reminders) and promotional (marketing campaigns, rebook reminders). Different US frameworks govern each.

### TCPA (Telephone Consumer Protection Act) — applies to SMS

- Statutory damages: $500–$1,500 per illegal text.
- Consent must be specific to the phone number and to the type of message (marketing vs. transactional).
- Reasonable references: [FCC TCPA overview](https://www.fcc.gov/general/telemarketing-and-robocalls), [Consumer Financial Protection Bureau guidance](https://www.consumerfinance.gov/).
- OYRB's compliance posture is documented at `/sms-policy` and the consent evidence reference at `/sms-policy/consent-evidence`.

A pro who imports a client list does not have TCPA SMS consent for those numbers via OYRB. The pro may have collected SMS consent off-platform (intake form, in-person agreement); the affirmation does not capture that. Imported clients land with `sms_consent = false` and stay there until the client opts in through one of OYRB's surfaced consent flows.

### CAN-SPAM — applies to marketing email

- No statutory damages but FTC enforcement (civil penalties up to $51,744 per email as of 2024).
- Requires: accurate from/subject lines, physical postal address, unsubscribe link, honoring opt-outs within 10 business days.
- Reasonable references: [FTC CAN-SPAM Act guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business).

OYRB enforces CAN-SPAM compliance for all marketing emails by adding the unsubscribe link, physical postal address, and List-Unsubscribe headers to every send (`src/app/dashboard/marketing/actions.ts`). Imported clients land with `marketing_opt_in = false` and are excluded from every marketing campaign audience until the pro obtains opt-in.

## How OYRB enforces consent

The affirmation gates the import. Enforcement happens at the messaging layer:

| Surface | Enforcement |
|---|---|
| Marketing campaigns (`src/app/dashboard/marketing/actions.ts`) | `filterEligible` requires `clients.marketing_opt_in = true` AND `communication_preferences.marketing_enabled !== false` for every candidate. Imported clients suppressed until consent is granted via a separate flow. |
| 24h appointment reminders (`src/app/api/cron/reminders/route.ts`) | Joined off `bookings`; imported clients with no bookings are physically not selected. SMS path further gated on `clients.sms_consent`. |
| Rebook reminders (cron + manual) | Joined off `bookings`; imported clients with no bookings cannot trigger. |
| Booking confirmations (`src/lib/booking-notify.ts`) | Triggered only by booking insert. |
| Loyalty rewards | Driven by booking completion in `src/app/api/public/bookings/confirm/route.ts`. |
| Twilio inbound STOP/HELP | Defensively idempotent; setting `sms_consent = false` on a row that's already `false` is a no-op. |

The Phase 7 PR 5 audit verified zero leaks across these paths. The affirmation is a legal/UX guard, not a leak fix.

## Audit trail

Every committed import after Phase 7 PR 5 carries:

- `consent_affirmed_at` — server-side timestamp of the affirmation moment
- `consent_affirmed_by_user_id` — UUID of the user who clicked through (separate from `initiated_by_user_id` for multi-user pro accounts; today they always match)
- `consent_affirmation_ip` — IP address from `x-forwarded-for` (Vercel) at affirmation time
- `consent_affirmation_user_agent` — User-Agent header (truncated to 500 chars) at affirmation time
- `consent_affirmation_version` — integer version of the copy the pro saw

The audit row is written into the same atomic UPDATE that flips status `pending_review → committed`, so a successful claim always carries a complete affirmation record. There's no observable state where `status = 'committed'` but the affirmation columns are null for any post-mig-053 import.

Pros can see their own audit record on the import detail page (`/dashboard/clients/imports/[id]`). The committed-state banner shows who affirmed, when, from where, and against which copy version.

## What the affirmation does NOT do

- It does not grant marketing or SMS consent — those still default to `false` per row.
- It does not bulk-mark clients as opted in. There is intentionally no "mark all imported clients as opted-in" toggle. That would be a real legal hole.
- It does not retroactively cover imports committed before this PR. Their audit columns stay null. We are not back-filling.
- It does not provide TCPA-quality consent records for SMS. SMS consent on OYRB requires the per-client opt-in flow with IP + user-agent + source captured at the consent moment.

## Pending work

- **Lawyer review** of the affirmation copy. Until reviewed, treat the language as best-effort.
- **Localization**. English only for v1.
- **Per-client opt-in helpers**. The affirmation tells the pro to "collect fresh consent through OYRB's booking widget, the per-client edit page, or the magic-link booking flow." All three exist; none is a one-click bulk action, by design.
