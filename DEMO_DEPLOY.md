# Demo deploy playbook — `demo.oyrb.space`

This is the complete, step-by-step guide for standing up the live demo at
`demo.oyrb.space`. Follow top-to-bottom; each step links the one before.

## Architecture

- **Same codebase** as production. The demo deployment is a separate
  Vercel project pointed at the same git repo. The only difference is
  `DEMO_MODE=true` in the environment, which flips the app into sandbox
  mode (auto-login, no Stripe, no email/SMS, no uploads).
- **Shared Supabase project.** A dedicated user (`demo@oyrb.space`) owns
  all demo data. RLS and `owner_id` scoping mean the demo session can
  never read another user's rows; production data is unreachable from the
  demo. If you want full database isolation later, create a second
  Supabase project and rotate the demo's `NEXT_PUBLIC_SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` to point at it.
- **Stripe / Resend / Twilio / Anthropic** are not called in demo mode at
  all (no test-mode keys, no zero-dollar invoices — fully short-circuited).

## One-time setup

1. **Pick the demo user's password + admin token.** Two random strings ≥ 32 chars:
   ```bash
   openssl rand -base64 48    # → DEMO_USER_PASSWORD
   openssl rand -base64 48    # → DEMO_ADMIN_TOKEN
   ```
   Keep these safe — the password gates the auto-login, the token gates
   the manual reset endpoint.

2. **Create a new Vercel project** pointed at the same git repo:
   - Vercel → **Add New → Project** → Import `halaniardixon-5375s-projects/oyrb`.
   - Name it `oyrb-demo`.
   - Don't deploy yet — set env vars first.

3. **Set the demo project's env vars** (Vercel → Settings → Environment Variables → Production):

   | Key | Value |
   |---|---|
   | `DEMO_MODE` | `true` |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` |
   | `DEMO_USER_EMAIL` | `demo@oyrb.space` |
   | `DEMO_USER_PASSWORD` | *(output from step 1)* |
   | `DEMO_ADMIN_TOKEN` | *(output from step 1)* |
   | `NEXT_PUBLIC_APP_URL` | `https://demo.oyrb.space` |
   | `NEXT_PUBLIC_SUPABASE_URL` | same as production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as production |
   | `SUPABASE_SERVICE_ROLE_KEY` | same as production |
   | `CRON_SECRET` | new random ≥ 32 chars (separate from prod) |
   | `CLIENT_AUTH_SECRET` | any value ≥ 32 chars (unused by demo but required to boot) |

   Do **not** set any of the Stripe, Resend, Twilio, or Anthropic keys on
   the demo project. They're never read in demo mode.

4. **Deploy.** Vercel → **Deploy** → wait for the build to go green.

5. **Add the custom domain.** Follow `DNS_SETUP.md`. CNAME `demo` →
   `cname.vercel-dns.com` at GoDaddy, then add `demo.oyrb.space` to the
   demo project under Settings → Domains.

6. **Run the seed script from your laptop:**
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="https://hytwjzhgxybxobihqshd.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="..."
   export DEMO_USER_EMAIL="demo@oyrb.space"
   export DEMO_USER_PASSWORD="..."         # same value you set in Vercel
   export DEMO_ADMIN_TOKEN="..."           # same value you set in Vercel
   export DEMO_BASE_URL="https://demo.oyrb.space"
   node scripts/demo-setup.js
   ```
   Expected output: `✓ demo user created` → `✓ seed complete`. The script
   is idempotent — safe to re-run.

## Verify end-to-end

1. Open `https://demo.oyrb.space` in a private/incognito window.
2. You should land on `/dashboard/site` as Jasmine Carter — no signup,
   no login prompt.
3. The black **Live Demo** banner is visible at the top of every page.
4. First visit shows the welcome modal. Dismiss it; refresh; modal
   should stay dismissed for 7 days (cookie-gated).
5. Click **Add new site** → checkout simulates success with a
   `?demo=1` flag; a toast appears saying "Demo mode — no real charge
   made." No Stripe dashboard entry is created.
6. In a services / bookings view, try to create a booking. Server
   accepts it; no email/SMS is sent (grep Vercel logs for
   `[demo-mode] sendSms stub` to confirm).
7. Try to upload a file in the gallery picker → blocked with a tooltip.
8. Visit `https://demo.oyrb.space?src=ig` in a fresh incognito window.
   The welcome modal shows a "👋 Welcome from Instagram!" chip.

## Manual reset

When you want to restore the pristine state immediately (e.g., a visitor
broke something mid-day, or right before you record a video):

```bash
curl -XPOST -H "Authorization: Bearer $DEMO_ADMIN_TOKEN" \
     https://demo.oyrb.space/api/admin/demo/reset
```

Response includes the user_id, list of wiped tables, and duration. You can
run this as often as you like.

## Automatic nightly reset

Scheduled in `vercel.json` at `0 8 * * *` UTC (= 4 AM Eastern). Vercel's
Hobby plan caps cron frequency at daily — this fits. If you want a
different time, edit the cron expression and redeploy.

Verify it's wired: Vercel → Project → **Deployments → Functions → Crons**
should list `/api/cron/demo-reset`.

## Rollback

If the demo deployment breaks:

1. Vercel → demo project → **Deployments** → pick the last green
   deployment → **Promote to Production**.
2. If the data got corrupted, run the manual reset (above).

Production is a separate Vercel project and a separate URL — nothing in
this deploy flow can affect it.

## What's enforced in demo mode

| Surface | Behavior |
|---|---|
| `/login`, `/signup`, any `/dashboard/*` path | Auto-login as the demo user via `/api/demo/auto-login` |
| `/api/checkout` | Returns `{ url: /dashboard?checkout=success&demo=1 }`. No Stripe call |
| `/api/dashboard/add-site` | Inserts the site row directly. No Stripe call |
| `/api/dashboard/change-plan` | Updates the local subscription row. No Stripe call |
| `/api/dashboard/end-trial-now` | Flips status to `active`. No Stripe call |
| `lib/email.ts` → `resend` | Forced to `null` — no emails sent |
| `lib/sms.ts` → `sendSms` | Logs and returns `{ ok: false, reason: "demo_mode" }` |
| `/api/public/bookings/upload-photo` | Returns 403 with friendly copy |

Anything else behaves exactly like production — template rendering,
booking flow UI, chat widget, reviews, FAQ, etc.
