"use client";

import { useState, useTransition } from "react";
import { Loader2, Image as ImageIcon, RotateCcw, ShieldOff } from "lucide-react";
import type { EnrichedReferral } from "./page";
import { unblockDeclinedPro } from "./actions";

/**
 * Reversal surface for accidental declines. Lists every pro the
 * current business has declined; clicking "Allow them to ask again"
 * deletes the row entirely so the requester is back to no-relationship
 * (free to request fresh through the normal flow). Cooldown is bypassed
 * — that's the point.
 */
export function DeclinedSection({ declined }: { declined: EnrichedReferral[] }) {
  const [list, setList] = useState(declined);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function unblock(referralId: string) {
    setError(null);
    setBusyId(referralId);
    const prev = list;
    setList((cur) => cur.filter((r) => r.id !== referralId)); // optimistic
    start(async () => {
      const result = await unblockDeclinedPro({ referralId });
      if ("error" in result) {
        setError(result.error);
        setList(prev);
      }
      setBusyId(null);
    });
  }

  if (list.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center gap-2">
        <ShieldOff size={16} className="text-[#737373]" />
        <h2 className="font-display text-base font-medium tracking-tight">
          Declined
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-[#737373]">
        Pros you&apos;ve declined. They can&apos;t request again until
        the cooldown ends — unless you allow them.
      </p>

      <div className="mt-4 space-y-2">
        {list.map((r) => {
          const declinedAt = r.responded_at ? new Date(r.responded_at) : null;
          const cooldownUntil = r.decline_cooldown_until
            ? new Date(r.decline_cooldown_until)
            : null;
          const cooldownActive = cooldownUntil
            ? cooldownUntil.getTime() > Date.now()
            : false;
          const fmt = (d: Date) =>
            d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-[#E7E5E4] bg-white p-3"
            >
              <Avatar url={r.peer.profile_image_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A0A0A]">{r.peer.business_name}</p>
                <p className="truncate text-xs text-[#737373]">
                  /s/{r.peer.slug}
                  {r.peer.primary_specialty && <> · <span className="text-[#B8896B]">{r.peer.primary_specialty}</span></>}
                </p>
                <p className="mt-1 text-[11px] text-[#A3A3A3]">
                  {declinedAt && <>Declined {fmt(declinedAt)}</>}
                  {cooldownUntil && (
                    <>
                      {declinedAt && " · "}
                      {cooldownActive
                        ? `cooldown ends ${fmt(cooldownUntil)}`
                        : "cooldown expired"}
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => unblock(r.id)}
                disabled={pending && busyId === r.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                {pending && busyId === r.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
                Allow them to ask again
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5F5F4]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon size={14} className="text-[#A3A3A3]" />
      )}
    </div>
  );
}
