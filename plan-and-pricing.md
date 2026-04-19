# GlamStack — Plan, Pricing & Realistic Timeline

## What you're building
A booking + website platform for beauty professionals. Think StyleSeat or Vagaro, but with dramatically better visual templates — so a stylist can go from signup to a published, stylish booking site in under 10 minutes. Your edge: 12 years in the industry and real taste, which the VC-backed generic SaaS tools don't have.

## Pricing (recommended)

| Tier | Price | For whom | What they get |
|------|-------|----------|---------------|
| **Starter** | $24/mo | Solo pros just starting out | 1 staff calendar, 1 template, booking page, Stripe payments, email confirmations |
| **Studio** | $49/mo | Established solo pros and small teams | Up to 3 staff, all 3 templates, deposits, intake forms, SMS reminders, Google Calendar sync |
| **Scale** | $89/mo | Multi-stylist shops, suite operators | Unlimited staff, custom domain, multi-location, priority support |

Additional revenue streams to layer on once launched:
- **Template unlock packs:** $49–99 one-time for new template drops
- **Done-for-you setup service:** $297–497 one-time (you personally set up their whole stack)
- **Annual plans:** 2 months free if paid yearly — improves cash flow
- **Stripe Connect fee:** optionally add 1% on top of their client payments once you have scale

## Realistic timeline

**Today (one Claude Code session, 3–6 hours):**
- Project scaffolded, deployed to Vercel
- Landing page + pricing page (beautiful)
- Auth (signup, login)
- Stripe subscription checkout working in test mode
- Empty dashboard shell

**Week 1:**
- Onboarding flow + template picker
- Template #1 (Minimal) fully rendering with real data
- Site editor MVP (business info, services, photos, hours)
- Public booking site live at `slug.glamstack.app`

**Week 2–3:**
- Templates #2 (Studio) and #3 (Editorial)
- Services CRUD in the dashboard
- Availability / hours
- Public booking flow for end clients

**Week 3–4:**
- Stripe Connect onboarding for beauty pros (Express accounts)
- Deposit collection on bookings
- Email confirmations + reminders via Resend
- Soft launch to your personal network

**Month 2:**
- SMS reminders (Twilio)
- Google Calendar sync
- Intake forms
- First paying customers from your beauty network

## What to do TODAY (in order)

1. **Set up accounts** (30 min): GitHub, Supabase, Stripe (test mode), Vercel, Resend. Install the Stripe CLI (`brew install stripe/stripe-cli/stripe`).
2. **Create an empty project folder** on your Mac, e.g. `~/Projects/glamstack`
3. **Inside that folder, create `.claude/skills/design-system/SKILL.md`** and paste the contents of `design-system-skill.md` into it
4. **Open the folder in your terminal, run `claude`**
5. **Paste the prompt** from `claude-code-prompt.md` as your first message
6. **Answer Claude Code's checklist questions** — it will ask for your credentials and confirm the schema/folder structure before coding

## What I recommend you do in PARALLEL to building

This is important. While Claude Code builds, you should be:

1. **Recruit 5 "design partner" beauty pros** from your network. Promise them 6 months free in exchange for weekly feedback calls during beta. These people will tell you what's broken, what's missing, and eventually become your first case studies and referral source.
2. **Start a waitlist landing page** (can be separate from the real site, built in one afternoon on Carrd or Framer). Drive your Instagram traffic to it starting this week. Collect 200 emails before launch and you'll have a qualified list to sell to on day one.
3. **Offer the done-for-you setup service immediately** — even using GlossGenius or Acuity as the underlying tool for now. This validates demand, generates cash, and teaches you exactly what beauty pros get stuck on. When GlamStack is ready, migrate them over.
4. **Pick a real name** for the product. GlamStack is a placeholder. Consider: Boutique, Suite, Studio+, Houseform, Studiobook, Atelier. Check `.com` availability and Instagram handle availability.

## Biggest risks to watch

- **Scope creep.** Resist adding features until 10 paying customers ask for the same thing twice.
- **Design drift.** Every SaaS in this space looks cheap. If your templates don't look *better* than GlossGenius, you don't have a product. Be ruthless about design quality.
- **Payments/compliance.** Stripe Connect requires your LLC to be verified. Start that process this week — it can take days.
- **"Just one more feature" before launch.** Ship the rough version to 5 design partners. Launch publicly when the 5th one stops complaining about the same thing.
