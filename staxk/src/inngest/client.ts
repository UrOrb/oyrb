import { EventSchemas, Inngest } from "inngest";

// Event map — the nervous system of the ten agents (SPEC §4).
type Events = {
  "job.qualified": { data: { jobId: string } };
  "job.shortlisted": { data: { jobId: string } };
  // Bridge found no warm path → fall through to Sleuth (cold).
  "job.cold_path": { data: { jobId: string } };
  "contact.verified": { data: { contactId: string; jobId: string; pathType: "warm" | "cold" } };
  "outreach.approved": { data: { outreachId: string } };
  "email.inbound": { data: { to: string; from: string; subject: string; text: string } };
  "coach.session.requested": { data: { jobId: string | null; mode: string } };
};

export const inngest = new Inngest({
  id: "staxk",
  schemas: new EventSchemas().fromRecord<Events>(),
});

export async function sendEvent(
  ...args: Parameters<typeof inngest.send>
): Promise<void> {
  await inngest.send(...args);
}
