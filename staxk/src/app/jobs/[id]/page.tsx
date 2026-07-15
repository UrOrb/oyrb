import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MatchDial } from "@/components/match-dial";
import { PathBadge } from "@/components/job-card";
import { PageHeader } from "@/components/page-header";
import { getJob, getScreenReport } from "@/lib/data";
import { cn } from "@/lib/utils";

// Next 16: params is a Promise — must be awaited.
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? job.title : "Job" };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const report = await getScreenReport(job.id);

  const salary =
    job.salary_min && job.salary_max
      ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`
      : null;

  return (
    <>
      <PageHeader title={job.title} sub={job.company?.name ?? undefined} />
      <div className="grid gap-6 px-4 py-6 md:grid-cols-3 md:px-8">
        {/* Hero: the dual Match Dial */}
        <section
          aria-label="Match scores"
          className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center"
        >
          {job.match_score != null ? (
            <MatchDial score={job.match_score} atsScore={job.ats_score} size={168} />
          ) : (
            <p className="text-muted">Not yet scored</p>
          )}
          <p className="mt-3 font-mono text-xs text-muted">
            outer ring <span className="text-signal">semantic match</span>
            {job.ats_score != null && (
              <>
                {" · "}inner ring <span className="text-pulse">ATS keywords</span>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {job.required_skills.map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-[11px]",
                  job.skill_gaps.includes(s)
                    ? "border-caution text-caution"
                    : "border-signal/40 text-signal",
                )}
              >
                {s}
              </span>
            ))}
            {job.skill_gaps
              .filter((g) => !job.required_skills.includes(g))
              .map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-caution px-2.5 py-0.5 font-mono text-[11px] text-caution"
                >
                  gap: {g}
                </span>
              ))}
          </div>
          <dl className="mt-5 w-full space-y-1 text-left text-sm">
            <Row k="Stage" v={job.stage} mono />
            <Row k="Path" v={<PathBadge pathType={job.path_type} />} />
            <Row k="Location" v={job.location ?? (job.remote ? "Remote" : "—")} />
            {salary && <Row k="Salary" v={salary} mono />}
            <Row k="Source" v={job.source} mono />
          </dl>
        </section>

        {/* Description + Analyst output */}
        <section className="flex flex-col gap-4 md:col-span-2">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-semibold">Posting</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {job.description_md}
            </p>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-mono text-xs text-signal underline"
              >
                original posting
              </a>
            )}
          </article>

          {job.tailored_bullets_md && (
            <article className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-display text-xl font-semibold">
                Analyst — tailored bullets
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {job.tailored_bullets_md}
              </p>
            </article>
          )}

          {/* Gatekeeper Screen Room */}
          {report && (
            <article className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-display text-xl font-semibold">
                The Screen Room{" "}
                <span className="font-mono text-sm font-normal text-muted">
                  ATS {report.ats_score}/100 · verdict{" "}
                  <span
                    className={cn(
                      report.recruiter_verdict === "advance" && "text-signal",
                      report.recruiter_verdict === "maybe" && "text-caution",
                      report.recruiter_verdict === "reject" && "text-pulse",
                    )}
                  >
                    {report.recruiter_verdict}
                  </span>
                </span>
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Keyword coverage against your active resume
                  </caption>
                  <thead className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="py-1.5 pr-4">Keyword</th>
                      <th scope="col" className="py-1.5 pr-4">Weight</th>
                      <th scope="col" className="py-1.5 pr-4">Status</th>
                      <th scope="col" className="py-1.5">Found in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.keyword_coverage.map((k) => (
                      <tr key={k.keyword} className="border-t border-line">
                        <td className="py-1.5 pr-4 font-mono">{k.keyword}</td>
                        <td className="py-1.5 pr-4 font-mono">{k.weight}×</td>
                        <td
                          className={cn(
                            "py-1.5 pr-4 font-mono",
                            k.status === "exact" && "text-signal",
                            k.status === "variant" && "text-caution",
                            k.status === "missing" && "text-pulse",
                          )}
                        >
                          {k.status}
                        </td>
                        <td className="py-1.5 text-muted">
                          {k.where_found ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.parse_risks.length > 0 && (
                <p className="mt-3 text-sm text-caution">
                  Parse risk: {report.parse_risks.join(" · ")}
                </p>
              )}
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Suggested edit —{" "}
                </span>
                {report.suggested_edits_md}
              </p>
            </article>
          )}
        </section>
      </div>
    </>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-1.5 first:border-t-0">
      <dt className="text-muted">{k}</dt>
      <dd className={cn(mono && "font-mono text-xs")}>{v}</dd>
    </div>
  );
}
