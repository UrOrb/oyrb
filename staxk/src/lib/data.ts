// Data access layer.
// With Supabase configured → real queries (RLS-scoped).
// Without → demo mode: seeded, in-memory, resets on server restart.
// Server-side only — imported from Server Components and Server Actions.
import {
  demoActivity,
  demoCompanies,
  demoContacts,
  demoJobs,
  demoOutreach,
  demoResume,
  demoScreenReports,
  demoSignals,
} from "./demo-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "./supabase/server";
import type {
  ActivityEvent,
  Contact,
  Job,
  Outreach,
  OutreachStatus,
  PipelineSummary,
  ScreenReport,
  SocialSignal,
  Stage,
} from "./types";
import { STAGES } from "./types";

export const demoMode = () => !isSupabaseConfigured();

// --- demo in-memory store (mutable so approvals/stage moves work in dev) ---
type DemoStore = { jobs: Job[]; outreach: Outreach[] };
const g = globalThis as unknown as { __staxkDemo?: DemoStore };
function store(): DemoStore {
  g.__staxkDemo ??= {
    jobs: structuredClone(demoJobs),
    outreach: structuredClone(demoOutreach),
  };
  return g.__staxkDemo;
}

function withCompany<T extends { company_id: string | null }>(row: T) {
  return {
    ...row,
    company: demoCompanies.find((c) => c.id === row.company_id) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function getJobs(): Promise<Job[]> {
  if (demoMode()) {
    return store()
      .jobs.map(withCompany)
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .order("match_score", { ascending: false });
  if (error) throw error;
  return data as Job[];
}

export async function getJob(id: string): Promise<Job | null> {
  if (demoMode()) {
    const job = store().jobs.find((j) => j.id === id);
    return job ? withCompany(job) : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", id)
    .single();
  return (data as Job) ?? null;
}

export async function setJobStage(id: string, stage: Stage): Promise<void> {
  if (demoMode()) {
    const job = store().jobs.find((j) => j.id === id);
    if (job) job.stage = stage;
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("jobs")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getPipelineSummary(): Promise<PipelineSummary[]> {
  const jobs = await getJobs();
  return STAGES.map((stage) => ({
    stage,
    count: jobs.filter((j) => j.stage === stage).length,
  }));
}

// ---------------------------------------------------------------------------
// Outreach / approval queue
// ---------------------------------------------------------------------------
export async function getOutreach(status?: OutreachStatus): Promise<Outreach[]> {
  if (demoMode()) {
    const all = store().outreach.map((o) => ({
      ...o,
      job: withCompany(store().jobs.find((j) => j.id === o.job_id)!) ?? null,
      contact: demoContacts.find((c) => c.id === o.contact_id) ?? null,
    }));
    return status ? all.filter((o) => o.status === status) : all;
  }
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("outreach")
    .select("*, job:jobs(*, company:companies(*)), contact:contacts(*)")
    .order("created_at", { ascending: true });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as Outreach[];
}

export async function setOutreachStatus(
  id: string,
  status: OutreachStatus,
): Promise<void> {
  if (demoMode()) {
    const o = store().outreach.find((x) => x.id === id);
    if (o) {
      o.status = status;
      if (status === "sent") o.sent_at = new Date().toISOString();
    }
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("outreach").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Contacts / signals / activity / reports
// ---------------------------------------------------------------------------
export async function getContacts(): Promise<Contact[]> {
  if (demoMode()) {
    return demoContacts.map((c) => ({
      ...c,
      company: demoCompanies.find((co) => co.id === c.company_id) ?? null,
    }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Contact[];
}

export async function getSignals(): Promise<SocialSignal[]> {
  if (demoMode()) {
    return demoSignals.map((s) => ({
      ...s,
      company: demoCompanies.find((c) => c.id === s.company_id) ?? null,
    }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("social_signals")
    .select("*, company:companies(*)")
    .order("detected_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as SocialSignal[];
}

export async function getActivity(): Promise<ActivityEvent[]> {
  if (demoMode()) return [...demoActivity].reverse();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, agent, event, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as ActivityEvent[];
}

export async function getScreenReport(jobId: string): Promise<ScreenReport | null> {
  if (demoMode()) {
    return demoScreenReports.find((r) => r.job_id === jobId) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("screen_reports")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ScreenReport) ?? null;
}

export async function getActiveResume() {
  // Demo: static. Real mode would select from `resumes where is_active`.
  return demoResume;
}
