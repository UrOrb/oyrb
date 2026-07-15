# TALENT RADAR — Claude Code Build Spec
### A reverse-recruiting engine that sources jobs, finds hiring managers, and runs your outreach pipeline — built by Halania Dixon (Alania Renee) as both a job-search tool and a portfolio centerpiece.
> **How to use this document:** Drop this file into the root of a new repo as `SPEC.md`, open Claude Code, and say: *"Read SPEC.md. Let's start with Phase 1."* Every section below is written so Claude Code can act on it directly.
---
## 1. What This App Is
Talent Radar treats a job search like an outbound sales pipeline:
- **Jobs are leads** — sourced automatically from job board APIs and scored against your resume.
- **Hiring managers and TA are contacts** — found and verified automatically.
- **Applications are deals** — moved through a kanban pipeline (Sourced → Qualified → Applied → Contacted → Replied → Interview → Offer).
- **Outreach is sequenced** — personalized emails drafted by AI, approved by you with one tap, sent and followed up automatically.
**The interview pitch:** "I built the tool that got me this interview." The app IS the resume — it demonstrates React/TypeScript craft, AI agent orchestration, accessibility-first design, and shipped-product judgment in one artifact.
---
## 2. Design Direction (Aesthetic Brief)
This app must not look like a generic SaaS dashboard template. It's a personal instrument built by a creative technologist — it should feel like mission control designed by someone with taste.
### Concept: "Radar / Signal"
The visual metaphor is **signal detection** — you're scanning a noisy market for strong signals (great-fit jobs, warm contacts). Everything in the UI reinforces reading signal strength at a glance.
### Design tokens
**Palette — "Night Scan"** (dark-primary, because this is a tool you check morning and night on your phone):
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0E1116` | App background (deep blue-black, not pure black) |
| `--surface` | `#1A1F27` | Cards, sheets |
| `--signal` | `#7FD3C7` | Primary accent — match scores, live states, CTAs (a phosphor-scope teal, NOT acid green) |
| `--pulse` | `#E8A0BF` | Secondary accent — replies, human moments (warm orchid; nods to the Alania Renee beauty-industry roots without being "beauty pink") |
| `--paper` | `#F2EFE9` | Text on dark; also the light-mode background |
| `--caution` | `#E3B23C` | Follow-ups due, gaps flagged |
Full **light mode** required (system-preference + manual toggle). In light mode, `--paper` becomes background, `--ink` becomes text, accents deepen ~15%.
**Typography:**
- **Display:** `Fraunces` (variable, optical sizing on) — used ONLY for pipeline stage headers, the dashboard greeting, and match-score numerals. Set tight, high contrast weight.
- **Body/UI:** `Inter` or `Geist` — clean, screen-optimized.
- **Data/mono:** `JetBrains Mono` — match scores, email addresses, timestamps, API statuses. The mono face is a personality carrier here: it makes the app feel like an instrument.
**Signature element — the Match Dial:**
Every job card carries a small circular gauge (SVG, animated on first paint) showing the semantic match score 0–100. The dial fills in `--signal`, with a subtle sweep animation like a radar ping. On the job detail page it becomes the hero: a large dial with the score in Fraunces, orbited by small chips naming the top matched skills and (in `--caution`) the gaps. This one element appears everywhere and becomes the thing people remember from the demo.
**Motion:** One orchestrated moment — the radar sweep on dashboard load (a conic-gradient arc rotating once over the pipeline summary). Everything else is restrained: 150–200ms ease-out on sheets and cards. `prefers-reduced-motion` fully respected — sweep becomes a fade.
### Mobile-first, genuinely
- Design at **390px first**, then scale up to desktop (1280px+ gets a 3-column layout: pipeline | detail | activity feed).
- **Bottom tab bar on mobile** (Dashboard, Pipeline, Contacts, Approvals, Settings) with a raised center action button for the Approval Queue — the thing you'll tap most.
- **Approval queue = swipe cards on mobile.** Swipe right to approve an outreach email, left to skip, tap to edit. This is the killer mobile interaction — approving your day's outreach from the couch in 90 seconds.
- Kanban pipeline collapses to a horizontal snap-scroll of stage columns on mobile.
- Ship it as a **PWA** (manifest + service worker via `next-pwa`): installable to home screen, push notifications for replies ("Sarah at Figma replied 👀").
### Accessibility (non-negotiable — it's your brand)
- WCAG 2.2 AA minimum. All accent-on-dark pairs checked ≥ 4.5:1.
- Full keyboard nav including the kanban (arrow keys move focus, space picks up/drops a card).
- Visible focus rings (`--signal`, 2px offset).
- Swipe gestures always have button equivalents.
- Lighthouse 100 accessibility score is a launch gate, not a nice-to-have.
---
## 3. Architecture Overview
```
┌────────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 15 (App Router), TypeScript, Tailwind  │
│  PWA · shadcn/ui base + custom design system · Framer      │
│  Motion · deployed on Vercel                               │
└──────────────┬─────────────────────────────────────────────┘
               │ Server Actions + Route Handlers
┌──────────────▼─────────────────────────────────────────────┐
│  BACKEND (see §4)                                          │
│  • Supabase: Postgres + pgvector + Auth + RLS + Storage    │
│  • Inngest: durable background jobs (the agents live here) │
│  • Anthropic API: all agent reasoning (Claude Sonnet)      │
│  • Resend: outbound email + inbound reply webhooks         │
└──────────────┬─────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────┐
│  EXTERNAL DATA                                             │
│  Greenhouse / Lever / Ashby public job APIs · HN Who's     │
│  Hiring · SerpAPI (LinkedIn/Google results) · Apollo.io    │
│  or Hunter.io (email finding + verification)              │
└────────────────────────────────────────────────────────────┘
```
---
## 4. Backend — What to Use and Why
**Answer: Supabase + Next.js server layer + Inngest.** You do not need a separate Express/Nest server. Here's the division of labor:
### Supabase (the data spine)
- **Postgres** — all app data (schema in §5).
- **pgvector extension** — stores embeddings of your resume and every job posting; match scoring is a single cosine-similarity SQL query.
- **Auth** — single-user for now (you), but built with RLS from day one so it could become multi-tenant SaaS later (you already know this pattern from OYRB).
- **Row Level Security** — every table scoped to `auth.uid()`.
- **Storage** — resume versions (PDF), generated cover letters.
- **pg_cron** — lightweight schedules (e.g., "mark follow-ups due").
### Next.js server layer (the API)
- **Server Actions** for all user-initiated mutations (approve email, move pipeline card, edit draft).
- **Route Handlers** (`app/api/*`) only for webhooks: Resend inbound email, Inngest endpoint.
- No separate backend repo. One codebase, one deploy.
### Inngest (the agent runtime) — the most important choice
Your agents run for minutes, hit rate limits, and need retries. Vercel serverless functions time out; cron alone can't do multi-step flows. **Inngest gives you durable, step-based background functions** with retries, sleeps, and fan-out — this is where all five agents actually execute in production.
```
inngest functions:
  scout.run        — cron: 0 6,14 * * *  (6am + 2pm ET scans)
  analyst.run      — event: job.qualified
  sleuth.run       — event: job.shortlisted
  envoy.draft      — event: contact.verified
  envoy.send       — event: outreach.approved  (+ step.sleep for day-3/day-7 follow-ups)
  chronicle.reply  — event: email.inbound
  gatekeeper.screen — event: job.qualified (per-job ATS screen)
  gatekeeper.market — cron: weekly (aggregate market keyword scan)
  bridge.map        — event: job.shortlisted (warm-path / referral mapping)
  pulse.listen      — cron: every 4h (social hiring-signal scan)
  curator.gap       — cron: weekly, after gatekeeper.market (portfolio gap analysis)
  coach.session     — on-demand (interview practice, not scheduled)
```
### Anthropic API (the brains)
Every agent's reasoning is a Claude API call (`claude-sonnet-4-6`) with structured JSON output. Claude Code *builds* the agents; the deployed agents call the API directly. (Know this distinction cold for interviews.)
### Resend (email)
- Outbound from a dedicated domain (e.g., `hello@alaniarenee.dev` — never your primary domain, protects your sender reputation).
- **Inbound parsing**: replies hit a webhook → Chronicle agent classifies them (interested / not now / referral / rejection) → pipeline auto-updates → push notification to your phone.
- Set up SPF, DKIM, DMARC on day one. Warm the domain: max ~10 sends/day for the first two weeks.
---
## 5. Database Schema (Supabase migration, ready to run)
```sql
create extension if not exists vector;
-- Your resume, versioned, embedded
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text not null,                        -- "Front-End UI v3", "Creative Tech v1"
  content_md text not null,
  skills text[] not null default '{}',
  embedding vector(1536),
  is_active boolean default false,
  created_at timestamptz default now()
);
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  ats text check (ats in ('greenhouse','lever','ashby','other')),
  notes_md text,                              -- Sleuth's research dossier
  created_at timestamptz default now()
);
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company_id uuid references companies,
  title text not null,
  location text,
  remote boolean,
  salary_min int, salary_max int,
  source text not null,                       -- 'greenhouse' | 'lever' | 'ashby' | 'hn' | 'manual'
  source_url text unique,                     -- dedupe key
  description_md text,
  required_skills text[] default '{}',
  embedding vector(1536),
  match_score numeric(4,1),                   -- 0.0–100.0
  skill_gaps text[] default '{}',
  stage text not null default 'sourced'
    check (stage in ('sourced','qualified','applied','contacted','replied','interview','offer','closed')),
  tailored_bullets_md text,                   -- Analyst output
  cover_letter_md text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company_id uuid references companies not null,
  full_name text not null,
  title text,
  role_type text check (role_type in ('hiring_manager','recruiter','ta','engineer','other')),
  email text,
  email_confidence numeric(3,2),              -- from verification API
  linkedin_url text,
  personalization_notes_md text,              -- Envoy's hooks: recent posts, launches
  created_at timestamptz default now()
);
create table outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs not null,
  contact_id uuid references contacts not null,
  sequence_step int not null default 1,       -- 1 = intro, 2 = day-3, 3 = day-7
  subject text,
  body_md text,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','sent','replied','bounced','skipped')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  resend_id text,
  created_at timestamptz default now()
);
create table replies (
  id uuid primary key default gen_random_uuid(),
  outreach_id uuid references outreach not null,
  body_text text,
  classification text check (classification in ('interested','not_now','referral','rejection','other')),
  received_at timestamptz default now()
);
-- Gatekeeper output: one ATS screen report per job × resume version
create table screen_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs not null,
  resume_id uuid references resumes not null,
  ats_score numeric(4,1),                     -- 0–100 simulated ATS pass score
  keyword_coverage jsonb,                     -- [{keyword, weight, status: 'exact'|'variant'|'missing', where_found}]
  vision_alignment jsonb,                     -- {company_values[], resume_evidence[], alignment_score}
  parse_risks text[] default '{}',            -- formatting issues that break ATS parsers
  recruiter_verdict text
    check (recruiter_verdict in ('advance','maybe','reject')),
  suggested_edits_md text,                    -- concrete rewrite suggestions
  created_at timestamptz default now()
);
-- Weekly market-wide keyword aggregation ("what companies are looking for")
create table market_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_of date not null,
  role_cluster text not null,                 -- 'front-end', 'creative-tech', 'design-engineer'
  top_keywords jsonb,                         -- [{keyword, job_count, in_resume: bool, trend: 'rising'|'flat'|'falling'}]
  coverage_pct numeric(4,1),                  -- % of market keywords your resume covers
  created_at timestamptz default now()
);
create table activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  agent text not null,                        -- 'scout' | 'analyst' | 'sleuth' | 'envoy' | 'chronicle'
  event text not null,
  payload jsonb,
  created_at timestamptz default now()
);
-- Match scoring in one query
create index on jobs using ivfflat (embedding vector_cosine_ops);
-- score = (1 - cosine_distance(job.embedding, resume.embedding)) * 100
```
Enable RLS on every table: `user_id = auth.uid()`.
---
## 6. The Ten Agents — Full Specs
Each agent = one Inngest function + one system prompt + defined tools/APIs. Build them in this order.
### 🛰 SCOUT — Job Sourcing
- **Trigger:** cron, twice daily.
- **Sources (all free/legal, in priority order):**
  1. Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true` — maintain a `target_companies` list.
  2. Lever: `https://api.lever.co/v0/postings/{company}?mode=json`
  3. Ashby: `https://api.ashbyhq.com/posting-api/job-board/{company}`
  4. Hacker News "Who's Hiring" monthly thread via Algolia API (`hn.algolia.com/api/v1`).
  5. SerpAPI Google Jobs results for broader coverage (LinkedIn/Indeed listings surface here without ToS-violating scraping).
- **Pipeline:** fetch → dedupe on `source_url` → filter by keywords (front-end, UI engineer, creative technologist, design engineer) + location (remote / Atlanta) → embed description (`text-embedding` via OpenAI or Voyage AI) → cosine score vs. active resume → **score ≥ 80 → stage `qualified`**, fire `job.qualified` event.
- **Claude's role:** normalize messy postings into structured JSON `{title, skills[], salary, remote}`.
### 🔬 ANALYST — Fit & Tailoring
- **Trigger:** `job.qualified` event.
- **Does:** extracts required skills → diffs against resume skills → writes `skill_gaps` (this is the feature that catches things like the .NET/Angular gap) → generates 4–6 tailored resume bullets and a 150-word cover letter in your voice.
- **Prompt inputs:** job description, active resume markdown, a `voice.md` style guide (see §8 Skills).
- **Output:** structured JSON written to `jobs.tailored_bullets_md` / `cover_letter_md`. **Nothing auto-applies — you review.**
### 🕵️ SLEUTH — People Finding
- **Trigger:** you shortlist a job (stage → `applied` or a manual "find people" tap).
- **Does:**
  1. Apollo.io API (`/v1/mixed_people/search`) — search company domain + titles: "Engineering Manager", "Talent Acquisition", "Recruiter", "Head of Design Engineering". Free tier: ~50 credits/mo; paid ~$49/mo when you scale. (Hunter.io is the cheaper email-only alternative.)
  2. Email verification via the same API → store `email_confidence`; only ≥ 0.85 proceeds to outreach.
  3. SerpAPI query `"{name}" {company} site:linkedin.com` for the profile URL (reading public search results, not scraping LinkedIn directly).
  4. Claude web-search pass for personalization ammo: recent company launches, the person's talks/posts → `personalization_notes_md`.
- **Output:** 1–3 verified contacts per job, fires `contact.verified`.
### 🌉 BRIDGE — Warm-Path & Referral Mapper (the highest-converting agent in the app)
Referrals convert roughly an order of magnitude better than cold applications, and in the current flooded market, warm paths are the channel that still works. Bridge finds yours.
- **Data source (100% legal):** **your own LinkedIn data export.** LinkedIn → Settings → Data Privacy → "Get a copy of your data" → Connections CSV (names, companies, positions, connect dates). It's YOUR data; exporting it violates nothing. Re-export monthly. Supplement with a manually maintained `network` table: Atlanta tech community, past clients, collaborators (Film Bar AI, AI Makers Generation, Destination College Park), beauty-industry contacts who moved into tech-adjacent roles.
- **Trigger:** `job.shortlisted` — before Sleuth runs. **Warm path first, cold path only if no warm path exists.**
- **Does:**
  1. Fuzzy-matches your network against the target company (current employer match, past employer match, and 1.5-degree: "your contact's company partners with them / she posted about them").
  2. Ranks paths by strength: recency of contact, relationship depth (you tag connections warm/medium/cold once during import), relevance of their role.
  3. Drafts the **intro ask** — a distinct Envoy template type: short, gives your contact an easy out, includes a forwardable blurb so they can make the intro in 30 seconds without writing anything.
  4. If no path exists: falls through to Sleuth (cold) and logs it — so your metrics can prove the warm-vs-cold conversion gap with your own data.
- **UI:** every job card shows a path indicator: 🌉 warm path found / ❄️ cold only. On the job detail page, the path renders as a mini relationship graph (you → contact → company).
- **Schema:** `network (id, full_name, company, title, relationship_tier, last_touch, source, linkedin_url)` · add `path_type ('warm'|'cold')` to `outreach`.
- **Rule:** never message someone's contact directly without them — Bridge asks YOUR person for the intro; it doesn't cold-email their friend.
### ✉️ ENVOY — Outreach (human-in-the-loop, always)
- **Trigger:** `contact.verified` → drafts; `outreach.approved` → sends.
- **Drafting rules (encode in prompt):** ≤ 120 words. One genuine personalization line (from Sleuth's notes). One proof line linking a live build (oyrb.space, portfolio, this very app). One clear ask (15-min chat). No "I hope this finds you well." Subject ≤ 6 words.
- **Sequence:** intro → `step.sleep(3d)` → follow-up 1 (new angle, e.g. link the public metrics dashboard) → `step.sleep(4d)` → follow-up 2 (graceful close). **Any reply cancels the sequence.**
- **THE RULE: nothing sends without your tap in the Approval Queue.** This is your CAN-SPAM safety, your quality bar, and your best conversion lever. Every email includes your real name, real context, and honors opt-outs immediately.
- **LinkedIn channel (draft-only):** Envoy also drafts LinkedIn connection notes (≤ 300 chars), InMail-style messages, and reply follow-ups — but never sends them. Each draft gets a **"Copy & open LinkedIn"** button (deep-links to the contact's profile); you paste and send manually. Add a `channel` column to `outreach` (`'email' | 'linkedin'`) so LinkedIn touches are tracked in the same sequence logic and reply pipeline (you log the reply with one tap). This gets you multi-channel outreach with zero ToS risk.
- **Deliverability defense (the silent killer).** New domain + AI-pattern text = spam folder, and your metrics would just look like "nobody replies." Countermeasures, all mandatory:
  - Plain-text first-touch emails: no HTML templates, no tracking pixels, **no links in message #1** (link your proof in follow-up #2, or mention it in words: "search halaniadixon.com").
  - **Anti-AI-pattern lint** in the drafting prompt: ban the tells recruiters pattern-match ("I hope this finds you well," "I am thrilled to apply," "my skills align perfectly," triple-bullet structures, em-dash chains). Roughly a third of hiring managers say they spot AI-written applications in under 20 seconds and about 1 in 5 reject on sight — your edit pass in the approval queue is a quality step, not a formality. The prompt drafts; **you rewrite at least one line in your own words every time.**
  - Deliverability monitoring: weekly seed-inbox test (send to your own Gmail/Outlook/Yahoo test accounts; Chronicle checks placement), Google Postmaster Tools on the sending domain, bounce-rate alarm at >2%.
  - SPF + DKIM + DMARC before the first send; warm-up ≤10/day for two weeks (already a rule — it's here twice because it's the #1 way this app dies invisibly).
- **Never** automate LinkedIn DMs/connections — account-ban territory. Email + manual LinkedIn only.
### 📓 CHRONICLE — CRM & Follow-Through
- **Triggers:** Resend inbound webhook, stage changes, nightly cron.
- **Does:** classifies replies (interested / not_now / referral / rejection) → moves pipeline → push notification. Nightly: flags stale cards ("Applied 10 days, no contact found — run Sleuth?"). Pre-interview: auto-compiles a dossier (company research + your relevant work + likely questions) the evening before any card hits `interview`.
- **Also powers the public metrics page** (§10).
- **Inbound recruiter desk.** Recruiter messages converting to interviews have collapsed (roughly 40% in 2022 → ~12% in 2026) partly because recruiters' own AI filters now discard low-effort replies like "Yes, interested!" When a recruiter reaches out to YOU (you paste the message in, or it arrives by email), Chronicle drafts a substantive reply that engages the actual role — one specific qualification match, one intelligent question — and opens a pipeline card so inbound gets the same tracking as outbound.
### 🚪 GATEKEEPER — Your Own ATS / AI Resume Screener
The agent that flips the table: it screens YOUR resume exactly the way companies' AI screening does, before any real ATS ever sees it. Two modes.
**Mode 1 — Per-job screen** (trigger: `job.qualified`, or on-demand from any job card):
Runs a four-layer screen, mirroring how real screening stacks work:
1. **Keyword extraction & weighting (the ATS layer).** Claude parses the job description into weighted keywords the way ATS ranking does:
   - Hard skills / tools / frameworks (React, TypeScript, Figma, WCAG…)
   - Title keywords ("Front-End", "UI Engineer", "Design Systems")
   - Certifications, methodologies, years-of-experience phrases
   - Weighting rules: appears in job title = 3×, in "Requirements" = 2×, in "Nice to have" = 1×, repeated ≥3 times = boost. Output: a ranked keyword list with weights.
2. **Exact-match scan (the literal layer).** Real ATS keyword matching is dumber than people think — it's largely literal string matching. Gatekeeper checks your resume for **exact matches, variants, and misses**: "React.js" vs "React" vs "ReactJS" are different strings to many parsers; "a11y" ≠ "accessibility"; "led" ≠ "leadership." Every keyword gets a status: `exact` / `variant` (found but phrased differently — rewrite suggested) / `missing`.
3. **Company vision & values alignment (the culture layer).** Gatekeeper fetches the company's careers page, about page, and mission statement (web search + fetch, stored in `companies.notes_md`), extracts their values vocabulary ("craft," "customer obsession," "move fast," "inclusive design"), then checks whether your resume's language and project stories give a screener *evidence* of those values — and suggests where to weave in matching language honestly (e.g., your WCAG work is literal proof for any company that says "inclusive").
4. **Recruiter simulation (the judgment layer).** Claude role-plays a recruiter with a strict rubric and a 6-second-first-pass constraint, then a full read, and returns a verdict: `advance` / `maybe` / `reject`, with the top 3 reasons and the single change most likely to flip a `maybe` to `advance`.
Plus a **parse-risk check**: flags formatting that breaks real ATS parsers — multi-column layouts, tables, text in graphics/headers, nonstandard section names ("My Journey" instead of "Experience"), missing date formats.
**Output per job:** an ATS score (0–100), a keyword coverage table, vision-alignment notes, parse risks, and `suggested_edits_md` — concrete line rewrites you can accept into a new resume version with one tap (which re-embeds and re-scores automatically, so you can watch the Match Dial and ATS score move in real time).
**Mode 2 — Market scan** (trigger: weekly cron):
Aggregates keyword extraction across **every job Scout has collected that week**, clustered by role type. Answers "what is the market asking for that my resume doesn't say?" — e.g., "'design systems' appeared in 34 of 41 front-end postings this week; your resume never uses the phrase. 'Angular' appeared in 12 (rising)." Writes to `market_signals` and renders a **Market Coverage heatmap** in the UI: rows = top 25 market keywords, columns = weeks, cell color = in-resume or not. This is how you catch gaps like .NET/Angular *systemically* instead of one job at a time.
**UI — "The Screen Room":** resume and job description side by side (stacked on mobile), keywords highlighted in place — `--signal` for matched, `--caution` for variants, `--pulse` outline for missing. The job detail hero becomes a **dual Match Dial**: outer ring = semantic match (Analyst), inner ring = ATS keyword score (Gatekeeper). Two rings full = apply with confidence.
**Honesty guardrail (bake into the prompt):** Gatekeeper suggests rephrasing and surfacing real experience in the market's vocabulary — it never invents skills or experience. Every suggested edit must trace to something true in your history. That rule is also a great interview talking point.
### 📡 PULSE — Social & Hiring-Signal Listener
Scans public social conversation for hiring signals **before** they hit job boards, and reads the market's mood about companies you're targeting.
- **Trigger:** cron every 4 hours.
- **Legal data sources (public APIs and indexed content only — never logged-in scraping):**
  1. **X/Twitter API** — searches: `"we're hiring" (frontend OR "design engineer")`, posts from tracked recruiters/eng leaders at target companies.
  2. **Reddit API** — r/cscareerquestions, r/webdev, r/ExperiencedDevs, r/recruitinghell: hiring threads, interview experience reports, salary threads for your role cluster.
  3. **Hacker News** (Algolia API) — hiring threads + "Ask HN" interview/comp discussions.
  4. **LinkedIn public posts via SerpAPI** — Google-indexed public posts only (`site:linkedin.com/posts "hiring" "front end"`), never authenticated scraping.
  5. **RSS/blogs** — target companies' engineering blogs and careers pages (a new "our team is growing" post is a leading indicator).
- **Claude's role per batch:** classify each item — `hiring_signal` / `recruiter_activity` / `layoff_or_freeze` / `interview_intel` / `comp_data` / `noise` — link to a company if identifiable, extract the actionable nugget.
- **Outputs:**
  - A **Signals feed** in the UI (mobile: the second tab) — "Eng manager at {company} posted 2h ago that her team is hiring a UI engineer. No job posting exists yet. → Run Sleuth?"
  - A **hiring-momentum score** per company (posting velocity + social signals + blog activity) shown on company cards — apply where momentum is rising.
  - Interview intel routed to Coach's question bank; comp data routed to the job detail page.
- **Schema:** `social_signals (id, company_id, source, url, kind, summary_md, detected_at)`.
- **Guardrail:** public data only, stored as links + summaries (not full mirrored content), source always attributed in the UI.
### 🎨 CURATOR — Portfolio Gap Engine
Turns Gatekeeper's market scan into a **portfolio roadmap**: what should you build next so your work matches what companies are hiring for right now?
- **Trigger:** weekly, chained after `gatekeeper.market`.
- **Does:**
  1. Ingests the week's `market_signals` (top keywords by role cluster) + your portfolio inventory (a `portfolio_items` table you seed with your live builds: OYRB, portfolio site, AURA, etc., each tagged with the skills it demonstrates).
  2. Diffs demand vs. evidence: "'design systems' → 34/41 postings, demonstrated by: none of your 8 portfolio pieces."
  3. For each gap, generates a **project brief**: a scoped 3–7 day build that would credibly demonstrate the skill, with a suggested case-study angle and where it slots on halaniadixon.com. (Talent Radar itself is Curator's first exhibit — it covers 'AI agents', 'TypeScript', 'accessibility', 'product thinking' in one artifact.)
  4. Tracks briefs kanban-style: Suggested → Building → Shipped → Case study written. Shipping one updates `portfolio_items`, which raises your coverage score — a visible flywheel.
- **UI:** "Portfolio Lab" view — market demand heatmap on the left, your coverage on the right, gap briefs in between. On mobile, a simple ranked list: "Biggest gap → best next build."
- **Schema:** `portfolio_items (id, title, url, skills[], case_study_url)` · `portfolio_briefs (id, gap_keyword, demand_count, brief_md, status)`.
### 🎤 COACH — Interview Trainer
Practice interviews against an AI that has studied the specific company and role — so the first time you answer "tell me about a time…" isn't in the real interview.
- **Trigger:** on-demand from any job card at stage `interview` (or anytime from the Coach tab).
- **Question bank per job, assembled from:** the job description's stated competencies · company values (already in `companies.notes_md` from Gatekeeper's vision layer) · Pulse's `interview_intel` signals · role-standard question sets (behavioral/STAR, front-end technical: JS/TS, React rendering, CSS architecture, accessibility, system design for UI; portfolio walkthrough).
- **Session modes:**
  1. **Drill** — one question at a time, typed or **voice** (Web Speech API on mobile — practice out loud on a walk; this is where mobile-first pays off).
  2. **Full mock** — 30-min simulated interview, Claude in-character as the interviewer type you pick (recruiter screen / hiring manager / senior engineer / panel).
  3. **Story bank** — Coach interviews YOU about your real history (Glambox Room, OYRB, client work) once, extracts 10–12 STAR stories, then maps every future question to your strongest story.
  4. **AI-screen mode** — AI-conducted interviews are now mainstream: one-way video screens and AI interviewers with dynamic follow-ups, structured rubrics, and proctoring. This is a *different skill* than human interviews: 60–90s answers front-loaded with the conclusion, rubric-keyword awareness, camera presence, zero rapport to lean on. Coach simulates the format (timed prompts, no interviewer feedback, follow-up questions generated from your answer) and critiques recordings you make on your phone.
  5. **Negotiation dojo** — the offer stage is where six figures becomes six-plus, and it's the stage every competitor app ignores. Coach pulls public comp benchmarks for the role/level/market, then runs negotiation role-play: Claude plays the recruiter delivering the offer, you practice the counter, the pause, the "let me think it over," and competing-offer framing. Includes a written counter-offer email drafter (approval-gated like everything else).
- **Feedback rubric per answer:** structure (STAR completeness) · specificity (numbers, names, outcomes) · relevance to the JD competency · length (60–120s target) · red flags (blaming, vagueness, underselling). Scored 1–5 each with one concrete rewrite suggestion.
- **Chained with Chronicle:** the night-before interview dossier now includes your 3 weakest drilled questions + your best story for each of the company's stated values.
- **Schema:** `interview_sessions (id, job_id, mode, transcript_jsonb, scores_jsonb, created_at)` · `star_stories (id, title, story_md, competencies[])`.
---
## PART II — Market Reality, Risks & What This App Proves
*This app is single-user by design. Halania is user zero and user only. It is not a product, not a beta, not a waitlist — it is a working demonstration of what she can build, and its only KPIs are her interviews and her offer. That decision simplifies everything below.*
### II.1 The doom loop — the market this app is built for (read before building)
The AI-application arms race has already reshaped hiring, and it dictates this app's strategy:
- Recruiters report roughly **4× the application volume** of a few years ago; a typical opening now draws ~240+ applications, putting any single cold application near a **0.4% success rate**.
- About **a third of hiring managers say they can spot AI-written applications in under 20 seconds**, and roughly 1 in 5 reject them on sight. Generic AI text is now the noise floor, not an edge.
- Trust has collapsed in both directions: employers doubt applications represent real people; candidates doubt humans ever see their materials.
- **Resume-first hiring is weakening**: a large share of employers are shifting toward skills-based, portfolio, and scenario-driven evaluation.
**Strategic consequences baked into this spec:**
1. **Volume loses. Precision + timing wins.** Scout's real value is applying within hours of a posting, to a shortlist of companies, with tailored materials — 15 precise applications beat 200 sprayed ones.
2. **Warm paths beat cold paths.** Hence Bridge runs *before* Sleuth on every job.
3. **Proof-of-work beats claims.** The live builds, the public `/pulse` dashboard, and this app itself are the differentiators no AI text generator can fake — and they align with where hiring is heading (skills-based evaluation).
4. **Human-edited beats AI-polished.** Every outbound message passes through your hands and gets at least one line rewritten in your voice.
### II.2 The "superpower" data strategy — what's actually buildable
Be precise about this (interviewers will probe it). You **cannot** scrape companies' internal ATS scoring systems — that data is private and protected. You don't need it. The intelligence layer is built from four **legal** sources:
1. **Public postings at scale (the behavior fossil record).** Every job posting is a company telling you exactly what its screen selects for. Scout stores them historically (never delete), giving you longitudinal keyword trends, re-posting signals (a re-posted job = their screen is rejecting everyone), and requirement-language differences by company tier.
2. **Public ATS documentation & parser behavior.** Greenhouse, Lever, Ashby, Workday publish docs; parsing behavior is empirically testable (run formatted resumes through open-source resume parsers). Gatekeeper's parse-risk rules are built from *tests*, not folklore.
3. **Recruiter-published knowledge.** Recruiters constantly publish how they screen (LinkedIn posts, podcasts, AMAs — Pulse collects this). Distill it into Gatekeeper's recruiter-simulation rubric, versioned per company tier — a State of Iowa government screen is not a startup screen.
4. **Your own outcome data.** Every reply, interview, and rejection is logged against the resume version, outreach style, channel, and path type that produced it. Within 60 days you have something no job-search product can show a hiring manager: *a personal conversion funnel with real data* — warm vs cold reply rates, which resume version converts, time-to-response by company tier. This is also your best interview artifact.
### II.3 Competitive teardown — borrow the best components, skip the worst
You're not competing with these companies; you're strip-mining their best ideas for a personal instrument.
| App | Best component (take it) | Their weakness (avoid it) |
|---|---|---|
| **Jobscan** | ATS keyword match scoring | Static one-job scans; no market view, no pipeline. Gatekeeper + market scan supersedes it. |
| **Teal** | Polished tracker + resume-version UX | Tracks but doesn't act — no agents. |
| **Huntr** | Kanban board ergonomics | A filing cabinet, not an engine. |
| **Simplify** | 1-click application autofill | No intelligence behind the autofill. (A tiny personal autofill bookmarklet is a nice week-4 add.) |
| **LazyApply / Sonara** | — | **Anti-pattern. Do not copy.** Mass auto-apply is exactly what created the doom loop; it tanks reply rates and burns reputations. |
| **Careerflow** | LinkedIn profile optimization checklist | Run its ideas through Gatekeeper on your own profile once; no module needed. |
| **Google Interview Warmup** | Instant low-friction practice loop | Generic questions. Coach's per-company banks + AI-screen mode beat it. |
| **Final Round AI etc.** | — | Live answer-feeding copilots are ethically murky and detectable. Coach trains skill instead. |
| **LinkedIn Premium** | Applicant insights | Closed garden; interoperate via draft-for-paste and your own data export (Bridge). |
### II.4 Failure modes — the ways this falls apart, and the guardrail for each
1. **Deliverability death (silent).** Emails land in spam; metrics look like rejection. → Envoy's deliverability defense (§6) is mandatory, not optional: seed-inbox tests, Postmaster Tools, plain-text first touches, domain warm-up.
2. **Building instead of applying.** The app becomes sophisticated procrastination. → **Hard rule: manual applications start week 1, in parallel.** If the app hasn't sent real outreach by end of Phase 3, cut agents, not deadlines. Ship order is ruthless: Phases 0–4 first; Bridge, Coach, Pulse, Curator only after real outreach is flowing.
3. **Prompt drift.** Agent output quality degrades silently as prompts and models change. → Every agent gets an eval file from day one (golden inputs → expected-quality outputs, scored by a judge prompt); qa subagent runs evals on every prompt change. No prompt merges without passing evals.
4. **API fragility & cost creep.** X API pricing, Apollo credits, SerpAPI quotas, ATS endpoints changing. → Adapter pattern per source (one file per integration, graceful degradation when a source dies), monthly cost review, hard caps in env config. Store **raw text alongside every embedding** so you're never locked to an embedding model.
5. **Legal/etiquette own-goals.** Even single-user: CAN-SPAM applies to you personally (real identity, opt-outs honored instantly, physical address), Apollo's personal-use terms apply, LinkedIn automation stays off the table, and a suppression list is permanent. The approval gate is your legal shield — regulators are actively scrutinizing automated hiring-related tools that act without a human in the loop; yours never does.
6. **Burnout.** Ten agents + OYRB + client work + interviewing. → The roadmap's phase gates are also energy gates. Phases 0–4 is the whole app for landing the job; everything after is bonus.
### II.5 What this app demonstrates — the capability checklist for interviews
Single-user doesn't mean small. Built as specced, this app is evidence of:
- **Full-stack product engineering** — Next.js/TypeScript/Supabase/Postgres with RLS, PWA, real auth (RLS is kept even for one user: it's the correct pattern, it costs nothing, and "I built it multi-tenant-ready even as a personal tool" is a senior-engineer answer).
- **AI agent orchestration in production** — ten agents, durable workflows, event-driven architecture, human-in-the-loop design, eval-driven prompt engineering.
- **Data engineering** — embeddings, semantic search, longitudinal datasets, a personal analytics funnel.
- **Judgment** — compliance guardrails, deliverability engineering, anti-pattern awareness (why you *didn't* build auto-apply), honest-AI constraints.
- **Design craft** — a distinctive, accessible, mobile-first system with a signature interaction (WCAG 2.2 AA, Lighthouse 100).
- **Product thinking** — a competitive teardown, a market-reality strategy, and receipts: a live dashboard of real outcomes.
That checklist maps almost one-to-one onto senior front-end / creative-technologist / AI-engineer job descriptions. The app is the interview.
### II.6 The story you tell with it
The people most hurt by AI resume screening are the ones without pedigree, referral networks, or the "right" keywords for experience they genuinely have — career changers, the self-taught, people from industries tech overlooks. You've lived that arc: 12 years in beauty, salon owner, self-taught into full-stack and AI. OYRB was built for professionals the software industry ignored; Talent Radar points the same machinery companies use back in the other direction — for yourself, this time. Whether it ever becomes more than a personal tool is a decision for after the offer letter. The architecture won't stand in the way; nothing in this spec would need a rewrite to serve more users. But that's explicitly not the goal. **The goal is one hire: you.**
---
## 7. External Services & Env Vars
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
ANTHROPIC_API_KEY=                  # agent reasoning
OPENAI_API_KEY=                     # embeddings only (or VOYAGE_API_KEY)
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
APOLLO_API_KEY=                     # or HUNTER_API_KEY
SERPAPI_KEY=
X_BEARER_TOKEN=                     # Pulse: X/Twitter API (basic tier)
REDDIT_CLIENT_ID=                   # Pulse: Reddit API (free)
REDDIT_CLIENT_SECRET=
```
**Monthly cost estimate (job-search phase):** Supabase free tier, Vercel free/Pro, Inngest free tier, Resend free (3k emails/mo), Anthropic API ~$10–30, Apollo free→$49, SerpAPI $50 (or free 100 searches). **Realistic: $30–130/mo.** Cheaper than one month of a resume service, and it compounds.
---
## 8. Claude Code Setup (do this before writing app code)
### `CLAUDE.md` (repo root)
```markdown
# Talent Radar — Claude Code conventions
## Stack
Next.js 15 App Router · TypeScript strict · Tailwind + shadcn/ui ·
Supabase (Postgres/pgvector/RLS) · Inngest · Resend · Anthropic SDK
## Hard rules
- Mobile-first: build every view at 390px before desktop.
- WCAG 2.2 AA: semantic HTML, focus-visible rings, keyboard paths
  for all gestures, contrast ≥ 4.5:1. Lighthouse a11y 100 is a gate.
- All colors/type from tokens in `styles/tokens.css` — never raw hex in components.
- Server Actions for mutations; route handlers only for webhooks.
- Every table has RLS. Never use the service role key in client-reachable code.
- Agents: one Inngest function per file in `inngest/functions/`,
  prompts in `lib/prompts/` as exported template strings.
- No outbound email path may bypass the approval queue. Ever.
- Every agent prompt has an eval file (`evals/{agent}.eval.ts`); no prompt
  change merges without passing evals.
- Store raw source text alongside every embedding — never embedding-only.
- Zod-validate every external API response and every Claude JSON output.
## Commands
pnpm dev · pnpm test · pnpm lint · pnpm typecheck · npx supabase db push
```
### Subagents (`.claude/agents/`)
- `ui-engineer.md` — owns components/design system; instructed to check tokens + a11y on every change, and to screenshot via Playwright MCP and self-critique before presenting.
- `agent-engineer.md` — owns `inngest/` + `lib/prompts/`; writes evals for prompt outputs.
- `db-engineer.md` — owns migrations + RLS policies; must explain security implications of every policy.
- `qa.md` — runs Playwright e2e + axe-core a11y scans; reports, never fixes.
### MCP servers
```bash
claude mcp add supabase   # schema-aware queries + migration help from inside Claude Code
claude mcp add playwright # browser testing + screenshots for UI self-critique
```
(Playwright MCP is how the ui-engineer subagent "sees" its own work — huge for design quality.)
### Hooks (`.claude/settings.json`)
- **PostToolUse (Edit/Write):** `pnpm lint --fix && pnpm typecheck` — catches errors the moment they're written.
- **Stop hook:** run affected tests before Claude declares a task done.
### Custom skill: `voice.md`
Write ~1 page defining your outreach + cover-letter voice: confident, specific, zero filler, always ties to a live shipped build, Atlanta warmth, never begging. Analyst and Envoy prompts both import it. This single file is why every AI draft sounds like Alania Renee instead of ChatGPT.
### Slash commands (`.claude/commands/`)
- `/new-agent {name}` — scaffolds Inngest function + prompt file + eval file.
- `/a11y-audit` — runs axe + Lighthouse on all routes, summarizes failures.
- `/ship` — typecheck, test, lint, build, then summarize what changed for the commit message.
### Other coding agents/systems?
Claude Code is the primary builder. Optionally: **v0.dev** for fast marketing-page drafts (your design eye likely beats it — skip unless rushed), and **GitHub Actions** for CI (lint/test/Lighthouse-CI on every PR). The deployed agents run on the **Anthropic API via Inngest**, not inside Claude Code — be ready to articulate that split in interviews.
---
## 9. Build Roadmap (Claude Code phases)
**Phase 0 — Foundation (day 1)**
Repo init, Next.js 15 + TS + Tailwind, `tokens.css` design system from §2, Supabase project + schema migration + RLS, auth (magic link, single user), CLAUDE.md, subagents, hooks, MCP servers.
**Phase 1 — Resume core + Scout (days 2–4)**
Resume upload/editor with versions → embedding pipeline → Scout Inngest function against 20 hand-picked target companies (Greenhouse/Lever/Ashby) → jobs land in DB with Match Dial scores → mobile job feed with dial cards.
*Milestone: open the app on your phone and see real scored jobs.*
**Phase 2 — Pipeline + Analyst + Gatekeeper (days 5–8)**
Kanban (desktop drag + keyboard; mobile snap-scroll) → Analyst tailoring on qualify → Gatekeeper per-job screen (keyword extraction, exact-match scan, recruiter simulation, parse-risk check) → Screen Room UI with in-place keyword highlighting → job detail page with the dual Match Dial (semantic + ATS rings), tailored bullets, cover letter editor → one-tap "accept edits → new resume version → re-score."
*Milestone: run your current resume through Gatekeeper against the Iowa posting and watch the ATS score before/after edits.*
**Phase 3 — Bridge + Sleuth + Envoy (days 8–11)**
LinkedIn connections export → `network` table import + one-time relationship tagging → Bridge warm-path matching (runs before Sleuth on every shortlisted job) → Apollo/SerpAPI integration → contact cards with confidence scores → Envoy drafting (email + LinkedIn draft-for-paste, intro-ask template) → **swipe-to-approve queue** → Resend sending + sequences + deliverability defense → domain warm-up begins (≤10/day).
*Milestone: first warm intro requested AND first approved cold email sent from your phone.*
*Discipline rule for the whole build: manual applications run in parallel from week 1. If real outreach isn't flowing by end of this phase, cut agents, not deadlines.*
**Phase 4 — Chronicle + Market Scan + PWA polish (days 12–14)**
Inbound reply webhook + classification → push notifications → interview dossiers → Gatekeeper weekly market scan + Market Coverage heatmap → PWA manifest/service worker → full a11y audit → Lighthouse 100 gate → dark/light mode QA.
**Phase 5 — The meta-move (days 15–16)**
Public read-only **metrics dashboard** at `/pulse`: jobs scanned, avg match score, outreach sent, reply rate, interviews booked — live, anonymized. Link it in every outreach email and on halaniadixon.com. Then write the case study post. *(Optional: use your Higgsfield MCP to generate a 30-second demo film of the app for the portfolio.)*
**Phase 5.5 — The expansion agents (week 3+, ship in this order)**
1. **Coach** first — you'll have interviews from Phases 1–4 to prep for, so it pays off immediately. Story bank session, per-job drills, then AI-screen mode and the negotiation dojo before your first offer conversation.
2. **Pulse** second — X + Reddit + HN listeners, Signals feed tab, hiring-momentum scores.
3. **Curator** third — seed `portfolio_items` with your live builds, run the first gap analysis, ship the Portfolio Lab view.
See **Part II** for the market reality this sequencing is built on, the failure modes to watch, and the capability story the finished app tells.
---
## 10. Compliance Guardrails (bake in, don't bolt on)
1. **CAN-SPAM:** real identity, truthful subjects, immediate opt-out honored (Chronicle auto-suppresses), physical address in footer (a P.O. box works).
2. **No LinkedIn automation** — search results via SerpAPI only; DMs stay manual.
3. **Human approval on 100% of outbound email** — architectural rule, not a setting.
4. **Rate limits:** ≤ 10 emails/day weeks 1–2, ≤ 25/day after; max 3 touches per contact, ever.
5. **Data hygiene:** contacts auto-purge 90 days after a pipeline closes.
These aren't just legal cover — "I designed the guardrails" is a great interview answer about engineering judgment.
---
## 11. Success Metrics (the numbers that become your case study)
- Jobs scanned/week · % ≥ 80 match · application-to-contact rate
- **Warm vs cold reply rate** (Bridge's proof) · reply rate by resume version · time-to-response by company tier
- Avg ATS score per application · market keyword coverage % (Gatekeeper) — watch it climb as you accept edits
- Outreach reply rate (benchmark: cold recruiting email ≈ 5–15%; personalized + proof-of-work should beat it)
- Time-to-first-interview vs. your pre-tool baseline
- And the only one that matters: **offers.**
---
*Built by Halania Dixon · Alania Renee · Atlanta, GA — and built in public.*
