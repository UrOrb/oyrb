"use client";

import { useState } from "react";
import { Image as ImageIcon, Inbox } from "lucide-react";
import type { EnrichedReferral } from "./page";
import { acceptReferral, declineReferral } from "./actions";
import { VouchModal } from "./vouch-modal";
import { DeclineConfirmModal } from "./decline-confirm-modal";

type Props = {
  requests: EnrichedReferral[];
  myBusinessName: string;
};

export function PendingRequestsSection({ requests, myBusinessName: _myBusinessName }: Props) {
  const [list, setList] = useState(requests);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptingRow = list.find((r) => r.id === acceptingId) ?? null;
  const decliningRow = list.find((r) => r.id === decliningId) ?? null;

  // Direct Decline button + VouchModal's "Decline" secondary both
  // route through this confirm flow now (was a one-click decline →
  // 30-day cooldown trap before).
  function requestDecline(referralId: string) {
    // If the accept modal happens to be open, close it first so the
    // confirm modal isn't stacked behind it.
    setAcceptingId(null);
    setDecliningId(referralId);
  }

  // Actual server-side decline. Called from the confirm modal on user
  // confirmation. Optimistically removes the row from the local list.
  async function performDecline(referralId: string) {
    setError(null);
    const prev = list;
    setList((cur) => cur.filter((r) => r.id !== referralId));
    const result = await declineReferral({ referralId });
    if ("error" in result) {
      setError(result.error);
      setList(prev);
    }
    return result;
  }

  if (list.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center gap-2">
        <Inbox size={16} className="text-[#B8896B]" />
        <h2 className="font-display text-base font-medium tracking-tight">
          Pending Requests
        </h2>
        <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B8896B] px-1.5 text-[11px] font-semibold text-white">
          {list.length}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-[#737373]">
        Pros who want to add you to their Trusted Pros list.
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
                  Their note: &ldquo;{r.vouch_note}&rdquo;
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => requestDecline(r.id)}
              className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => setAcceptingId(r.id)}
              className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Accept
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {acceptingRow && (
        <VouchModal
          open={!!acceptingRow}
          onClose={() => setAcceptingId(null)}
          peerName={acceptingRow.peer.business_name}
          mode="accept"
          onSecondary={() => requestDecline(acceptingRow.id)}
          onConfirm={async () => {
            const result = await acceptReferral({
              referralId: acceptingRow.id,
              acknowledged: true,
            });
            if ("success" in result) {
              setList((cur) => cur.filter((x) => x.id !== acceptingRow.id));
            }
            return result;
          }}
        />
      )}

      <DeclineConfirmModal
        open={!!decliningRow}
        onClose={() => setDecliningId(null)}
        peerName={decliningRow?.peer.business_name ?? ""}
        onConfirm={async () => {
          if (!decliningRow) return { error: "No request selected." };
          return await performDecline(decliningRow.id);
        }}
      />
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
