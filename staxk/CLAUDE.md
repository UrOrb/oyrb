# STAXK — Claude Code conventions

## Stack
Next.js 16 App Router (Turbopack) · TypeScript strict · Tailwind 4 ·
Supabase (Postgres/pgvector/RLS) · Inngest · Resend · Anthropic SDK

## Hard rules
- Mobile-first: build every view at 390px before desktop.
- WCAG 2.2 AA: semantic HTML, focus-visible rings, keyboard paths
  for all gestures, contrast ≥ 4.5:1. Lighthouse a11y 100 is a gate.
- All colors/type from tokens in `src/app/globals.css` — never raw hex in components.
- Server Actions for mutations; route handlers only for webhooks.
- Every table has RLS. Never use the service role key in client-reachable code
  (`src/lib/supabase/admin.ts` is imported by Inngest functions only).
- Agents: one Inngest function file per agent in `src/inngest/functions/`,
  prompts in `src/lib/prompts/` as exported template strings.
- No outbound email path may bypass the approval queue. Ever. The only
  Resend send call lives in `envoy.ts` and refuses status !== 'approved'.
- Every agent prompt gets an eval file (`evals/{agent}.eval.ts`); no prompt
  change merges without passing evals.
- Store raw source text alongside every embedding — never embedding-only.
- Zod-validate every external API response and every Claude JSON output
  (`agentJSON` in `src/lib/anthropic.ts` enforces this for agent calls).

## Next.js 16 gotchas (this repo's version)
- `params`, `searchParams`, `cookies()`, `headers()` are async-only — always await.
- `proxy.ts` replaces `middleware.ts` (nodejs runtime).
- `revalidateTag` needs a cacheLife profile second argument; prefer `revalidatePath`.

## Commands
pnpm dev · pnpm build · pnpm lint · pnpm typecheck · npx supabase db push

## Demo mode
With no Supabase env vars, the app serves seeded demo data
(`src/lib/demo-data.ts`) so every screen is explorable immediately.
