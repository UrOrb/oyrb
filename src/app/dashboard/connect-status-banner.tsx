import Link from "next/link";
import { CreditCard, AlertTriangle, ArrowRight } from "lucide-react";
import type { ConnectStatus } from "@/lib/stripe-connect";

/**
 * Brand-tan callout shown on dashboard surfaces when the pro hasn't
 * finished Stripe Connect setup. Returns null for "ready" so callers can
 * always render this and let the component decide.
 *
 * Three actionable states:
 *   - not_connected           → "Set up Stripe …"
 *   - onboarding_incomplete   → "Finish your Stripe setup …"
 *   - restricted              → "Stripe needs more info …"
 *
 * The CTA always links to /dashboard/payments — that page already owns
 * the resume-onboarding / open-Stripe-dashboard flows from Phase 2.
 */
export function ConnectStatusBanner({
  status,
  variant = "full",
}: {
  status: ConnectStatus;
  /** "full" → dashboard home (icon + body). "compact" → narrower surfaces. */
  variant?: "full" | "compact";
}) {
  if (status === "ready") return null;

  const copy = MESSAGES[status];

  if (variant === "compact") {
    return (
      <Link
        href="/dashboard/payments"
        className="flex items-center justify-between gap-3 rounded-md border border-[#E7C9A8] bg-[#FBF4EC] px-4 py-3 text-xs hover:border-[#B8896B]"
      >
        <div className="flex items-center gap-2 text-[#7C5A3F]">
          <CreditCard size={14} className="shrink-0" />
          <span className="font-medium">{copy.short}</span>
        </div>
        <span className="flex items-center gap-1 font-semibold text-[#7C5A3F]">
          {copy.cta} <ArrowRight size={12} />
        </span>
      </Link>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[#E7C9A8] bg-[#FBF4EC] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#B8896B]">
          {status === "restricted" ? (
            <AlertTriangle size={16} />
          ) : (
            <CreditCard size={16} />
          )}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#5A3F2A]">{copy.title}</p>
          <p className="mt-0.5 text-xs text-[#7C5A3F]">{copy.body}</p>
        </div>
      </div>
      <Link
        href="/dashboard/payments"
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:opacity-80 md:self-auto"
      >
        {copy.cta} <ArrowRight size={12} />
      </Link>
    </div>
  );
}

const MESSAGES: Record<
  Exclude<ConnectStatus, "ready">,
  { title: string; body: string; short: string; cta: string }
> = {
  not_connected: {
    title: "Set up Stripe to start accepting client payments",
    body: "Deposits, pay-in-full, and gift cards all flow through your own Stripe account. Setup takes about 5 minutes.",
    short: "Connect Stripe to take client payments",
    cta: "Set up Stripe",
  },
  onboarding_incomplete: {
    title: "Finish your Stripe setup to accept client payments",
    body: "Stripe still needs a few details. Until you finish, deposits and gift cards are off on your booking page.",
    short: "Finish Stripe setup to enable payments",
    cta: "Resume",
  },
  restricted: {
    title: "Stripe needs more info before you can accept payments",
    body: "Your Stripe account is paused for new charges. Open Payments to see what's outstanding.",
    short: "Stripe paused — action needed",
    cta: "Review",
  },
};
