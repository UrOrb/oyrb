// 🎨 CURATOR — portfolio gap engine. Weekly, after gatekeeper.market.
// Diffs market demand vs portfolio evidence → scoped project briefs.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { CURATOR_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const gapsSchema = z.object({
  gaps: z.array(
    z.object({
      gap_keyword: z.string(),
      demand_count: z.number(),
      brief_md: z.string(),
    }),
  ),
});

export const curatorGap = inngest.createFunction(
  { id: "curator-gap", retries: 1 },
  { cron: "TZ=America/New_York 0 9 * * 1" }, // Monday 9am, after gatekeeper.market (7am)
  async ({ step }) => {
    const supabase = supabaseAdmin();

    const { signals, portfolio } = await step.run("load", async () => {
      const [{ data: signals }, { data: portfolio }] = await Promise.all([
        supabase
          .from("market_signals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("portfolio_items").select("title, url, skills"),
      ]);
      return { signals: signals?.[0] ?? null, portfolio: portfolio ?? [] };
    });
    if (!signals) return { skipped: true };

    const result = await step.run("diff", () =>
      agentJSON({
        system: CURATOR_SYSTEM,
        prompt: `MARKET KEYWORDS THIS WEEK:\n${JSON.stringify(signals.top_keywords)}\n\nPORTFOLIO INVENTORY:\n${JSON.stringify(portfolio)}`,
        schema: gapsSchema,
        maxTokens: 3000,
      }),
    );

    await step.run("save", async () => {
      const userId = staxkUserId();
      if (result.gaps.length > 0) {
        await supabase.from("portfolio_briefs").insert(
          result.gaps.map((g) => ({ user_id: userId, ...g, status: "suggested" })),
        );
      }
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "curator",
        event: `${result.gaps.length} portfolio gap brief(s) suggested — biggest gap: ${result.gaps[0]?.gap_keyword ?? "none"}`,
      });
    });

    return { briefs: result.gaps.length };
  },
);
