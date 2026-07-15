import Link from "next/link";

import { MatchDial } from "./match-dial";
import type { Job } from "@/lib/types";

export function PathBadge({ pathType }: { pathType: Job["path_type"] }) {
  if (!pathType) return null;
  return (
    <span
      className="font-mono text-[11px]"
      title={pathType === "warm" ? "Warm path found" : "Cold path only"}
    >
      {pathType === "warm" ? "🌉 warm" : "❄️ cold"}
    </span>
  );
}

export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-signal"
    >
      {job.match_score != null ? (
        <MatchDial score={job.match_score} atsScore={job.ats_score} />
      ) : (
        <div
          className="grid size-14 place-items-center rounded-full border border-dashed border-line font-mono text-[10px] text-muted"
          aria-label="Not yet scored"
        >
          —
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{job.title}</p>
        <p className="truncate text-sm text-muted">
          {job.company?.name ?? "Unknown"} · {job.location ?? (job.remote ? "Remote" : "—")}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
            {job.stage}
          </span>
          <PathBadge pathType={job.path_type} />
          {job.skill_gaps.length > 0 && (
            <span className="truncate font-mono text-[10px] text-caution">
              gap: {job.skill_gaps[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
