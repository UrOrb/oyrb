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

// Reddit via PullPush (public Reddit archive API) — keyless. Reddit itself
// fingerprint-blocks unauthenticated access and gates OAuth app creation
// behind registration approval; PullPush mirrors submissions openly.
// One request per sweep; graceful degradation on any failure.
async function fetchReddit(): Promise<{ url: string; text: string }[]> {
  const res = await fetch(
    "https://api.pullpush.io/reddit/search/submission/?q=%22hiring%22%20%22front%20end%22&size=15&sort=desc&sort_type=created_utc",
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: { permalink?: string; title?: string; selftext?: string }[];
  };
  return (json.data ?? [])
    .filter((p) => p.permalink)
    .map((p) => ({
      url: `https://www.reddit.com${p.permalink}`,
      text: `${p.title ?? ""}\n${(p.selftext ?? "").slice(0, 800)}`,
    }));
}

export const pulseListen = inngest.createFunction(
  { id: "pulse-listen", retries: 1 },
  [{ cron: "0 */4 * * *" }, { event: "pulse.run" }],
  async ({ step }) => {
    const supabase = supabaseAdmin();

    const items = await step.run("fetch-sources", async () => {
      const [hn, reddit] = await Promise.all([fetchHN(), fetchReddit()]);
      return [
        ...hn.map((i) => ({ ...i, source: "hn" as const })),
        ...reddit.map((i) => ({ ...i, source: "reddit" as const })),
      ];
    });
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
          source: source.source,
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
