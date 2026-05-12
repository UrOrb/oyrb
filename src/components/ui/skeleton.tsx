import type { HTMLAttributes } from "react";

/**
 * Phase 9 PR 2 — loading-state primitive.
 *
 * Single composable building block for placeholder UI while data is in
 * flight. Callers control shape via className:
 *
 *   <Skeleton className="h-4 w-32" />                     // text line
 *   <Skeleton className="h-9 w-9 rounded-full" />          // avatar
 *   <Skeleton className="h-32 w-full" />                   // card body
 *
 * No named variants (CardSkeleton, RowSkeleton, …) by design — at N=0
 * consumers in this PR, named variants would be premature abstraction.
 * A future PR with 3+ similar call sites can lift a variant out.
 *
 * Visual tokens:
 *   - bg-[#E7E5E4] matches existing border tones; subtle, doesn't
 *     compete with real content above or below
 *   - animate-pulse from Tailwind core: opacity tween, GPU-composited
 *   - motion-reduce:animate-none honors the user's prefers-reduced-
 *     motion preference — renders as a static gray bar instead
 *
 * A11y: aria-hidden because skeletons are visual-only. When the parent
 * needs to inform screen-reader users that loading is in progress, the
 * parent should wrap with role="status" aria-live="polite" and include
 * an accessible "Loading…" label — that's a per-call-site decision and
 * doesn't belong on every individual placeholder.
 *
 * Phase 9 PR 2 ships this primitive WITHOUT consumers; subsequent
 * Phase 9 PRs (PR 5 client detail bento, PR 6 Business Brain bento)
 * will wire it in as those surfaces gain client-fetched or Suspense
 * boundaries.
 */

type Props = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...rest }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`block animate-pulse rounded-md bg-[#E7E5E4] motion-reduce:animate-none ${className}`}
      {...rest}
    />
  );
}
