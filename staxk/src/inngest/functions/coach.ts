// 🎤 COACH — interview trainer. On-demand (event), never scheduled.
// Assembles a per-job question bank from the JD's competencies, the
// company's values (Gatekeeper's research), and Pulse's interview intel.
// Drill/mock/story-bank/AI-screen/negotiation modes run interactively in the
// UI; this function pre-builds the question bank for a session.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { COACH_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const bankSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      competency: z.string(),
      kind: z.enum(["behavioral", "technical", "portfolio", "values"]),
    }),
  ),
});

export const coachSession = inngest.createFunction(
  { id: "coach-session", retries: 1 },
  { event: "coach.session.requested" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();

    const context = await step.run("load", async () => {
      if (!event.data.jobId) return { job: null, company: null, intel: [] };
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", event.data.jobId)
        .single();
      const { data: company } = job?.company_id
        ? await supabase.from("companies").select("*").eq("id", job.company_id).single()
        : { data: null };
      const { data: intel } = await supabase
        .from("social_signals")
        .select("summary_md")
        .eq("kind", "interview_intel")
        .limit(5);
      return { job, company, intel: intel ?? [] };
    });

    const bank = await step.run("build-bank", () =>
      agentJSON({
        system: COACH_SYSTEM,
        prompt: `MODE: ${event.data.mode}\nJOB:\n${context.job?.description_md ?? "General front-end practice"}\nCOMPANY VALUES:\n${context.company?.notes_md ?? "(unknown)"}\nINTERVIEW INTEL:\n${context.intel.map((i) => i.summary_md).join("\n")}\n\nGenerate a 12-question bank.`,
        schema: bankSchema,
        maxTokens: 3000,
      }),
    );

    await step.run("save-session", async () => {
      await supabase.from("interview_sessions").insert({
        user_id: staxkUserId(),
        job_id: event.data.jobId,
        mode: event.data.mode,
        transcript_jsonb: { question_bank: bank.questions },
      });
    });

    return { questions: bank.questions.length };
  },
);
