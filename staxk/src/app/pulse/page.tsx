import type { Metadata } from "next";

import { getJobs, getOutreach } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pulse — public metrics",
  description: "Live, anonymized metrics from a real reverse-recruiting run.",
};

// Public read-only metrics dashboard (SPEC Phase 5) — the meta-move.
// Linked from outreach follow-ups and the portfolio. No names, no companies.
export default async function PulsePage() {
  const [jobs, outreach] = await Promise.all([getJobs(), getOutreach()]);
  const qualified = jobs.filter((j) => (j.match_score ?? 0) >= 80);
  const sent = outreach.filter((o) => o.status === "sent" || o.status === "replied");
  const replied = outreach.filter((o) => o.status === "replied");
  const interviews = jobs.filter((j) => j.stage === "interview" || j.stage === "offer");
  const avgMatch =
    qualified.length > 0
      ? qualified.reduce((sum, j) => sum + (j.match_score ?? 0), 0) / qualified.length
      : 0;
  const warmSent = sent.filter((o) => o.path_type === "warm").length;

  const stats = [
    { label: "jobs scanned", value: jobs.length },
    { label: "≥80 match", value: qualified.length },
    { label: "avg match score", value: avgMatch.toFixed(1) },
    { label: "outreach sent", value: sent.length },
    { label: "warm-path sends", value: warmSent },
    {
      label: "reply rate",
      value: sent.length ? `${Math.round((replied.length / sent.length) * 100)}%` : "—",
    },
    { label: "interviews booked", value: interviews.length },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-signal">
        STAXK /pulse
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">
        The search, in public
      </h1>
      <p className="mt-2 text-sm text-muted">
        Live, anonymized numbers from the reverse-recruiting engine I built and
        run on my own job search. The tool is the resume.
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <dd className="font-display text-4xl font-semibold text-signal">
              {s.value}
            </dd>
            <dt className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>
      <p className="mt-8 font-mono text-xs text-muted">
        Built by Halania Dixon · Atlanta, GA · React / TypeScript / Supabase /
        Inngest / Claude
      </p>
    </div>
  );
}
