"use server";

// User-initiated mutations — Server Actions only (SPEC §4).
// HARD RULE: no outbound email path may bypass the approval queue. Sending
// happens exclusively in the Envoy Inngest function, triggered by the
// `outreach.approved` event that only approveOutreach() can emit.
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { demoMode, setJobStage, setOutreachStatus } from "./data";
import { sendEvent } from "@/inngest/client";
import type { Stage } from "./types";

const idSchema = z.string().min(1).max(64);

export async function approveOutreach(id: string): Promise<void> {
  const outreachId = idSchema.parse(id);
  await setOutreachStatus(outreachId, "approved");
  if (!demoMode()) {
    // Envoy picks this up and sends via Resend, then sleeps for follow-ups.
    await sendEvent({ name: "outreach.approved", data: { outreachId } });
  }
  revalidatePath("/approvals");
  revalidatePath("/");
}

export async function skipOutreach(id: string): Promise<void> {
  const outreachId = idSchema.parse(id);
  await setOutreachStatus(outreachId, "skipped");
  revalidatePath("/approvals");
  revalidatePath("/");
}

const stageSchema = z.enum([
  "sourced",
  "qualified",
  "applied",
  "contacted",
  "replied",
  "interview",
  "offer",
  "closed",
]);

export async function moveJobStage(jobId: string, stage: Stage): Promise<void> {
  const id = idSchema.parse(jobId);
  const next: Stage = stageSchema.parse(stage);
  await setJobStage(id, next);
  if (!demoMode() && next === "applied") {
    // Shortlisting a job triggers Bridge first (warm path), then Sleuth.
    await sendEvent({ name: "job.shortlisted", data: { jobId: id } });
  }
  revalidatePath("/pipeline");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/");
}
