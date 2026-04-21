# Demo removal — manual steps

All demo-related **code** has been removed from this branch. Before you push and
deploy, do the infrastructure and billing cleanup below. Nothing here was
touched automatically — you confirm each step manually.

Once the steps are done (or you've decided to skip any), run:

```bash
git add -A
git commit -m "Remove live demo site and all demo-mode code"
git push origin main
vercel --prod --yes
```

---

## 1. Vercel — remove the demo domain + project

1. Log in at [vercel.com](https://vercel.com) with the Anthropic team account.
2. **Remove the `demo.oyrb.space` alias from every project it touches.**
   - Click into each Vercel project (`oyrb`, `oyrb-demo`, and `linden` if any).
   - Go to **Settings → Domains**.
   - If `demo.oyrb.space` is listed: click the `⋯` → **Remove**.
   - Confirm `oyrb.space` and `www.oyrb.space` are still assigned to the main
     `oyrb` project and are showing **Valid Configuration**.
3. **Delete the dedicated `oyrb-demo` project entirely** (it was created
   during the earlier demo deploy and is now unused).
   - Go to **oyrb-demo → Settings → Advanced → Delete Project**.
   - Type the project name when Vercel asks to confirm.
   - Vercel will remove all deployments, env vars, crons, and domain
     assignments for that project automatically.
4. Sanity-check the remaining `oyrb` project:
   - **Deployments**: latest production deployment still points at
     `oyrb.space`/`www.oyrb.space`.
   - **Settings → Environment Variables**: skim for any `DEMO_*` variables on
     the Production env. Remove if present (you'll also want to delete them in
     Preview + Development).
   - **Settings → Crons**: confirm only the three real crons remain
     (`/api/cron/reminders`, `/api/cron/trial-reminders`, `/api/cron/trial-bans`).
     The old `/api/cron/demo-reset` schedule should be gone once the next
     deploy lands; if Vercel's UI still shows it before deploy, it will drop
     on its own after the new `vercel.json` ships.

## 2. GoDaddy — delete the `demo` CNAME

1. Log in at [godaddy.com](https://godaddy.com).
2. **My Products → Domains → oyrb.space → DNS**.
3. Find the record of **type `CNAME`**, **name `demo`**, value
   `7d348721ccc4a1a2.vercel-dns-017.com.` (or similar Vercel CNAME target).
4. Click the pencil / trash icon → **Delete**.
5. Confirm:
   - Apex `A` / `ALIAS` record for `oyrb.space` is untouched.
   - `www` CNAME is untouched.
   - No other records changed.
6. After a minute or two, `dig demo.oyrb.space` should return NXDOMAIN.

## 3. Stripe — nothing to do

The demo mode only short-circuited Stripe calls client-side; no separate Stripe
products, prices, webhooks, or Customer Portal configs were created for the
demo. **Do not touch Stripe.** Your live products, prices, and webhooks serve
the real site as-is.

If you set placeholder test-mode keys on the `oyrb-demo` Vercel project
(e.g. `sk_test_demo_placeholder_…`), they're deleted along with the project in
step 1.3 above — no Stripe dashboard action needed.

## 4. Database — no automatic cleanup

The demo used the **main Supabase project** (not a separate database). The
"Jasmine Carter" demo account lived as a regular row in `auth.users` plus
rows in `businesses`, `services`, `business_hours`, and `bookings`. Those
rows are still there; they are currently inert because the auto-login,
seed script, and reset cron are all gone.

You have two options:

- **Leave it in place.** Harmless — no one can reach it without the demo
  auto-login route, which no longer exists.
- **Delete it manually.** If you want the rows gone:
  1. Supabase → SQL editor.
  2. Find the user id:
     ```sql
     select id, email from auth.users where email = 'demo@oyrb.space';
     ```
  3. Wipe owned rows, then the user (cascades through the foreign keys):
     ```sql
     delete from bookings where business_id in (
       select id from businesses where owner_id = '<that-id>'
     );
     delete from business_hours where business_id in (
       select id from businesses where owner_id = '<that-id>'
     );
     delete from services where business_id in (
       select id from businesses where owner_id = '<that-id>'
     );
     delete from businesses where owner_id = '<that-id>';
     delete from account_subscriptions where user_id = '<that-id>';
     delete from auth.users where id = '<that-id>';
     ```
  4. **Do not** run these blindly in production without verifying the id
     first.

No `oyrb_demo` / separate database was ever provisioned — nothing to drop.

## 5. Post-removal verification

After push + deploy, verify:

- [ ] `curl -sI https://demo.oyrb.space` returns `Could not resolve host` or
      `NXDOMAIN` (or Vercel's "project not found" page) — confirms DNS +
      domain removal.
- [ ] `https://www.oyrb.space/` loads normally.
- [ ] `https://www.oyrb.space/templates` loads normally.
- [ ] `https://www.oyrb.space/dashboard` redirects to `/login` for
      unauthenticated visitors.
- [ ] No 404s or broken links on the main site. Skim `/`, `/pricing`,
      `/features`, `/about`, `/terms`, `/privacy`.
- [ ] Signup → checkout flow works end-to-end with real Stripe (no demo
      short-circuit).
- [ ] Search the source tree one more time:
      ```bash
      grep -rn "DEMO_MODE\|isDemoMode\|demo_account\|demo_reset\|DemoOverlay" src/
      ```
      Expected output: empty.

---

## What was removed from the codebase (for your reference)

Files deleted:

- `src/lib/demo.ts`
- `src/lib/demo-reset.ts`
- `src/components/demo/demo-overlay.tsx` (and the empty `demo/` dir)
- `src/app/api/demo/auto-login/route.ts`
- `src/app/api/demo/log-source/route.ts` (+ empty `demo/` parent dir)
- `src/app/api/admin/demo/reset/route.ts` (+ empty parent dirs)
- `src/app/api/cron/demo-reset/route.ts` (+ empty parent dir)
- `scripts/demo-setup.js`
- `DEMO_DEPLOY.md`
- `DNS_SETUP.md` (was demo-specific — the real site uses Vercel's
  auto-configured DNS)

Files edited (demo-only conditionals removed; all other logic intact):

- `src/app/layout.tsx` — dropped `<DemoOverlay />` render + import
- `src/proxy.ts` — removed the `DEMO_MODE` routing block
- `src/app/api/checkout/route.ts` — removed Stripe short-circuit
- `src/app/api/stripe/portal/route.ts` — removed demo-mode bounce
- `src/app/api/dashboard/change-plan/route.ts` — removed Stripe skip
- `src/app/api/dashboard/end-trial-now/route.ts` — removed trial fast-path
- `src/app/api/dashboard/add-site/route.ts` — removed free provisioning
- `src/app/api/public/bookings/upload-photo/route.ts` — removed upload block
- `src/lib/sms.ts` — removed demo SMS stub
- `src/lib/email.ts` — removed demo Resend null-out (Resend now just requires
  `RESEND_API_KEY` to be non-empty as before)
- `vercel.json` — removed `/api/cron/demo-reset` cron entry
- `.env.example` — removed `DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE`,
  `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_ADMIN_TOKEN`

Instagram `?src=ig` source tracking was demo-only (lived inside the demo
overlay + `/api/demo/log-source`) and was removed with the rest of the demo
UI. If you want traffic-source analytics on the real site later, that'd be a
separate, lightweight addition.
