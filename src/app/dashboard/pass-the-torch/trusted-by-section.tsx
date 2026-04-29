"use client";

import { useState, useTransition } from "react";
import { Loader2, Image as ImageIcon, Heart } from "lucide-react";
import type { EnrichedReferral } from "./page";
import { removeReferral } from "./actions";

export function TrustedBySection({ referrals }: { referrals: EnrichedReferral[] }) {
  const [list, setList] = useState(referrals);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function removeMe(referralId: string) {
    setError(null);
    const prev = list;
    setList(list.filter((r) => r.id !== referralId));
    start(async () => {
      const result = await removeReferral({ referralId });
      if ("error" in result) {
        setError(result.error);
        setList(prev);
      }
    });
  }

  if (list.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center gap-2">
        <Heart size={16} className="text-[#B8896B]" />
        <h2 className="font-display text-base font-medium tracking-tight">
          Pros Who Trust You
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-[#737373]">
        These pros vouch for you on their storefront when they&apos;re unavailable.
      </p>

      <div className="mt-4 space-y-2">
        {list.map((r) => (
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
              {r.vouch_note && (
                <p className="mt-1 truncate text-xs italic text-[#525252]">
                  Their note about you: &ldquo;{r.vouch_note}&rdquo;
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeMe(r.id)}
              disabled={pending}
              className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
            >
              Remove me
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#A3A3A3]">
          <Loader2 size={10} className="animate-spin" /> Updating…
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
