"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { delistMyListing, deleteMyDirectoryData } from "./actions";

type Props = {
  slug: string | null;
  reportCount: number;
  isHiddenPendingReview: boolean;
};

export function LiveControls({ slug, reportCount, isHiddenPendingReview }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onDelist = () => {
    startTransition(async () => {
      const r = await delistMyListing();
      if (!r.ok) setErr(r.error);
    });
  };
  const onHardDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const r = await deleteMyDirectoryData();
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-green-900">
          Your listing is live
          {isHiddenPendingReview && " — but currently hidden pending review"}
        </p>
      </div>
      {slug && !isHiddenPendingReview && (
        <p className="mt-1 text-xs text-green-800">
          Public URL:{" "}
          <Link href={`/find/${slug}`} target="_blank" rel="noreferrer" className="underline">
            oyrb.space/find/{slug}
          </Link>
        </p>
      )}
      {reportCount > 0 && (
        <p className="mt-1 text-xs text-amber-800">
          {reportCount} report{reportCount === 1 ? "" : "s"} on file. 3+ auto-hides pending admin review.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDelist}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Remove me from directory now
        </button>
        <button
          type="button"
          onClick={onHardDelete}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {confirmDelete ? "Click again to confirm permanent delete" : "Permanently delete my directory data"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
    </div>
  );
}
