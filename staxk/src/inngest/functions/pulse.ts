// 📡 PULSE — social & hiring-signal listener. Cron every 4h.
// Public APIs and indexed content ONLY — never logged-in scraping. Stored as
// links + summaries, source always attributed.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { PULSE_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const batchSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum([
        "hiring_signal",
        "recruiter_activity",
        "layoff_or_freeze",
        "interview_intel",
        "comp_data",
        "noise",
      ]),
      company: z.string().nullable(),
      summary_md: z.string(),
    }),
  ),
});

// HN via Algolia — free, keyless, the always-on source. X/Reddit adapters
// activate when their keys exist (adapter pattern, graceful degradation).
async function fetchHN(): Promise<{ url: string; text: string }[]> {
  const res = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?query=%22hiring%22%20%22front%20end%22&tags=comment&hitsPerPage=15",
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    hits: { objectID: string; comment_text?: string; story_title?: string }[];
  };
  return json.hits
    .filter((h) => h.comment_text)
    .map((h) => ({
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      text: `${h.story_title ?? ""}\n${(h.comment_text ?? "").slice(0, 800)}`,
    }));
}

export const pulseListen = inngest.createFunction(
  { id: "pulse-listen", retries: 1 },
  { cron: "0 */4 * * *" },
  async ({ step }) => {
    const supabase = supabaseAdmin();

    const items = await step.run("fetch-hn", fetchHN);
    if (items.length === 0) return { stored: 0 };

    const classified = await step.run("classify", () =>
      agentJSON({
        system: PULSE_SYSTEM,
        prompt: items.map((i, n) => `[${n}] ${i.text}`).join("\n\n"),
        schema: batchSchema,
        maxTokens: 3000,
      }),
    );

    const stored = await step.run("store", async () => {
      const rows = classified.items
        .map((item, n) => ({ item, source: items[n] }))
        .filter(({ item, source }) => item.kind !== "noise" && source)
        .map(({ item, source }) => ({
          user_id: staxkUserId(),
          source: "hn" as const,
          url: source.url,
          kind: item.kind,
          summary_md: item.summary_md,
        }));
      if (rows.length > 0) await supabase.from("social_signals").insert(rows);
      return rows.length;
    });

    return { stored };
  },
);
