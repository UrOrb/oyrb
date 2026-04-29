"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Mail } from "lucide-react";
import type { ProInvite } from "@/lib/types";
import { cancelInvite, resendInvite } from "./actions";

export function PendingInvitesSection({ invites }: { invites: ProInvite[] }) {
  const [list, setList] = useState(invites);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cancel(id: string) {
    setError(null);
    setBusyId(id);
    const prev = list;
    setList(list.filter((x) => x.id !== id)); // optimistic
    start(async () => {
      const result = await cancelInvite({ inviteId: id });
      if ("error" in result) {
        setError(result.error);
        setList(prev);
      }
      setBusyId(null);
    });
  }

  function resend(id: string) {
    setError(null);
    setBusyId(id);
    start(async () => {
      const result = await resendInvite({ inviteId: id });
      if ("error" in result) setError(result.error);
      setBusyId(null);
    });
  }

  if (list.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center gap-2">
        <Mail size={16} className="text-[#B8896B]" />
        <h2 className="font-display text-base font-medium tracking-tight">
          Pending Email Invites
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-[#737373]">
        Pros you&apos;ve invited who haven&apos;t signed up yet. Each invite expires after 30 days.
      </p>

      <div className="mt-4 space-y-2">
        {list.map((inv) => {
          const expiresAt = new Date(inv.expires_at);
          const expiresLabel = expiresAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={inv.id}
              className="flex items-center gap-3 rounded-md border border-[#E7E5E4] bg-white p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F4]">
                <Mail size={14} className="text-[#A3A3A3]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A0A0A]">{inv.invitee_email}</p>
                <p className="truncate text-xs text-[#737373]">Expires {expiresLabel}</p>
                {inv.vouch_note && (
                  <p className="mt-1 truncate text-xs italic text-[#525252]">
                    &ldquo;{inv.vouch_note}&rdquo;
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => resend(inv.id)}
                disabled={pending && busyId === inv.id}
                className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                {pending && busyId === inv.id ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Send size={10} />
                )}
                Resend
              </button>
              <button
                type="button"
                onClick={() => cancel(inv.id)}
                disabled={pending && busyId === inv.id}
                className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                Cancel
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
