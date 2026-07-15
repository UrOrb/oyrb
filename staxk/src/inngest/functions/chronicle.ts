// 📓 CHRONICLE — CRM & follow-through.
// chronicle.reply: classify inbound email → move pipeline → notify.
// chronicle.nightly: flag stale cards.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { CHRONICLE_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const classificationSchema = z.object({
  classification: z.enum(["interested", "not_now", "referral", "rejection", "other"]),
  summary: z.string(),
  suggested_next_step: z.string(),
});

const STAGE_FOR: Record<string, string | null> = {
  interested: "replied",
  referral: "replied",
  not_now: null,
  rejection: "closed",
  other: null,
};

export const chronicleReply = inngest.createFunction(
  { id: "chronicle-reply", retries: 2 },
  { event: "email.inbound" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const outreach = await step.run("match-outreach", async () => {
      // Match by sender address against contacts with sent outreach.
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("email", event.data.from)
        .maybeSingle();
      if (!contact) return null;
      const { data } = await supabase
        .from("outreach")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    });
    if (!outreach) return { matched: false };

    const verdict = await step.run("classify", () =>
      agentJSON({
        system: CHRONICLE_SYSTEM,
        prompt: `Reply from ${event.data.from}:\nSubject: ${event.data.subject}\n\n${event.data.text.slice(0, 4000)}`,
        schema: classificationSchema,
      }),
    );

    await step.run("update-pipeline", async () => {
      await supabase.from("replies").insert({
        outreach_id: outreach.id,
        body_text: event.data.text.slice(0, 10000),
        classification: verdict.classification,
      });
      await supabase.from("outreach").update({ status: "replied" }).eq("id", outreach.id);

      // Opt-out / rejection → permanent suppression (CAN-SPAM guardrail).
      if (
        verdict.classification === "rejection" ||
        /unsubscribe|remove me|stop emailing/i.test(event.data.text)
      ) {
        await supabase
          .from("contacts")
          .update({ suppressed: true })
          .eq("id", outreach.contact_id);
      }

      const nextStage = STAGE_FOR[verdict.classification];
      if (nextStage) {
        await supabase.from("jobs").update({ stage: nextStage }).eq("id", outreach.job_id);
      }
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "chronicle",
        event: `Reply classified: ${verdict.classification} — ${verdict.summary}`,
      });
    });

    return { classification: verdict.classification };
  },
);

export const chronicleNightly = inngest.createFunction(
  { id: "chronicle-nightly", retries: 1 },
  { cron: "TZ=America/New_York 0 22 * * *" },
  async ({ step }) => {
    const supabase = supabaseAdmin();
    const flagged = await step.run("flag-stale", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400_000).toISOString();
      const { data } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("stage", "applied")
        .lt("updated_at", tenDaysAgo);
      for (const job of data ?? []) {
        await supabase.from("activity_log").insert({
          user_id: staxkUserId(),
          agent: "chronicle",
          event: `Stale: "${job.title}" applied 10+ days, no contact found — run Sleuth?`,
        });
      }
      return data?.length ?? 0;
    });
    return { flagged };
  },
);
