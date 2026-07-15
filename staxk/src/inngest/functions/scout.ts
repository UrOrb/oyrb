// 🛰 SCOUT — job sourcing. Cron 6am + 2pm ET.
// fetch → dedupe on source_url → keyword filter → embed → cosine score vs
// active resume → score ≥ 80 → stage `qualified` → fire job.qualified.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { cosineScore, embed } from "@/lib/embeddings";
import { SCOUT_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const KEYWORDS = /front.?end|ui engineer|creative technolog|design engineer|design system/i;
const QUALIFY_THRESHOLD = 80;

const normalizedSchema = z.object({
  title: z.string(),
  skills: z.array(z.string()),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  remote: z.boolean(),
  location: z.string().nullable(),
});

type RawPosting = { title: string; url: string; content: string; location: string };

// Adapter pattern per source (Failure mode #4) — one fetcher per ATS,
// each degrades gracefully when a board 404s or an API changes.
const adapters: Record<string, (slug: string) => Promise<RawPosting[]>> = {
  greenhouse: async (slug) => {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      jobs?: { title: string; absolute_url: string; content: string; location?: { name: string } }[];
    };
    return (json.jobs ?? []).map((j) => ({
      title: j.title,
      url: j.absolute_url,
      content: j.content ?? "",
      location: j.location?.name ?? "",
    }));
  },
  lever: async (slug) => {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      text: string; hostedUrl: string; descriptionPlain?: string;
      categories?: { location?: string };
    }[];
    return json.map((j) => ({
      title: j.text,
      url: j.hostedUrl,
      content: j.descriptionPlain ?? "",
      location: j.categories?.location ?? "",
    }));
  },
  ashby: async (slug) => {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      jobs?: { title: string; jobUrl: string; descriptionPlain?: string; location?: string }[];
    };
    return (json.jobs ?? []).map((j) => ({
      title: j.title,
      url: j.jobUrl,
      content: j.descriptionPlain ?? "",
      location: j.location ?? "",
    }));
  },
};

export const scoutRun = inngest.createFunction(
  { id: "scout-run", retries: 3 },
  { cron: "TZ=America/New_York 0 6,14 * * *" },
  async ({ step, logger }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const targets = await step.run("load-targets", async () => {
      const { data } = await supabase
        .from("target_companies")
        .select("board_slug, ats, company_id")
        .eq("active", true);
      return data ?? [];
    });

    const resume = await step.run("load-active-resume", async () => {
      const { data } = await supabase
        .from("resumes")
        .select("id, embedding, content_md")
        .eq("is_active", true)
        .single();
      return data;
    });
    if (!resume?.embedding) {
      logger.warn("No active embedded resume — skipping scan.");
      return { scanned: 0, qualified: 0 };
    }
    const resumeEmbedding: number[] =
      typeof resume.embedding === "string"
        ? JSON.parse(resume.embedding)
        : resume.embedding;

    let scanned = 0;
    let qualified = 0;

    for (const target of targets) {
      const postings = await step.run(`fetch-${target.ats}-${target.board_slug}`, () =>
        adapters[target.ats]?.(target.board_slug) ?? Promise.resolve([]),
      );

      for (const posting of postings) {
        if (!KEYWORDS.test(`${posting.title} ${posting.content.slice(0, 500)}`)) continue;
        scanned++;

        const result = await step.run(`ingest-${posting.url.slice(-40)}`, async () => {
          // Dedupe on source_url.
          const { data: existing } = await supabase
            .from("jobs")
            .select("id")
            .eq("source_url", posting.url)
            .maybeSingle();
          if (existing) return null;

          const normalized = await agentJSON({
            system: SCOUT_SYSTEM,
            prompt: `Title: ${posting.title}\nLocation: ${posting.location}\n\n${posting.content.slice(0, 6000)}`,
            schema: normalizedSchema,
          });

          const embedding = await embed(posting.content);
          const score = cosineScore(embedding, resumeEmbedding);
          const stage = score >= QUALIFY_THRESHOLD ? "qualified" : "sourced";

          const { data: job, error } = await supabase
            .from("jobs")
            .insert({
              user_id: userId,
              company_id: target.company_id,
              title: normalized.title,
              location: normalized.location ?? posting.location,
              remote: normalized.remote,
              salary_min: normalized.salary_min,
              salary_max: normalized.salary_max,
              source: target.ats,
              source_url: posting.url,
              description_md: posting.content, // raw text stored alongside embedding, always
              required_skills: normalized.skills,
              embedding,
              match_score: score,
              stage,
            })
            .select("id, stage")
            .single();
          if (error) throw error;
          return job;
        });

        if (result?.stage === "qualified") {
          qualified++;
          await step.sendEvent("fire-qualified", {
            name: "job.qualified",
            data: { jobId: result.id },
          });
        }
      }
    }

    await step.run("log-activity", async () => {
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "scout",
        event: `Scanned ${targets.length} boards · ${scanned} relevant postings · ${qualified} qualified (≥${QUALIFY_THRESHOLD})`,
      });
    });

    return { scanned, qualified };
  },
);
