// 🌉 BRIDGE — warm-path & referral mapper. Trigger: job.shortlisted.
// Runs BEFORE Sleuth on every job: warm path first, cold only if none exists.
// Rule: Bridge asks YOUR person for the intro — never messages their contact.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { BRIDGE_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const pathSchema = z.object({
  paths: z.array(
    z.object({
      contact_name: z.string(),
      strength: z.enum(["strong", "medium", "weak"]),
      reason: z.string(),
    }),
  ),
  intro_ask_md: z.string().nullable(),
  forwardable_blurb_md: z.string().nullable(),
});

export const bridgeMap = inngest.createFunction(
  { id: "bridge-map", retries: 2 },
  { event: "job.shortlisted" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const { job, company, network } = await step.run("load", async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", event.data.jobId)
        .single();
      const { data: company } = job?.company_id
        ? await supabase.from("companies").select("*").eq("id", job.company_id).single()
        : { data: null };
      const { data: network } = await supabase
        .from("network")
        .select("full_name, company, title, relationship_tier, last_touch");
      return { job, company, network: network ?? [] };
    });
    if (!job || !company) return { skipped: true };

    // Cheap literal pre-filter, then Claude ranks the survivors.
    const candidates = network.filter((n) =>
      (n.company ?? "").toLowerCase().includes(company.name.toLowerCase().split(" ")[0]),
    );

    if (candidates.length === 0) {
      // No warm path — log it (the warm-vs-cold metric depends on this) and
      // fall through to Sleuth.
      await step.run("mark-cold", async () => {
        await supabase.from("jobs").update({ path_type: "cold" }).eq("id", job.id);
        await supabase.from("activity_log").insert({
          user_id: userId,
          agent: "bridge",
          event: `No warm path to ${company.name} — falling through to Sleuth (cold)`,
        });
      });
      await step.sendEvent("fallthrough-cold", {
        name: "job.cold_path",
        data: { jobId: job.id },
      });
      return { path: "cold" };
    }

    const mapped = await step.run("rank-and-draft", () =>
      agentJSON({
        system: BRIDGE_SYSTEM,
        prompt: `TARGET: ${job.title} at ${company.name}\n\nNETWORK CANDIDATES:\n${JSON.stringify(candidates, null, 2)}`,
        schema: pathSchema,
        maxTokens: 2000,
      }),
    );

    await step.run("save", async () => {
      await supabase.from("jobs").update({ path_type: "warm" }).eq("id", job.id);
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "bridge",
        event: `Warm path to ${company.name} via ${mapped.paths[0]?.contact_name ?? "network"} — intro ask drafted for approval`,
      });
      // The intro ask enters the same approval queue as everything else.
      // It goes to YOUR contact; contact_id refers to a contacts row created
      // for them (upsert by name+company kept simple here).
      if (mapped.intro_ask_md) {
        const { data: contact } = await supabase
          .from("contacts")
          .upsert(
            {
              user_id: userId,
              company_id: company.id,
              full_name: mapped.paths[0].contact_name,
              role_type: "other",
            },
            { onConflict: "id" },
          )
          .select("id")
          .single();
        if (contact) {
          await supabase.from("outreach").insert({
            user_id: userId,
            job_id: job.id,
            contact_id: contact.id,
            channel: "email",
            path_type: "warm",
            subject: `Quick intro ask — ${company.name}`,
            body_md: `${mapped.intro_ask_md}\n\n---\nForwardable blurb:\n${mapped.forwardable_blurb_md ?? ""}`,
            status: "pending_approval",
          });
        }
      }
    });

    return { path: "warm", paths: mapped.paths.length };
  },
);
