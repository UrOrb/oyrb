# Phase 2 Prompt — Templates, Onboarding, and Public Sites

> **How to use:** Paste the block below into your existing Claude Code session (the same one you used for Phase 1 — it already has full context on the codebase). If you closed that session, open a new `claude` in the project folder and paste the block. Claude Code will re-read the code and the design skill automatically.

---

```
We're starting Phase 2 of GlamStack. Phase 1 (scaffold, auth, Stripe subscriptions, dashboard shell) is complete and deployed. Do not redo any of that.

## Before you touch any code
1. Run the dev server, confirm I can sign up and log in. Report the result.
2. Re-read `.claude/skills/design-system/SKILL.md` and summarize the rules in 2–3 sentences so I know you're following them. Every component you build in this phase must pass the "would this look at home on Glossier or Rhode" test.
3. Confirm the `businesses` table exists and has the fields needed for Phase 2 — if not, propose a migration. New fields we'll likely need: `template_slug` (text), `bio` (text), `hero_image_url` (text), `location` (text), `phone` (text), `instagram_url` (text), `tiktok_url` (text), `website_url` (text), `accent_color` (text, optional). Ask before running migrations.
4. Set up a Supabase Storage bucket called `business-assets` for photos, with appropriate RLS so each business can only write to their own folder.

## Goal of Phase 2
Beauty pros can, after subscribing:
1. Pick one of three visually distinct templates during onboarding
2. Fill in their business info, services, hours, photos, and social links via the dashboard
3. Publish a public booking site at `glamstack.app/s/[slug]` that actually looks gorgeous

Bookings themselves (real-time availability, deposit collection) are Phase 3. For now, the public site displays services and a "Request booking" CTA that emails the owner — we'll replace that with the real flow in Phase 3.

## Public routing decision (already made)
Use path-based routing: `glamstack.app/s/[slug]`. Each business owner gets a `slug` field on their `businesses` row, auto-generated from business name, editable in Settings, globally unique. Custom subdomains and custom domains come in Phase 4. Do not build subdomain routing in Phase 2.

## The three templates — distinct aesthetics, no overlap
Each template is a React component that receives `business`, `services`, `hours`, and `photos` as props and renders the entire public site. They must look and feel dramatically different from each other — not just different accent colors.

### Template 1 — "Minimal"
Aesthetic reference: Aesop × Rhode.
- Cream/ivory background (`#FAFAF7`), near-black ink
- Serif display typography (Fraunces or Instrument Serif) at 80–120px for hero
- Sans (Inter) for body
- Full-bleed hero photo with serif headline layered over it, left-aligned
- Services rendered as a **typographic list** — no cards, no images. Each row: service name (large serif), price (right-aligned, tabular numerals), thin divider line below. Duration in small sans caps next to name.
- Hours as a simple two-column list
- Contact block: phone, email, Instagram as a typographic list, not icons
- 160px vertical padding between sections on desktop
- Zero shadows, zero rounded corners beyond 4px
- Single subtle bronze accent (`#B8896B`) for links only

### Template 2 — "Studio"
Aesthetic reference: Goop × Sakara.
- Warm neutral background (`#F5F0EA`), charcoal ink
- Serif display (New Spirit or Fraunces) + rounded sans (Inter) pairing
- `rounded-xl` (16px) on all cards and photos
- Service cards: 2-column grid on desktop, each card has a small service photo (or placeholder warm gradient if no photo), name, 2-line description, duration, price, and a "Book" button
- Soft shadows allowed (`shadow-md` at most)
- Terracotta accent color (`#C17B5A`)
- Photo gallery in a masonry layout (varied heights, 3 columns desktop, 1 mobile)
- Warmer, more inviting tone throughout — this is the "homey studio" feel
- About section with owner portrait (rounded square, 16px radius) next to bio text

### Template 3 — "Editorial"
Aesthetic reference: SSENSE × Vogue.
- High-contrast: off-white sections and deep charcoal (`#1A1A1A`) sections alternating
- Bold display type — use a condensed or chunky serif (e.g., Domaine Display, or Instrument Serif Condensed fallback) at 120–160px for hero
- Magazine-grid layout: irregular photo placements, some full-bleed, some overlapping
- Service section looks like a magazine index: numbered list, pull-quote styling, small photo thumbnails
- Typography-forward pull quotes between sections ("Every cut should feel intentional." etc — pull from the business bio)
- Off-white accent (`#E8E4DD`) on dark sections
- Photography is the star — lots of it, varied sizes
- Distinct sections: About, Services, Gallery, Visit (location + hours), Book

## Template picker (onboarding flow)
After a user's first subscription succeeds, the webhook marks them as active. When they next land on `/dashboard` and they haven't picked a template yet (`businesses.template_slug IS NULL`), redirect them to `/onboarding/template`.

`/onboarding/template` shows:
- A short headline: "Choose your look"
- A subhead: "You can change this anytime."
- Three large preview cards side-by-side on desktop, stacked on mobile
- Each preview card shows a **real rendered preview** of that template with sample beauty-business data, at roughly 1/3 scale inside a rounded-md frame
- Hovering/tapping a card opens `/templates/preview/[slug]` in a new tab — a full-screen live preview with sample data, so the user can really see it
- Each card has a "Choose [template]" button that sets `businesses.template_slug` and redirects to `/onboarding/info`

Also build a public `/templates` page (linked from the marketing site) that shows all three templates with live previews and sample data. This becomes marketing material.

## Site editor (dashboard → /dashboard/site)
Tabbed interface with these tabs:
- **Info** — business name (locked unless on Studio/Scale tier), slug (editable with uniqueness validation), bio (textarea), location (city, state), phone, email
- **Services** — CRUD table: name, duration, price (stored as cents). No availability yet — that's Phase 3. Use a modal or drawer for create/edit.
- **Photos** — hero image upload + gallery (up to 12 photos). Use Supabase storage with signed upload URLs. Show upload progress.
- **Hours** — 7 rows (Monday–Sunday), each with "Open/Closed" toggle and open/close time pickers
- **Social** — Instagram, TikTok, website URLs
- **Template** — current template with a "Change template" button that goes back to the picker

Every form must have optimistic UI and clear error states. No alert() boxes. Use toast notifications (shadcn's `sonner`).

At the top of the site editor, show the public URL as a "View live site" link that opens `/s/[slug]` in a new tab, and a "Copy link" button.

## Public site route: /s/[slug]
- Server component that fetches the business by slug from Supabase (with its services, hours, photos)
- Renders the template matching `business.template_slug`
- 404 page if slug not found — make the 404 pretty, following the design skill
- If business subscription is canceled/unpaid, show a "This site is currently inactive" message instead of the template
- SEO: proper metadata (title, description, OG image set to hero_image_url)
- No booking functionality yet — "Request booking" button just opens a mailto: with the owner's email OR a simple contact form that emails the owner via Resend

## What to build, in this order
1. Database migration for new `businesses` fields + Storage bucket with RLS
2. Three template components in `/components/templates/{minimal,studio,editorial}.tsx` with hard-coded sample data first, so they render at `/templates/preview/[slug]` for design review BEFORE they're wired to real data
3. `/templates` marketing page and `/templates/preview/[slug]` full-preview page
4. Onboarding flow: `/onboarding/template` → `/onboarding/info`
5. Site editor with all five tabs
6. Photo upload via Supabase Storage
7. Public `/s/[slug]` route that renders the selected template with real data
8. Deploy to Vercel, test end-to-end with a fresh signup

## Stop-and-review checkpoints
After step 2 (templates rendering with sample data), stop and show me the preview URLs. I want to review the three templates' visual quality BEFORE we wire them up to real data. If they don't look dramatically different and genuinely beautiful, we redesign before moving on. This is the product's entire differentiator — do not rush this step.

After step 7, stop and walk me through end-to-end: signup → pay → pick template → fill info → view public site. Report any rough edges.

## Deliverables at end of this session
- Live URL where I can go through the full flow
- `/templates` page that I can share with friends for feedback
- Updated README with what's done and what's next (Phase 3: real bookings)
- A list of any design decisions you made that you'd like my input on

Start by confirming Phase 1 is working and re-summarizing the design rules. Do not write any code until I approve the proposed schema migration.
```

---

## What you get at the end of Phase 2
- Three genuinely distinct, beautiful templates
- A public `/templates` page you can post on Instagram as a teaser
- A working site editor in your dashboard
- Public booking sites live at `glamstack.app/s/[slug]` for any paid user

## What's still missing after Phase 2 (saved for Phase 3)
- Real-time availability and booking calendar
- Deposit collection via Stripe Connect
- Confirmation + reminder emails
- Clients database

## In parallel today — your non-coding work
1. **Take screenshots of the `/templates` page the moment Phase 2 is deployed** and post them to your Glam Box Room Instagram with "Something I'm building — DM if you want early access." You'll get real signal on which template resonates.
2. **Collect photos now.** The templates look 10x better with beautiful real beauty photography than with placeholders. Gather 20–30 high-res images from your own archive, or use free sources like Unsplash's beauty section for demo purposes. These become your sample-data for the template previews.
3. **Draft sample-business copy** for the template previews. A bio, 5 services with prices, hours. Claude Code will need this as seed data for the preview pages.
4. **Keep recruiting design partners.** Target 5. You should already have 2–3 committed by now.
