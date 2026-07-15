// ✉️ ENVOY — outreach. Human-in-the-loop, ALWAYS.
// envoy.draft: contact.verified → draft → status pending_approval.
// envoy.send: outreach.approved → send via Resend → sleep 3d → follow-up
// draft (also approval-gated) → sleep 4d → graceful-close draft.
// THE RULE: this file contains the ONLY call to Resend's send API in the
// codebase, and it refuses anything not explicitly `approved`.
import { Resend } from "resend";
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { ENVOY_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const FROM = process.env.OUTREACH_FROM ?? "Halania Dixon <hello@alaniarenee.dev>";
const DAILY_CAP = Number(process.env.MAX_EMAILS_PER_DAY ?? 10);
const MAX_TOUCHES = Number(process.env.MAX_TOUCHES_PER_CONTACT ?? 3);

const draftSchema = z.object({ subject: z.string(), body_md: z.string() });

export const envoyDraft = inngest.createFunction(
  { id: "envoy-draft", retries: 2 },
  { event: "contact.verified" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const { job, contact } = await step.run("load", async () => {
      const [{ data: job }, { data: contact }] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", event.data.jobId).single(),
        supabase.from("contacts").select("*").eq("id", event.data.contactId).single(),
      ]);
      return { job, contact };
    });
    if (!job || !contact || contact.suppressed) return { skipped: true };

    for (const channel of ["email", "linkedin"] as const) {
      const draft = await step.run(`draft-${channel}`, () =>
        agentJSON({
          system: ENVOY_SYSTEM,
          prompt: `CHANNEL: ${channel}\nJOB: ${job.title}\nCONTACT: ${contact.full_name}, ${contact.title}\nPERSONALIZATION NOTES:\n${contact.personalization_notes_md ?? "(none)"}\n\nTAILORED BULLETS:\n${job.tailored_bullets_md ?? ""}`,
          schema: draftSchema,
        }),
      );
      await step.run(`queue-${channel}`, async () => {
        await supabase.from("outreach").insert({
          user_id: userId,
          job_id: job.id,
          contact_id: contact.id,
          channel,
          path_type: event.data.pathType,
          sequence_step: 1,
          subject: channel === "email" ? draft.subject : null,
          body_md: draft.body_md,
          status: "pending_approval",
        });
      });
    }

    await step.run("log", async () => {
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "envoy",
        event: `Drafts queued for ${contact.full_name} — nothing sends without your tap`,
      });
    });

    return { drafted: 2 };
  },
);

export const envoySend = inngest.createFunction(
  { id: "envoy-send", retries: 3 },
  { event: "outreach.approved" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const outreach = await step.run("load-and-guard", async () => {
      const { data } = await supabase
        .from("outreach")
        .select("*, contact:contacts(*)")
        .eq("id", event.data.outreachId)
        .single();
      // THE APPROVAL GATE — architectural rule, not a setting.
      if (!data || data.status !== "approved") return null;
      if (data.channel !== "email") return null; // LinkedIn is copy-paste only
      if (!data.contact?.email || data.contact.suppressed) return null;

      // Rate limits: daily cap + max touches per contact, ever.
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: sentToday }, { count: touches }] = await Promise.all([
        supabase
          .from("outreach")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("sent_at", `${today}T00:00:00Z`),
        supabase
          .from("outreach")
          .select("id", { count: "exact", head: true })
          .eq("contact_id", data.contact_id)
          .in("status", ["sent", "replied"]),
      ]);
      if ((sentToday ?? 0) >= DAILY_CAP) {
        throw new Error(`Daily send cap (${DAILY_CAP}) reached — retry tomorrow.`);
      }
      if ((touches ?? 0) >= MAX_TOUCHES) return null;
      return data;
    });
    if (!outreach) return { sent: false };

    const resendId = await step.run("send", async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Plain text, no tracking, no HTML — deliverability defense (SPEC §6).
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: outreach.contact.email,
        subject: outreach.subject ?? "",
        text: `${outreach.body_md}\n\n--\nHalania Dixon · Atlanta, GA\nReply "unsubscribe" and you will never hear from me again.\n${process.env.PHYSICAL_ADDRESS ?? ""}`,
      });
      if (error) throw error;
      return data?.id ?? null;
    });

    await step.run("mark-sent", async () => {
      await supabase
        .from("outreach")
        .update({ status: "sent", sent_at: new Date().toISOString(), resend_id: resendId })
        .eq("id", outreach.id);
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "envoy",
        event: `Sent step ${outreach.sequence_step} to ${outreach.contact.full_name}`,
      });
    });

    // Follow-up cadence — each follow-up is DRAFTED and re-enters the
    // approval queue; a reply cancels the sequence.
    if (outreach.sequence_step < 3) {
      await step.sleep("wait-follow-up", outreach.sequence_step === 1 ? "3d" : "4d");

      const replied = await step.run("check-reply", async () => {
        const { count } = await supabase
          .from("replies")
          .select("id", { count: "exact", head: true })
          .eq("outreach_id", outreach.id);
        return (count ?? 0) > 0;
      });
      if (replied) return { sent: true, sequenceCancelled: true };

      await step.run("draft-follow-up", async () => {
        const draft = await agentJSON({
          system: ENVOY_SYSTEM,
          prompt: `Draft follow-up #${outreach.sequence_step} (${
            outreach.sequence_step === 1
              ? "new angle: mention the public metrics dashboard — a link is allowed now"
              : "graceful close, zero pressure"
          }) to this earlier email:\nSubject: ${outreach.subject}\n${outreach.body_md}`,
          schema: draftSchema,
        });
        await supabase.from("outreach").insert({
          user_id: userId,
          job_id: outreach.job_id,
          contact_id: outreach.contact_id,
          channel: "email",
          path_type: outreach.path_type,
          sequence_step: outreach.sequence_step + 1,
          subject: draft.subject,
          body_md: draft.body_md,
          status: "pending_approval",
        });
      });
    }

    return { sent: true };
  },
);
