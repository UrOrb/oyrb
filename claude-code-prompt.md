# Claude Code Prompt — Paste This Into Claude Code

> **How to use:** Open your terminal, `cd` into an empty folder where you want the project to live, run `claude`, then paste everything inside the fenced block below as your first message. Before you paste, make sure you've completed the Prerequisites checklist at the bottom of this file.

---

```
# Project: GlamStack (working name — we can rename later) — Booking + Website Platform for Beauty Professionals

You are building a new SaaS product from scratch. Read this ENTIRE brief before writing any code or running any commands. If anything is genuinely ambiguous, ask me before proceeding — but do not ask about things I've already decided below.

## Product concept
A booking and website platform for beauty professionals (hair stylists, lash techs, nail techs, estheticians, braiders, brow artists, MUAs). Competitors: StyleSeat, Vagaro, GlossGenius, Fresha, Boulevard. Our differentiator is DRAMATICALLY better visual templates and a setup experience so smooth a beauty pro can go from signup to a published, stylish booking site in under 10 minutes.

## Tech stack (non-negotiable)
- Next.js 14+ with App Router, TypeScript, Server Components where appropriate
- Tailwind CSS + shadcn/ui for components
- Supabase for auth (email + Google OAuth), Postgres database, and image storage
- Stripe for (a) platform subscriptions from beauty pros to us and (b) Stripe Connect so beauty pros can accept deposits and payments from their clients
- Resend for transactional email (confirmations, receipts, reminders)
- Vercel for hosting and preview deploys
- GitHub for source control
- pnpm as the package manager

## Design principles — MANDATORY READING BEFORE ANY UI WORK
Before creating ANY component, page, or layout, read the design system skill file at `.claude/skills/design-system/SKILL.md`. That file defines the aesthetic, typography, color, and spacing rules for this product. Follow it strictly. Aesthetic summary: minimalist, modern, editorial. Think Linear, Stripe, Vercel, Arc Browser crossed with Glossier and Rhode. Not "SaaS-y," no emoji in UI, no stock hero illustrations, no drop shadows everywhere.

If the design system skill file does not yet exist at that path, STOP and tell me. I will paste it in before you continue.

## Phase 1 — MVP to ship TODAY
Goal: a deployed, functional skeleton I can use to sign up, log in, and complete a test-mode Stripe subscription checkout.

Steps in order:
1. Initialize Next.js 14 project with TypeScript, Tailwind, ESLint, Prettier, pnpm. Install shadcn/ui and set it up.
2. Initialize Git, create a new GitHub repo (ask me for the repo name), push initial commit.
3. Create a Supabase project and share the connection details with me. Create the initial schema (see "Database schema" below). Run migrations.
4. Build the marketing landing page (routes: `/`, `/pricing`, `/features`, `/login`, `/signup`). Must be beautiful — follow the design skill. Include a hero, a "3 templates" preview section (placeholder images OK for now), a features section, a pricing section with the three tiers below, and a footer.
5. Build auth: signup, login, password reset, Google OAuth via Supabase Auth. Protected `/dashboard` route.
6. Integrate Stripe: create 3 subscription Products and Prices in test mode via the Stripe API or CLI, implement Stripe Checkout for subscriptions, implement the webhook handler at `/api/stripe/webhook` that handles `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Store subscription status on the `businesses` table.
7. Build an empty dashboard shell with left-nav items: Dashboard, Site, Services, Bookings, Clients, Settings. Each page can be a placeholder with a header and "Coming soon" state styled per the design system.
8. Deploy to Vercel. Wire up all environment variables. Run the Stripe webhook in test mode against the deployed URL.
9. Write a clear README explaining what's done, what env vars are needed, how to run locally, and what's coming next.

## Phase 2 — Templates (next session, do not build yet)
- Three booking site templates with distinct aesthetics:
  1. **Minimal** — stark, editorial, lots of whitespace, serif display type
  2. **Studio** — warm, organic, soft neutrals, rounded corners
  3. **Editorial** — magazine-style, photography-forward, bold type pairings
- Template picker during onboarding
- Site editor: business info, services, photos, hours, social links
- Public routing: `slug.glamstack.app` subdomain OR `glamstack.app/[slug]` — recommend the better approach for Vercel

## Phase 3 — Bookings + Payments (next session)
- Services CRUD (name, duration, price, deposit %, buffer time, category)
- Weekly hours + date overrides
- Public booking flow for end clients
- Stripe Connect onboarding for beauty pros (Express accounts)
- Deposit collection at booking time
- Confirmation + reminder emails via Resend

## Database schema (Phase 1 only — propose and confirm with me before running migrations)
- `profiles` — one per auth user, links to auth.users
- `businesses` — business_name, slug, owner_id, subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_status, created_at
- `services` — business_id, name, duration_minutes, price_cents, deposit_cents, active
- `clients` — business_id, name, email, phone, notes
- `bookings` — business_id, client_id, service_id, start_at, end_at, status, deposit_paid, stripe_payment_intent_id
- Indexes on foreign keys, RLS policies so each business can only read/write their own rows

## Pricing tiers (already decided)
- **Starter — $24/mo**: 1 staff calendar, 1 template, basic booking, Stripe payments
- **Studio — $49/mo**: up to 3 staff, all templates, deposits, intake forms, SMS reminders
- **Scale — $89/mo**: unlimited staff, custom domain, multi-location, priority support

Create all three in Stripe in test mode during Phase 1.

## Before you touch anything
Produce this checklist for me FIRST and wait for confirmation:
1. The exact list of credentials/accounts you need from me (Supabase URL + anon/service keys, Stripe test keys + webhook secret, GitHub repo name, Vercel project name, Resend API key, Google OAuth client ID/secret).
2. The proposed folder structure for the Next.js app.
3. The proposed database schema as SQL.
4. A confirmation that you've read `.claude/skills/design-system/SKILL.md` with a 2-sentence summary of the key rules.

Once I approve all four, begin Phase 1. Work in small commits. After each major step, summarize what you did and what's next.

## Working style I want from you
- Small, focused commits with clear messages
- Ask before installing any library not listed in this brief
- Never push secrets to git — use `.env.local` and Vercel env vars
- When something fails, show me the error and your fix, don't silently retry
- At the end of the session, give me: the deployed URL, the GitHub repo URL, and a punch list of what's done vs. what's left for next session

Start by producing the 4-item checklist. Do not write code yet.
```

---

## Prerequisites checklist — do these BEFORE pasting the prompt

Claude Code can't create accounts or enter credit cards. You need to have these ready:

1. **GitHub account** — signed in, with an access token if you want Claude Code to create repos via CLI (`gh auth login` in terminal handles this)
2. **Supabase account** — free tier is fine. Create a project at [supabase.com](https://supabase.com) and grab the URL + anon key + service role key from Settings → API
3. **Stripe account** — sign up at [stripe.com](https://stripe.com), enable test mode, grab your test publishable + secret keys from Developers → API keys. You'll also need to install the Stripe CLI for webhook forwarding in development: `brew install stripe/stripe-cli/stripe`
4. **Vercel account** — sign up with your GitHub so deploys are one click
5. **Resend account** — [resend.com](https://resend.com), grab an API key (free tier allows 100 emails/day)
6. **Google OAuth credentials** (optional for today) — Google Cloud Console → APIs & Services → Credentials → OAuth client ID. Can skip if you only want email/password auth for MVP.
7. **A domain name** (optional for today) — not needed for Phase 1, needed for Phase 2 custom subdomains. Namecheap or Cloudflare both work.

## One more critical step — drop in the design skill

Before you start the Claude Code session, in your project folder create this file:
`.claude/skills/design-system/SKILL.md`

Paste the contents of `design-system-skill.md` (the other file I made for you) into it. That file is what the prompt is referencing when it says "read the design skill."

## What you'll have at end of today's session
- A live URL on Vercel where someone can sign up and subscribe to any of your 3 tiers (in Stripe test mode)
- A GitHub repo with clean code
- A beautiful landing page that looks legit enough to show to a beauty pro friend
- Empty dashboard ready for Phase 2

You will NOT yet have: working booking pages, the actual templates, or the ability for beauty pros to accept real payments. Those come in Phase 2 and 3.
