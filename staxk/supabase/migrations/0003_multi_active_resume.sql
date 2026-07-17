-- 0003 — allow more than one active resume at a time.
--
-- The pipeline used to assume a SINGLE active resume: Scout scored every job
-- against it, and Gatekeeper/Analyst loaded it with `.single()` (which throws
-- the moment two rows are active). That made "run a Technical AND a Creative
-- resume side by side" impossible.
--
-- New model: each job is BOUND to the resume it best matches. Scout scores a
-- posting against every active resume and keeps the winner (highest cosine),
-- storing both the score and which resume won here. Gatekeeper/Analyst then
-- screen and tailor against THAT resume — so a SWE role is judged by the
-- Technical resume and a creative role by the Creative resume, automatically.
--
-- resume_id is nullable so existing jobs (scored before this column existed)
-- keep working; the agents fall back to any active resume when it's null.
alter table jobs
  add column if not exists resume_id uuid references resumes;

create index if not exists jobs_resume_id_idx on jobs (resume_id);
