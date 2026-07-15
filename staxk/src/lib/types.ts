export type Stage =
  | "sourced"
  | "qualified"
  | "applied"
  | "contacted"
  | "replied"
  | "interview"
  | "offer"
  | "closed";

export const STAGES: Stage[] = [
  "sourced",
  "qualified",
  "applied",
  "contacted",
  "replied",
  "interview",
  "offer",
];

export type PathType = "warm" | "cold";

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  ats: "greenhouse" | "lever" | "ashby" | "other" | null;
  notes_md: string | null;
  hiring_momentum: number | null;
}

export interface Job {
  id: string;
  company_id: string | null;
  company?: Company | null;
  title: string;
  location: string | null;
  remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  source: string;
  source_url: string | null;
  description_md: string | null;
  required_skills: string[];
  match_score: number | null; // semantic ring (Analyst)
  ats_score: number | null; // keyword ring (Gatekeeper)
  skill_gaps: string[];
  path_type: PathType | null; // Bridge verdict
  stage: Stage;
  tailored_bullets_md: string | null;
  cover_letter_md: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  company?: Company | null;
  full_name: string;
  title: string | null;
  role_type: "hiring_manager" | "recruiter" | "ta" | "engineer" | "other" | null;
  email: string | null;
  email_confidence: number | null;
  linkedin_url: string | null;
  personalization_notes_md: string | null;
  created_at: string;
}

export type OutreachStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "replied"
  | "bounced"
  | "skipped";

export interface Outreach {
  id: string;
  job_id: string;
  contact_id: string;
  job?: Job | null;
  contact?: Contact | null;
  sequence_step: number; // 1 intro · 2 day-3 · 3 day-7
  channel: "email" | "linkedin";
  path_type: PathType | null;
  subject: string | null;
  body_md: string | null;
  status: OutreachStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface SocialSignal {
  id: string;
  company_id: string | null;
  company?: Company | null;
  source: "x" | "reddit" | "hn" | "serpapi" | "rss";
  url: string;
  kind:
    | "hiring_signal"
    | "recruiter_activity"
    | "layoff_or_freeze"
    | "interview_intel"
    | "comp_data"
    | "noise";
  summary_md: string;
  detected_at: string;
}

export interface ActivityEvent {
  id: number;
  agent:
    | "scout"
    | "analyst"
    | "sleuth"
    | "envoy"
    | "chronicle"
    | "gatekeeper"
    | "bridge"
    | "pulse"
    | "curator"
    | "coach";
  event: string;
  created_at: string;
}

export interface KeywordCoverage {
  keyword: string;
  weight: number;
  status: "exact" | "variant" | "missing";
  where_found: string | null;
}

export interface ScreenReport {
  id: string;
  job_id: string;
  ats_score: number;
  keyword_coverage: KeywordCoverage[];
  parse_risks: string[];
  recruiter_verdict: "advance" | "maybe" | "reject";
  suggested_edits_md: string;
}

export interface PipelineSummary {
  stage: Stage;
  count: number;
}
