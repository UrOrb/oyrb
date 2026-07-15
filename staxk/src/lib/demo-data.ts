// Demo mode seed data — used whenever Supabase env vars are absent, so the
// app is fully explorable with `pnpm dev` and zero configuration.
import type {
  ActivityEvent,
  Company,
  Contact,
  Job,
  Outreach,
  ScreenReport,
  SocialSignal,
} from "./types";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

export const demoCompanies: Company[] = [
  { id: "c1", name: "Figma", domain: "figma.com", ats: "greenhouse", notes_md: "Values: craft, playfulness, inclusive design. Design-engineering org growing.", hiring_momentum: 82 },
  { id: "c2", name: "Linear", domain: "linear.app", ats: "ashby", notes_md: "Values: quality, speed, taste. Small design-engineering team.", hiring_momentum: 74 },
  { id: "c3", name: "Vercel", domain: "vercel.com", ats: "greenhouse", notes_md: "Values: developer experience, iteration velocity.", hiring_momentum: 68 },
  { id: "c4", name: "Mailchimp (Intuit)", domain: "mailchimp.com", ats: "lever", notes_md: "Atlanta HQ. Values: creativity, humor, customer obsession.", hiring_momentum: 55 },
  { id: "c5", name: "Calendly", domain: "calendly.com", ats: "greenhouse", notes_md: "Atlanta HQ. Values: simplicity, accessibility.", hiring_momentum: 61 },
];

export const demoJobs: Job[] = [
  {
    id: "j1", company_id: "c1", title: "Design Engineer, Design Systems",
    location: "Remote (US)", remote: true, salary_min: 149000, salary_max: 198000,
    source: "greenhouse", source_url: "https://boards.greenhouse.io/figma/jobs/demo1",
    description_md: "Build and evolve Figma's design system with React, TypeScript, and a deep care for accessibility (WCAG 2.2). You'll partner with designers to ship polished, performant UI.",
    required_skills: ["React", "TypeScript", "Design Systems", "Accessibility", "CSS Architecture"],
    match_score: 92.4, ats_score: 78, skill_gaps: ["Storybook at scale"], path_type: "warm",
    stage: "qualified", tailored_bullets_md: "- Shipped OYRB, a booking platform with a token-driven design system and WCAG 2.2 AA compliance\n- Built STAXK's Match Dial component library — animated SVG gauges with full keyboard and reduced-motion support",
    cover_letter_md: null, created_at: hoursAgo(5),
  },
  {
    id: "j2", company_id: "c2", title: "Frontend Engineer, Product",
    location: "Remote", remote: true, salary_min: 140000, salary_max: 185000,
    source: "ashby", source_url: "https://jobs.ashbyhq.com/linear/demo2",
    description_md: "Craft-obsessed frontend work on Linear's core product. TypeScript, React, performance budgets, keyboard-first UX.",
    required_skills: ["React", "TypeScript", "Performance", "Keyboard UX"],
    match_score: 88.1, ats_score: 71, skill_gaps: ["Electron"], path_type: "cold",
    stage: "applied", tailored_bullets_md: null, cover_letter_md: null, created_at: hoursAgo(29),
  },
  {
    id: "j3", company_id: "c4", title: "Senior Front-End Engineer",
    location: "Atlanta, GA (hybrid)", remote: false, salary_min: 135000, salary_max: 170000,
    source: "lever", source_url: "https://jobs.lever.co/mailchimp/demo3",
    description_md: "Own customer-facing campaign builder surfaces. React, TypeScript, accessibility, design-system contributions.",
    required_skills: ["React", "TypeScript", "Accessibility", "GraphQL"],
    match_score: 84.7, ats_score: 83, skill_gaps: ["GraphQL"], path_type: "warm",
    stage: "contacted", tailored_bullets_md: null, cover_letter_md: null, created_at: hoursAgo(52),
  },
  {
    id: "j4", company_id: "c3", title: "Creative Technologist, Brand Studio",
    location: "Remote (US)", remote: true, salary_min: 130000, salary_max: 175000,
    source: "greenhouse", source_url: "https://boards.greenhouse.io/vercel/demo4",
    description_md: "Prototype-first role blending motion, WebGL moments, and production Next.js for brand surfaces.",
    required_skills: ["Next.js", "Motion", "TypeScript", "Prototyping"],
    match_score: 90.2, ats_score: 66, skill_gaps: ["WebGL/three.js"], path_type: "cold",
    stage: "replied", tailored_bullets_md: null, cover_letter_md: null, created_at: hoursAgo(76),
  },
  {
    id: "j5", company_id: "c5", title: "UI Engineer, Design Systems",
    location: "Atlanta, GA", remote: true, salary_min: 125000, salary_max: 160000,
    source: "greenhouse", source_url: "https://boards.greenhouse.io/calendly/demo5",
    description_md: "Grow Calendly's component library; champion accessibility across product teams.",
    required_skills: ["React", "TypeScript", "Design Systems", "Accessibility"],
    match_score: 86.9, ats_score: 88, skill_gaps: [], path_type: "warm",
    stage: "interview", tailored_bullets_md: null, cover_letter_md: null, created_at: hoursAgo(120),
  },
  {
    id: "j6", company_id: "c3", title: "Software Engineer, Growth",
    location: "Remote", remote: true, salary_min: null, salary_max: null,
    source: "hn", source_url: "https://news.ycombinator.com/item?id=demo6",
    description_md: "Experimentation-heavy product engineering on signup and onboarding flows.",
    required_skills: ["React", "TypeScript", "A/B testing"],
    match_score: 74.3, ats_score: null, skill_gaps: ["Experimentation platforms"], path_type: null,
    stage: "sourced", tailored_bullets_md: null, cover_letter_md: null, created_at: hoursAgo(3),
  },
];

export const demoContacts: Contact[] = [
  {
    id: "ct1", company_id: "c1", full_name: "Sarah Okafor", title: "Engineering Manager, Design Systems",
    role_type: "hiring_manager", email: "sarah@figma.com", email_confidence: 0.93,
    linkedin_url: "https://linkedin.com/in/demo-sarah",
    personalization_notes_md: "Spoke at Config about token pipelines; posted last week about hiring for craft.",
    created_at: hoursAgo(4),
  },
  {
    id: "ct2", company_id: "c4", full_name: "Devon Price", title: "Senior Technical Recruiter",
    role_type: "recruiter", email: "devon.price@mailchimp.com", email_confidence: 0.88,
    linkedin_url: "https://linkedin.com/in/demo-devon",
    personalization_notes_md: "Atlanta tech meetup organizer; recently shared the campaign-builder redesign case study.",
    created_at: hoursAgo(50),
  },
  {
    id: "ct3", company_id: "c5", full_name: "Mia Tran", title: "Head of Design Engineering",
    role_type: "hiring_manager", email: "mia.tran@calendly.com", email_confidence: 0.9,
    linkedin_url: "https://linkedin.com/in/demo-mia",
    personalization_notes_md: "Wrote the Calendly a11y annual report; keynoted A11yATL.",
    created_at: hoursAgo(110),
  },
];

export const demoOutreach: Outreach[] = [
  {
    id: "o1", job_id: "j1", contact_id: "ct1", sequence_step: 1, channel: "email", path_type: "warm",
    subject: "Design systems + a live proof",
    body_md: "Hi Sarah — your Config talk on token pipelines mirrored a problem I just shipped through: OYRB runs a token-driven system with WCAG 2.2 AA as a launch gate, not a backlog item.\n\nI build design-system tooling in React/TypeScript and I'd love 15 minutes to show you STAXK, the instrument I built to run my own search.\n\nWorth a quick chat this week?\n\n— Halania Dixon",
    status: "pending_approval", scheduled_for: null, sent_at: null, created_at: hoursAgo(2),
  },
  {
    id: "o2", job_id: "j3", contact_id: "ct2", sequence_step: 1, channel: "email", path_type: "warm",
    subject: "Atlanta front-end, shipped receipts",
    body_md: "Hi Devon — saw the campaign-builder case study you shared; the accessibility notes stood out.\n\nI'm an Atlanta front-end engineer (React/TypeScript) with live builds: oyrb.space and the tool that wrote this pipeline. The senior FE role looks like a strong mutual fit.\n\nOpen to 15 minutes?\n\n— Halania Dixon",
    status: "pending_approval", scheduled_for: null, sent_at: null, created_at: hoursAgo(1),
  },
  {
    id: "o3", job_id: "j5", contact_id: "ct3", sequence_step: 1, channel: "linkedin", path_type: "warm",
    subject: null,
    body_md: "Hi Mia — your A11yATL keynote convinced me to make Lighthouse 100 a launch gate on my own builds. I'm interviewing for the UI Engineer role and would love to connect. — Halania",
    status: "pending_approval", scheduled_for: null, sent_at: null, created_at: hoursAgo(1),
  },
  {
    id: "o4", job_id: "j2", contact_id: "ct1", sequence_step: 1, channel: "email", path_type: "cold",
    subject: "Keyboard-first UX, shipped",
    body_md: "Hi — Linear's keyboard-first bar is the one I hold my own work to. My kanban ships full arrow-key + space pickup navigation, WCAG 2.2 AA.\n\nProof: oyrb.space. 15 minutes sometime?\n\n— Halania Dixon",
    status: "sent", scheduled_for: null, sent_at: hoursAgo(30), created_at: hoursAgo(31),
  },
];

export const demoSignals: SocialSignal[] = [
  {
    id: "s1", company_id: "c1", source: "x", url: "https://x.com/demo/1",
    kind: "hiring_signal",
    summary_md: "Eng manager at Figma posted 2h ago that her design-systems team is hiring a UI engineer. No job posting exists yet.",
    detected_at: hoursAgo(2),
  },
  {
    id: "s2", company_id: "c2", source: "hn", url: "https://news.ycombinator.com/item?id=demo-s2",
    kind: "interview_intel",
    summary_md: "HN thread: Linear's frontend loop is a paid 2-day work sample — component polish + performance pass, no leetcode.",
    detected_at: hoursAgo(9),
  },
  {
    id: "s3", company_id: "c4", source: "reddit", url: "https://reddit.com/r/cscareerquestions/demo-s3",
    kind: "comp_data",
    summary_md: "r/cscareerquestions: Mailchimp Atlanta senior FE offers reported at $150–165k base + Intuit RSUs.",
    detected_at: hoursAgo(20),
  },
  {
    id: "s4", company_id: "c3", source: "rss", url: "https://vercel.com/blog/demo-s4",
    kind: "hiring_signal",
    summary_md: "Vercel engineering blog: \"our brand studio is growing\" — leading indicator, 3 open roles expected.",
    detected_at: hoursAgo(26),
  },
];

export const demoActivity: ActivityEvent[] = [
  { id: 1, agent: "scout", event: "Scanned 20 boards · 14 new postings · 3 qualified (≥80)", created_at: hoursAgo(3) },
  { id: 2, agent: "analyst", event: "Tailored bullets for Design Engineer @ Figma (match 92.4)", created_at: hoursAgo(3) },
  { id: 3, agent: "bridge", event: "Warm path found to Figma via Amara J. (past client)", created_at: hoursAgo(2) },
  { id: 4, agent: "gatekeeper", event: "ATS screen: Figma 78/100 · verdict maybe · 2 keyword variants flagged", created_at: hoursAgo(2) },
  { id: 5, agent: "envoy", event: "3 drafts queued for approval — nothing sends without your tap", created_at: hoursAgo(1) },
  { id: 6, agent: "chronicle", event: "Reply from Vercel classified: interested → stage moved to Replied", created_at: hoursAgo(1) },
];

export const demoScreenReports: ScreenReport[] = [
  {
    id: "sr1", job_id: "j1", ats_score: 78,
    keyword_coverage: [
      { keyword: "React", weight: 3, status: "exact", where_found: "Skills, OYRB case study" },
      { keyword: "TypeScript", weight: 3, status: "exact", where_found: "Skills, every project bullet" },
      { keyword: "Design Systems", weight: 3, status: "variant", where_found: "\"component library\" — rewrite to the market's phrase" },
      { keyword: "Accessibility", weight: 2, status: "exact", where_found: "WCAG 2.2 AA line" },
      { keyword: "Storybook", weight: 1, status: "missing", where_found: null },
    ],
    parse_risks: ["Two-column header may scramble in older ATS parsers"],
    recruiter_verdict: "maybe",
    suggested_edits_md: "Replace \"component library\" with \"design system\" in the OYRB bullet — it is the literal string screens match on, and it is true of your work.",
  },
];

export const demoResume = {
  label: "Front-End UI v3",
  skills: ["React", "TypeScript", "Next.js", "Tailwind", "Accessibility", "Supabase", "AI agents"],
  coverage_pct: 71.4,
};
