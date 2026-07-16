import type { Metadata } from "next";

import { signOut } from "@/app/login/actions";
import { PageHeader } from "@/components/page-header";
import { demoMode } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

const services = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase (data, auth, RLS)" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic (agent reasoning)" },
  { key: "OPENAI_API_KEY", label: "Embeddings (OpenAI or Voyage)" },
  { key: "RESEND_API_KEY", label: "Resend (outbound + inbound email)" },
  { key: "INNGEST_EVENT_KEY", label: "Inngest (agent runtime)" },
  { key: "APOLLO_API_KEY", label: "Apollo (people + email verification)" },
  { key: "SERPAPI_KEY", label: "SerpAPI (public search results)" },
] as const;

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" sub={demoMode() ? "Demo mode" : "Live"} />
      <div className="flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
        <section
          aria-labelledby="services-h"
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <h2 id="services-h" className="font-display text-xl font-semibold">
            Connected services
          </h2>
          <p className="mt-1 text-sm text-muted">
            Configure in <code className="font-mono text-xs">.env.local</code>{" "}
            (see <code className="font-mono text-xs">.env.example</code>).
            Without Supabase, STAXK runs on seeded demo data.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {services.map((s) => {
              const set = Boolean(process.env[s.key]);
              return (
                <li key={s.key} className="flex items-center justify-between py-2">
                  <span className="text-sm">{s.label}</span>
                  <span
                    className={`font-mono text-xs ${set ? "text-signal" : "text-muted"}`}
                  >
                    {set ? "● connected" : "○ not set"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby="guardrails-h"
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <h2 id="guardrails-h" className="font-display text-xl font-semibold">
            Guardrails (architectural, not optional)
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>100% of outbound email passes the approval queue — no bypass path exists in the codebase.</li>
            <li>CAN-SPAM: real identity, truthful subjects, instant opt-out, physical address in footer.</li>
            <li>Rate limits: ≤10 emails/day during warm-up (weeks 1–2), ≤25/day after; max 3 touches per contact, ever.</li>
            <li>No LinkedIn automation — drafts are copy-and-paste only.</li>
            <li>Contacts auto-purge 90 days after a pipeline closes; the suppression list is permanent.</li>
          </ul>
        </section>

        {!demoMode() && (
          <section
            aria-labelledby="account-h"
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <h2 id="account-h" className="font-display text-xl font-semibold">
              Account
            </h2>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:border-caution hover:text-caution"
              >
                Sign out
              </button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
