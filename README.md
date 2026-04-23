# OYRB — Own Your Brand

A booking and website platform for beauty professionals. Built with Next.js 14+, Supabase, Stripe, and Tailwind CSS.

## What it is

OYRB lets beauty professionals (hair stylists, lash techs, nail techs, estheticians, braiders, MUAs) go from signup to a published, stylish booking site in under 10 minutes.

**Live:** https://oyrb.space

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Auth + DB:** Supabase (email/password + Google OAuth, Postgres, RLS)
- **Payments:** Stripe (subscriptions + Connect for Phase 3)
- **Email:** Resend
- **Hosting:** Vercel
- **Package manager:** pnpm

## Local development

```bash
pnpm install
cp .env.local.example .env.local  # fill in your keys
pnpm dev
```

Open http://localhost:3000.

For local Stripe webhooks:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Update `STRIPE_WEBHOOK_SECRET` in `.env.local` with the CLI-provided secret.

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key (server only) |
| `STRIPE_PRICE_STARTER` | Stripe Price ID — Starter ($24/mo) |
| `STRIPE_PRICE_STUDIO` | Stripe Price ID — Studio ($49/mo) |
| `STRIPE_PRICE_SCALE` | Stripe Price ID — Scale ($89/mo) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key |
| `NEXT_PUBLIC_APP_URL` | Public base URL |

## Database setup

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor. Creates: `profiles`, `businesses`, `services`, `clients`, `bookings` with RLS policies.

## Pricing tiers

| Plan | Price | Key features |
|---|---|---|
| Starter | $24/mo | 1 staff, 1 template, booking + payments |
| Studio | $49/mo | 3 staff, all templates, deposits, SMS |
| Scale | $89/mo | Unlimited staff, custom domain, direct founder support |

## What's done (Phase 1)

- Marketing site (/, /features, /pricing)
- Auth: email/password + Google OAuth via Supabase
- Stripe subscription checkout + webhook handler
- Dashboard shell with sidebar nav
- Route protection via Next.js proxy

## What's next

**Phase 2:** Three distinct booking site templates, template picker, site editor, public `/s/[slug]` routes.

**Phase 3:** Real-time booking calendar, Stripe Connect for beauty pros, deposit collection, Resend email confirmations.
