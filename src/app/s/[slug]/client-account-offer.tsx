"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

// Optional post-booking offer to convert a one-time booker into a returning
// client-account holder. Declining dismisses the card client-side so the
// booking-confirmation UI doesn't feel cluttered. Account creation reuses
// the existing magic-link client-login flow (first link-click registers a
// new account; repeat clicks just log in).
type Props = {
  // Prefill the magic-link form with the email the client just used to
  // book. When null/undefined the /client-login page asks for it.
  email?: string | null;
};

export function ClientAccountOffer({ email }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="mt-4 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-center text-xs text-[#737373]">
        All set — you&apos;re good to go.
      </div>
    );
  }

  const createHref = email
    ? `/client-login?email=${encodeURIComponent(email)}`
    : "/client-login";

  return (
    <div className="mt-4 rounded-lg border border-[#E7E5E4] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B8896B]/15">
          <UserPlus size={14} className="text-[#B8896B]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            Want to save your info for faster booking next time?
          </p>
          <p className="mt-1 text-xs text-[#525252]">
            Create a free OYRB client account. Takes 10 seconds — totally
            optional.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={createHref}
              className="inline-flex items-center rounded-full bg-[#0A0A0A] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Create account
            </a>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex items-center rounded-full border border-[#E7E5E4] bg-white px-4 py-1.5 text-xs font-semibold text-[#525252] hover:bg-[#FAFAF9]"
            >
              No thanks, I&apos;m good
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
