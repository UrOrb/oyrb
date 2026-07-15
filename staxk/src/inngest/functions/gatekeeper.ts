// 🚪 GATEKEEPER — your own ATS/AI resume screener.
// Mode 1: per-job screen on job.qualified. Mode 2: weekly market scan.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import {
  GATEKEEPER_MARKET_SYSTEM,
  GATEKEEPER_SCREEN_SYSTEM,
} from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const screenSchema = z.object({
  ats_score: z.number(),
  keyword_coverage: z.array(
    z.object({
      keyword: z.string(),
      weight: z.number(),
      status: z.enum(["exact", "variant", "missing"]),
      where_found: z.string().nullable(),
    }),
  ),
  vision_alignment: z.object({
    company_values: z.array(z.string()),
    resume_evidence: z.array(z.string()),
    alignment_score: z.number(),
  }),
  parse_risks: z.array(z.string()),
  recruiter_verdict: z.enum(["advance", "maybe", "reject"]),
  suggested_edits_md: z.string(),
});

export const gatekeeperScreen = inngest.createFunction(
  { id: "gatekeeper-screen", retries: 2 },
  { event: "job.qualified" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();

    const { job, resume, company } = await step.run("load", async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", event.data.jobId)
        .single();
      const { data: resume } = await supabase
        .from("resumes")
        .select("*")
        .eq("is_active", true)
        .single();
      const { data: company } = job?.company_id
        ? await supabase.from("companies").select("*").eq("id", job.company_id).single()
        : { data: null };
      return { job, resume, company };
    });
    if (!job || !resume) return { skipped: true };

    const report = await step.run("screen", () =>
      agentJSON({
        system: GATEKEEPER_SCREEN_SYSTEM,
        prompt: [
          `JOB DESCRIPTION:\n${job.description_md}`,
          company?.notes_md ? `COMPANY VALUES / RESEARCH:\n${company.notes_md}` : "",
          `RESUME (${resume.label}):\n${resume.content_md}`,
        ].join("\n\n"),
        schema: screenSchema,
        maxTokens: 4000,
      }),
    );

    await step.run("save", async () => {
      const userId = staxkUserId();
      await supabase.from("screen_reports").insert({
        user_id: userId,
        job_id: job.id,
        resume_id: resume.id,
        ...report,
      });
      await supabase
        .from("jobs")
        .update({ ats_score: report.ats_score })
        .eq("id", job.id);
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "gatekeeper",
        event: `ATS screen: ${job.title} ${report.ats_score}/100 · verdict ${report.recruiter_verdict}`,
      });
    });

    return { ats_score: report.ats_score, verdict: report.recruiter_verdict };
  },
);

const marketSchema = z.object({
  role_cluster: z.string(),
  top_keywords: z.array(
    z.object({
      keyword: z.string(),
      job_count: z.number(),
      in_resume: z.boolean(),
      trend: z.enum(["rising", "flat", "falling"]),
    }),
  ),
  coverage_pct: z.number(),
});

export const gatekeeperMarket = inngest.createFunction(
  { id: "gatekeeper-market", retries: 2 },
  { cron: "TZ=America/New_York 0 7 * * 1" }, // Monday 7am ET
  async ({ step }) => {
    const supabase = supabaseAdmin();

    const { jobs, resume } = await step.run("load-week", async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ data: jobs }, { data: resume }] = await Promise.all([
        supabase
          .from("jobs")
          .select("title, description_md")
          .gte("created_at", weekAgo),
        supabase.from("resumes").select("content_md").eq("is_active", true).single(),
      ]);
      return { jobs: jobs ?? [], resume };
    });
    if (jobs.length === 0 || !resume) return { skipped: true };

    const scan = await step.run("aggregate", () =>
      agentJSON({
        system: GATEKEEPER_MARKET_SYSTEM,
        prompt: `THIS WEEK'S ${jobs.length} POSTINGS:\n${jobs
          .map((j) => `## ${j.title}\n${(j.description_md ?? "").slice(0, 1500)}`)
          .join("\n\n")}\n\nRESUME:\n${resume.content_md}`,
        schema: marketSchema,
        maxTokens: 3000,
      }),
    );

    await step.run("save", async () => {
      await supabase.from("market_signals").insert({
        user_id: staxkUserId(),
        week_of: new Date().toISOString().slice(0, 10),
        ...scan,
      });
    });

    return { coverage_pct: scan.coverage_pct };
  },
);
