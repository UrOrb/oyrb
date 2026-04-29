"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, Heart } from "lucide-react";
import { tryAcceptPendingInvite } from "./pass-the-torch/actions";

const STORAGE_KEY = "oyrb_pending_invite";

/**
 * Mounted once in the dashboard layout. Reads the invite token stashed
 * by /signup or /login (Phase 1F) and runs the auto-accept action.
 *
 * Behavior matrix:
 *   · status === "accepted" or terminal failure → clear localStorage,
 *     show a toast (success only — failures stay silent so we don't
 *     pile errors on a brand-new user).
 *   · status === "deferred" → leave the token in place. Happens when
 *     the user hasn't created their first business yet; the next
 *     dashboard render after they do will retry.
 *   · network error → leave the token alone, retry later.
 *
 * The action is idempotent (the unique (requester, receiver) constraint
 * on pro_referrals + the "already_accepted" branch make a double-fire
 * a no-op), so racing renders here can't double-create a referral.
 */
export function PendingInviteAcceptor() {
  const [toast, setToast] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let token: string | null = null;
    try {
      token = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!token) return;

    (async () => {
      try {
        const result = await tryAcceptPendingInvite({ token });

        // "deferred" + transport errors are recoverable — keep the
        // token so the next mount retries. Everything else is terminal.
        if ("status" in result) {
          if (result.status === "deferred") return;
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          if (result.status === "accepted") {
            const who = result.requesterName ?? "the pro who invited you";
            setToast(`You're now in ${who}'s Pro Referrals.`);
          }
          return;
        }

        if ("error" in result) {
          // Hard server error — clear so we don't spin forever.
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      } catch {
        // Transient network error — keep the token, try again later.
      }
    })();
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] flex max-w-sm -translate-x-1/2 items-start gap-3 rounded-lg border border-[#E7E5E4] bg-white px-4 py-3 shadow-lg"
    >
      <Heart size={16} className="mt-0.5 shrink-0 text-[#B8896B]" />
      <div className="flex-1 text-sm text-[#0A0A0A]">
        <p className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 size={14} className="text-green-700" /> Invitation accepted
        </p>
        <p className="mt-0.5 text-xs text-[#737373]">{toast}</p>
      </div>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Dismiss"
        className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
