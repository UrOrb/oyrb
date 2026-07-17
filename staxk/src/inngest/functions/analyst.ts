// 🔬 ANALYST — fit & tailoring. Trigger: job.qualified.
// Diffs required skills vs resume → skill_gaps; drafts tailored bullets and
// a 150-word cover letter in the user's voice. Nothing auto-applies.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { ANALYST_SYSTEM } from "@/lib/prompts/agents";
import { resolveJobResume } from "@/lib/resumes";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const analysisSchema = z.object({
  required_skills: z.array(z.string()),
  skill_gaps: z.array(z.string()),
  tailored_bullets_md: z.string(),
  cover_letter_md: z.string(),
});

export const analystRun = inngest.createFunction(
  { id: "analyst-run", retries: 2 },
  { event: "job.qualified" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();

    const { job, resume } = await step.run("load", async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", event.data.jobId)
        .single();
      // Tailor against the resume this job was matched to; fall back to any
      // active resume for legacy jobs saved before jobs.resume_id existed.
      const resume = await resolveJobResume(supabase, job?.resume_id);
      return { job, resume };
    });
    if (!job || !resume) return { skipped: true };

    const analysis = await step.run("analyze", () =>
      agentJSON({
        system: ANALYST_SYSTEM,
        prompt: `JOB DESCRIPTION:\n${job.description_md}\n\nRESUME (${resume.label}):\n${resume.content_md}`,
        schema: analysisSchema,
        maxTokens: 3000,
      }),
    );

    await step.run("save", async () => {
      await supabase
        .from("jobs")
        .update({
          required_skills: analysis.required_skills,
          skill_gaps: analysis.skill_gaps,
          tailored_bullets_md: analysis.tailored_bullets_md,
          cover_letter_md: analysis.cover_letter_md,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await supabase.from("activity_log").insert({
        user_id: staxkUserId(),
        agent: "analyst",
        event: `Tailored bullets for ${job.title} (match ${job.match_score}) · gaps: ${analysis.skill_gaps.join(", ") || "none"}`,
      });
    });

    return { gaps: analysis.skill_gaps };
  },
);
