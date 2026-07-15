-- STAXK — initial schema
-- Talent Radar spec §5 + agent extension tables (Bridge, Pulse, Curator, Coach).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Resumes — versioned, embedded
-- ---------------------------------------------------------------------------
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
  hiring_momentum numeric(4,1),               -- Pulse: posting velocity + social signals
  created_at timestamptz default now()
);

-- Scout's target list (Greenhouse/Lever/Ashby board slugs)
create table target_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company_id uuid references companies,
  board_slug text not null,
  ats text not null check (ats in ('greenhouse','lever','ashby')),
  active boolean default true,
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
  match_score numeric(4,1),                   -- 0.0–100.0 (semantic, Analyst ring)
  ats_score numeric(4,1),                     -- 0.0–100.0 (keyword, Gatekeeper ring)
  skill_gaps text[] default '{}',
  path_type text check (path_type in ('warm','cold')),  -- Bridge verdict
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
  email_confidence numeric(3,2),              -- from verification API; >= 0.85 to proceed
  linkedin_url text,
  personalization_notes_md text,              -- Envoy's hooks: recent posts, launches
  suppressed boolean default false,           -- opt-out list is permanent
  created_at timestamptz default now()
);

create table outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs not null,
  contact_id uuid references contacts not null,
  sequence_step int not null default 1,       -- 1 = intro, 2 = day-3, 3 = day-7
  channel text not null default 'email' check (channel in ('email','linkedin')),
  path_type text check (path_type in ('warm','cold')),
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

-- ---------------------------------------------------------------------------
-- Gatekeeper — one ATS screen report per job × resume version
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Bridge — your own network (LinkedIn export + manual adds)
-- ---------------------------------------------------------------------------
create table network (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  full_name text not null,
  company text,
  title text,
  relationship_tier text check (relationship_tier in ('warm','medium','cold')),
  last_touch date,
  source text,                                -- 'linkedin_export' | 'manual'
  linkedin_url text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Pulse — public hiring signals (links + summaries only, always attributed)
-- ---------------------------------------------------------------------------
create table social_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company_id uuid references companies,
  source text not null,                       -- 'x' | 'reddit' | 'hn' | 'serpapi' | 'rss'
  url text not null,
  kind text check (kind in ('hiring_signal','recruiter_activity','layoff_or_freeze','interview_intel','comp_data','noise')),
  summary_md text,
  detected_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Curator — portfolio inventory + gap briefs
-- ---------------------------------------------------------------------------
create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  url text,
  skills text[] default '{}',
  case_study_url text,
  created_at timestamptz default now()
);

create table portfolio_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  gap_keyword text not null,
  demand_count int,
  brief_md text,
  status text not null default 'suggested'
    check (status in ('suggested','building','shipped','case_study_written')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Coach — practice sessions + story bank
-- ---------------------------------------------------------------------------
create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs,
  mode text not null check (mode in ('drill','full_mock','story_bank','ai_screen','negotiation')),
  transcript_jsonb jsonb,
  scores_jsonb jsonb,
  created_at timestamptz default now()
);

create table star_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  story_md text,
  competencies text[] default '{}',
  created_at timestamptz default now()
);

create table activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  agent text not null,                        -- 'scout' | 'analyst' | 'sleuth' | 'envoy' | 'chronicle' | 'gatekeeper' | 'bridge' | 'pulse' | 'curator' | 'coach'
  event text not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- Match scoring in one query:
-- score = (1 - cosine_distance(job.embedding, resume.embedding)) * 100
create index on jobs using ivfflat (embedding vector_cosine_ops);
create index on jobs (user_id, stage);
create index on outreach (user_id, status);
create index on social_signals (user_id, detected_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table scoped to auth.uid()
-- ---------------------------------------------------------------------------
alter table resumes            enable row level security;
alter table companies          enable row level security;
alter table target_companies   enable row level security;
alter table jobs               enable row level security;
alter table contacts           enable row level security;
alter table outreach           enable row level security;
alter table replies            enable row level security;
alter table screen_reports     enable row level security;
alter table market_signals     enable row level security;
alter table network            enable row level security;
alter table social_signals     enable row level security;
alter table portfolio_items    enable row level security;
alter table portfolio_briefs   enable row level security;
alter table interview_sessions enable row level security;
alter table star_stories       enable row level security;
alter table activity_log       enable row level security;

create policy "own rows" on resumes            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on target_companies   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on jobs               for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on contacts           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on outreach           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on screen_reports     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on market_signals     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on network            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on social_signals     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on portfolio_items    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on portfolio_briefs   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on interview_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on star_stories       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on activity_log       for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- companies is shared reference data but still auth-gated (single user today)
create policy "authenticated read" on companies for select using (auth.uid() is not null);
create policy "authenticated write" on companies for insert with check (auth.uid() is not null);
create policy "authenticated update" on companies for update using (auth.uid() is not null);

-- replies is scoped through its outreach row
create policy "own via outreach" on replies for all
  using (exists (select 1 from outreach o where o.id = outreach_id and o.user_id = auth.uid()))
  with check (exists (select 1 from outreach o where o.id = outreach_id and o.user_id = auth.uid()));
