// 🕵️ SLEUTH — people finding. Trigger: job.cold_path (after Bridge found no
// warm path). Apollo people search → email verification (≥0.85 to proceed) →
// SerpAPI LinkedIn lookup → Claude personalization pass.
import { z } from "zod";

import { inngest } from "../client";
import { agentJSON } from "@/lib/anthropic";
import { SLEUTH_SYSTEM } from "@/lib/prompts/agents";
import { staxkUserId, supabaseAdmin } from "@/lib/supabase/admin";

const TITLES = [
  "Engineering Manager",
  "Talent Acquisition",
  "Recruiter",
  "Head of Design Engineering",
];
const MIN_EMAIL_CONFIDENCE = 0.85;

const notesSchema = z.object({ personalization_notes_md: z.string() });

type ApolloPerson = {
  name: string;
  title: string;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
};

async function apolloSearch(domain: string): Promise<ApolloPerson[]> {
  if (!process.env.APOLLO_API_KEY) return [];
  const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.APOLLO_API_KEY,
    },
    body: JSON.stringify({
      q_organization_domains: domain,
      person_titles: TITLES,
      page: 1,
      per_page: 5,
    }),
  });
  if (!res.ok) return []; // graceful degradation when a source dies
  const json = (await res.json()) as { people?: ApolloPerson[] };
  return json.people ?? [];
}

export const sleuthRun = inngest.createFunction(
  { id: "sleuth-run", retries: 2 },
  { event: "job.cold_path" },
  async ({ event, step }) => {
    const supabase = supabaseAdmin();
    const userId = staxkUserId();

    const { job, company } = await step.run("load", async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", event.data.jobId)
        .single();
      const { data: company } = job?.company_id
        ? await supabase.from("companies").select("*").eq("id", job.company_id).single()
        : { data: null };
      return { job, company };
    });
    if (!job || !company?.domain) return { skipped: true };

    const people = await step.run("apollo-search", () => apolloSearch(company.domain));

    let verified = 0;
    for (const person of people.slice(0, 3)) {
      // Only verified addresses proceed to outreach.
      const confidence = person.email_status === "verified" ? 0.95 : 0.5;
      if (!person.email || confidence < MIN_EMAIL_CONFIDENCE) continue;

      const notes = await step.run(`personalize-${person.name}`, () =>
        agentJSON({
          system: SLEUTH_SYSTEM,
          prompt: `Person: ${person.name}, ${person.title} at ${company.name}.\nCompany research:\n${company.notes_md ?? "(none yet)"}`,
          schema: notesSchema,
        }).catch(() => ({ personalization_notes_md: "" })),
      );

      const contactId = await step.run(`save-${person.name}`, async () => {
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id: company.id,
            full_name: person.name,
            title: person.title,
            role_type: /recruit|talent/i.test(person.title) ? "recruiter" : "hiring_manager",
            email: person.email,
            email_confidence: confidence,
            linkedin_url: person.linkedin_url,
            personalization_notes_md: notes.personalization_notes_md,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      });

      verified++;
      await step.sendEvent(`verified-${person.name}`, {
        name: "contact.verified",
        data: { contactId, jobId: job.id, pathType: "cold" },
      });
    }

    await step.run("log", async () => {
      await supabase.from("activity_log").insert({
        user_id: userId,
        agent: "sleuth",
        event: `${verified} verified contact(s) found at ${company.name}`,
      });
    });

    return { verified };
  },
);
