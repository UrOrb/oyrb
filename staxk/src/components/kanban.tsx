"use client";

// Pipeline kanban (SPEC §2):
// - mobile: horizontal snap-scroll of stage columns
// - desktop: native drag & drop between columns
// - keyboard: arrows move focus; Space picks up a card, arrows then move it
//   between stages, Space drops it. Announced via aria-live.
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { MatchDial } from "./match-dial";
import { PathBadge } from "./job-card";
import { moveJobStage } from "@/lib/actions";
import { STAGES, type Job, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<Stage, string> = {
  sourced: "Sourced",
  qualified: "Qualified",
  applied: "Applied",
  contacted: "Contacted",
  replied: "Replied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export function Kanban({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pickedUp, setPickedUp] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function move(jobId: string, stage: Stage) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, stage } : j)));
    startTransition(() => moveJobStage(jobId, stage));
  }

  function onCardKeyDown(e: React.KeyboardEvent, job: Job) {
    const stageIdx = STAGES.indexOf(job.stage);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (pickedUp === job.id) {
        setPickedUp(null);
        setAnnouncement(`${job.title} dropped in ${STAGE_LABELS[job.stage]}.`);
      } else {
        setPickedUp(job.id);
        setAnnouncement(
          `${job.title} picked up. Use left and right arrows to move between stages, Space to drop.`,
        );
      }
      return;
    }
    if (pickedUp === job.id && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      const next = STAGES[stageIdx + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) {
        move(job.id, next);
        setAnnouncement(`${job.title} moved to ${STAGE_LABELS[next]}.`);
        // Keep focus on the card after it re-renders in its new column.
        requestAnimationFrame(() => {
          listRef.current
            ?.querySelector<HTMLElement>(`[data-job-id="${job.id}"]`)
            ?.focus();
        });
      }
    }
  }

  return (
    <div ref={listRef}>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="snap-row flex gap-3 overflow-x-auto px-4 pb-4 md:px-8">
        {STAGES.map((stage) => {
          const columnJobs = jobs.filter((j) => j.stage === stage);
          return (
            <section
              key={stage}
              aria-label={`${STAGE_LABELS[stage]}, ${columnJobs.length} jobs`}
              className="snap-col w-[82vw] shrink-0 rounded-xl border border-line bg-surface/50 sm:w-72"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/staxk-job");
                if (id) move(id, stage);
              }}
            >
              <header className="flex items-baseline justify-between px-3 pt-3">
                <h2 className="font-display text-lg font-semibold">
                  {STAGE_LABELS[stage]}
                </h2>
                <span className="font-mono text-xs text-muted">
                  {columnJobs.length}
                </span>
              </header>
              <ul className="flex min-h-24 flex-col gap-2 p-3">
                {columnJobs.map((job) => (
                  <li key={job.id}>
                    <div
                      data-job-id={job.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      aria-pressed={pickedUp === job.id}
                      aria-label={`${job.title} at ${job.company?.name ?? "unknown company"}, stage ${STAGE_LABELS[job.stage]}. Press Space to pick up.`}
                      onKeyDown={(e) => onCardKeyDown(e, job)}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/staxk-job", job.id)
                      }
                      className={cn(
                        "flex cursor-grab items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5",
                        pickedUp === job.id && "border-signal ring-2 ring-signal",
                      )}
                    >
                      {job.match_score != null && (
                        <MatchDial score={job.match_score} size={40} />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="block truncate text-sm font-medium hover:text-signal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.title}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {job.company?.name}
                        </p>
                        <PathBadge pathType={job.path_type} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
