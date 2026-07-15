# STAXK

**A reverse-recruiting engine.** Jobs are leads. Hiring managers are contacts.
Applications are deals. Outreach is sequenced, AI-drafted, and — always —
human-approved. Built by Halania Dixon (Alania Renee) as both a job-search
instrument and a portfolio centerpiece: *the tool is the resume.*

Full product spec: [`SPEC.md`](./SPEC.md) · Build conventions: [`CLAUDE.md`](./CLAUDE.md)

## Quick start

```bash
pnpm install
pnpm dev        # → http://localhost:3000, demo mode with seeded data
```

No env vars needed to explore — every screen runs on demo data. To go live,
copy `.env.example` → `.env.local`, create a Supabase project, and run the
migration:

```bash
npx supabase db push   # applies supabase/migrations/0001_init.sql
```

## What's inside

| Area | Where |
|---|---|
| Design system ("Night Scan" tokens, Fraunces/Inter/JetBrains Mono) | `src/app/globals.css` |
| Match Dial (dual-ring gauge — the signature element) | `src/components/match-dial.tsx` |
| Kanban pipeline (drag + full keyboard nav, snap-scroll on mobile) | `src/components/kanban.tsx` |
| Swipe-to-approve outreach queue | `src/components/approval-queue.tsx` |
| The ten agents (Inngest functions) | `src/inngest/functions/` |
| Agent prompts + voice guide | `src/lib/prompts/` |
| Database schema + RLS | `supabase/migrations/0001_init.sql` |
| Public metrics page (the meta-move) | `/pulse` |

## The ten agents

Scout (sourcing) · Analyst (fit + tailoring) · Gatekeeper (your own ATS
screener) · Bridge (warm paths before cold ones) · Sleuth (people finding) ·
Envoy (approval-gated outreach) · Chronicle (CRM + replies) · Pulse (hiring
signals) · Curator (portfolio gaps) · Coach (interview training).

## Non-negotiables

- **Nothing sends without a human tap.** The only Resend call in the
  codebase checks `status === 'approved'`.
- WCAG 2.2 AA; every gesture has a button equivalent; Lighthouse a11y 100 is
  a launch gate.
- No LinkedIn automation — drafts are copy-and-paste only.
- Rate caps, permanent suppression list, CAN-SPAM footer. Guardrails are
  architecture, not settings.
