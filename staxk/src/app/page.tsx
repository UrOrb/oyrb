import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { PageHeader } from "@/components/page-header";
import { RadarSweep } from "@/components/radar-sweep";
import {
  demoMode,
  getActivity,
  getJobs,
  getOutreach,
  getPipelineSummary,
  getSignals,
} from "@/lib/data";
import { timeAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const [jobs, summary, pending, signals, activity] = await Promise.all([
    getJobs(),
    getPipelineSummary(),
    getOutreach("pending_approval"),
    getSignals(),
    getActivity(),
  ]);
  const topMatches = jobs
    .filter((j) => j.stage !== "closed" && (j.match_score ?? 0) >= 80)
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title="Morning scan"
        sub={
          demoMode()
            ? "Demo mode — set Supabase env vars to go live"
            : "Live pipeline"
        }
      />
      <div className="grid gap-6 px-4 py-6 md:grid-cols-3 md:px-8">
        {/* Pipeline summary with the one orchestrated motion moment */}
        <section
          aria-label="Pipeline summary"
          className="relative rounded-2xl border border-line bg-surface p-4 md:col-span-2"
        >
          <RadarSweep />
          <div className="relative grid grid-cols-4 gap-3 sm:grid-cols-7">
            {summary.map(({ stage, count }) => (
              <Link
                key={stage}
                href="/pipeline"
                className="rounded-lg p-2 text-center hover:bg-surface-2"
              >
                <p className="font-display text-3xl font-semibold text-signal">
                  {count}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wide text-muted">
                  {stage}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Approval queue CTA */}
        <Link
          href="/approvals"
          className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 hover:border-signal"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Awaiting your tap
          </p>
          <p className="font-display text-5xl font-semibold text-pulse">
            {pending.length}
          </p>
          <p className="text-sm text-muted">
            outreach drafts — approve today&apos;s batch in 90 seconds
          </p>
        </Link>

        {/* Strong signals */}
        <section aria-labelledby="matches-h" className="md:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="matches-h" className="font-display text-xl font-semibold">
              Strong signals
            </h2>
            <Link href="/pipeline" className="text-sm text-signal">
              Pipeline →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {topMatches.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {/* Signals feed (Pulse) */}
          <section aria-labelledby="signals-h">
            <h2 id="signals-h" className="mb-2 font-display text-xl font-semibold">
              Signals
            </h2>
            <ul className="flex flex-col gap-2">
              {signals.slice(0, 3).map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-line bg-surface p-3"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wide text-pulse">
                    {s.kind.replaceAll("_", " ")} · {s.source} ·{" "}
                    {timeAgo(s.detected_at)}
                  </p>
                  <p className="mt-1 text-sm leading-snug">{s.summary_md}</p>
                  <a
                    href={s.url}
                    className="mt-1 inline-block font-mono text-[11px] text-muted underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    source
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Agent activity */}
          <section aria-labelledby="activity-h">
            <h2 id="activity-h" className="mb-2 font-display text-xl font-semibold">
              Agent activity
            </h2>
            <ul className="flex flex-col gap-1.5">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-mono text-[11px] uppercase text-signal">
                    {a.agent}
                  </span>
                  <span className="text-muted">{a.event}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
