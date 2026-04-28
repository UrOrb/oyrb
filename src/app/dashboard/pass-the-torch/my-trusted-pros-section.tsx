"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Flame,
} from "lucide-react";
import type { EnrichedReferral } from "./page";
import { reorderReferrals, removeReferral } from "./actions";
import { AddTrustedProModal } from "./add-trusted-pro-modal";

const MAX = 5;

type Props = {
  referrals: EnrichedReferral[];
  /** pending + accepted referrals + pending invites — used for cap + empty state. */
  activeCount: number;
  businessName: string;
};

export function MyTrustedProsSection({ referrals, activeCount, businessName: _businessName }: Props) {
  const [list, setList] = useState(referrals);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // Reordering: only accepted rows are user-orderable. Pending rows
  // appear below as a read-only band (their position lands once accepted).
  const accepted = list.filter((r) => r.status === "accepted");
  const pending = list.filter((r) => r.status === "pending");

  const atCap = activeCount >= MAX;

  function move(idx: number, direction: -1 | 1) {
    const target = idx + direction;
    if (target < 0 || target >= accepted.length) return;
    setError(null);

    const reordered = [...accepted];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const newList = [...reordered, ...pending];
    setList(newList); // optimistic

    start(async () => {
      const result = await reorderReferrals({ orderedIds: reordered.map((r) => r.id) });
      if ("error" in result) {
        setError(result.error);
        setList(referrals); // revert
      }
    });
  }

  function remove(referralId: string) {
    setError(null);
    const prev = list;
    setList(list.filter((r) => r.id !== referralId)); // optimistic
    start(async () => {
      const result = await removeReferral({ referralId });
      if ("error" in result) {
        setError(result.error);
        setList(prev);
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium tracking-tight">
            My Trusted Pros
          </h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            {accepted.length} of {MAX} active
            {pending.length > 0 && ` · ${pending.length} pending`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={atCap}
          title={atCap ? `Reached the ${MAX}-pro limit` : ""}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          <Plus size={12} /> Add Trusted Pro
        </button>
      </div>

      {accepted.length === 0 && pending.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-[#E7E5E4] bg-[#FAFAF9] px-5 py-10 text-center">
          <Flame size={20} strokeWidth={1.5} className="mx-auto text-[#B8896B]" />
          <p className="mt-3 text-sm font-medium text-[#0A0A0A]">
            Vouch for a pro you trust.
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            When you&apos;re booked or away, your clients will see them on your storefront.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus size={12} /> Add Trusted Pro
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {accepted.map((r, idx) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-[#E7E5E4] bg-white p-3"
            >
              <div className="flex flex-col text-[#A3A3A3]">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || busy}
                  className="rounded p-0.5 hover:bg-[#F5F5F4] disabled:opacity-30"
                >
                  <ChevronUp size={12} />
                </button>
                <GripVertical size={12} className="opacity-50" />
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(idx, 1)}
                  disabled={idx === accepted.length - 1 || busy}
                  className="rounded p-0.5 hover:bg-[#F5F5F4] disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
              <Avatar url={r.peer.profile_image_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A0A0A]">{r.peer.business_name}</p>
                <p className="truncate text-xs text-[#737373]">
                  /s/{r.peer.slug}
                  {r.peer.primary_specialty && <> · <span className="text-[#B8896B]">{r.peer.primary_specialty}</span></>}
                </p>
                {r.vouch_note && (
                  <p className="mt-1 truncate text-xs italic text-[#525252]">&ldquo;{r.vouch_note}&rdquo;</p>
                )}
              </div>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">
                Active
              </span>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={busy}
                className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}

          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-dashed border-[#E7E5E4] bg-[#FAFAF9] p-3"
            >
              <Avatar url={r.peer.profile_image_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A0A0A]">{r.peer.business_name}</p>
                <p className="truncate text-xs text-[#737373]">/s/{r.peer.slug}</p>
                {r.vouch_note && (
                  <p className="mt-1 truncate text-xs italic text-[#525252]">&ldquo;{r.vouch_note}&rdquo;</p>
                )}
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Pending
              </span>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={busy}
                className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#A3A3A3]">
          <Loader2 size={10} className="animate-spin" /> Saving…
        </p>
      )}

      <AddTrustedProModal open={addOpen} onClose={() => setAddOpen(false)} />
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
