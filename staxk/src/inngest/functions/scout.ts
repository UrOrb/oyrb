// 🛰 SCOUT — job sourcing. Cron 6am + 2pm ET, or on demand via `scout.run`.
// fetch → dedupe on source_url → keyword filter → embed → cosine score vs
// active resume → score ≥ QUALIFY_THRESHOLD → stage `qualified` → fire
// job.qualified.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { cosineScore, embed } from "@/lib/embeddings";
import { SCOUT_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const KEYWORDS = /front.?end|ui engineer|creative technolog|design engineer|design system/i;
// Embedding cosine between a resume and a JD realistically peaks ~50–60
// with text-embedding-3-small; 50 marks a genuinely strong match.
const QUALIFY_THRESHOLD = 50;

// Greenhouse ships HTML-escaped descriptions — decode + strip so keyword
// filtering and embeddings see prose, not markup.
function stripHtml(escaped: string): string {
  return escaped
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
      content: stripHtml(j.content ?? ""),
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
  [{ cron: "TZ=America/New_York 0 6,14 * * *" }, { event: "scout.run" }],
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

    // Load EVERY active resume — a job is scored against each and bound to the
    // one it matches best. This is what lets Technical and Creative resumes run
    // side by side without the old single-active assumption.
    const resumes = await step.run("load-active-resumes", async () => {
      const { data } = await supabase
        .from("resumes")
        .select("id, embedding, content_md")
        .eq("is_active", true);
      return data ?? [];
    });
    const activeResumes = resumes
      .map((r: { id: string; embedding: unknown }) => ({
        id: r.id,
        embedding: (typeof r.embedding === "string"
          ? JSON.parse(r.embedding)
          : r.embedding) as number[] | null,
      }))
      .filter(
        (r): r is { id: string; embedding: number[] } =>
          Array.isArray(r.embedding) && r.embedding.length > 0,
      );
    if (activeResumes.length === 0) {
      logger.warn("No active embedded resume — skipping scan.");
      return { scanned: 0, qualified: 0 };
    }

    let scanned = 0;
    let qualified = 0;

    for (const target of targets) {
      const postings = await step.run(`fetch-${target.ats}-${target.board_slug}`, async () => {
        const all = (await adapters[target.ats]?.(target.board_slug)) ?? [];
        // Filter + trim INSIDE the step — large boards (Stripe: 500+ full
        // descriptions) exceed Inngest's step output size limit otherwise.
        return all
          .filter((p) => KEYWORDS.test(`${p.title} ${p.content.slice(0, 500)}`))
          .map((p) => ({ ...p, content: p.content.slice(0, 8000) }));
      });

      for (const posting of postings) {
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
          // Score against every active resume; bind the job to the best fit.
          let bestResumeId = activeResumes[0].id;
          let score = cosineScore(embedding, activeResumes[0].embedding);
          for (const r of activeResumes.slice(1)) {
            const s = cosineScore(embedding, r.embedding);
            if (s > score) {
              score = s;
              bestResumeId = r.id;
            }
          }
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
              resume_id: bestResumeId,
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
