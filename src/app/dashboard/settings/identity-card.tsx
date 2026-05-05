"use client";

import { useState, useTransition } from "react";

type IdentityStatus = "none" | "pending" | "verified" | "requires_input" | "failed";

type Props = {
  status: IdentityStatus;
  verifiedAt: string | null;
  lastAttemptedAt: string | null;
  /** Set when the URL carries ?identity=processing — pro just returned
   *  from the Stripe-hosted flow. Drives the "submitted, refresh shortly"
   *  banner. The webhook is the actual source of truth for status. */
  showProcessingBanner: boolean;
};

const COOLDOWN_DAYS = 90;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export function IdentityCard({
  status,
  verifiedAt,
  lastAttemptedAt,
  showProcessingBanner,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const verifiedDate = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Cooldown computation only matters for failed / requires_input. Pros
  // in 'none' have never attempted; verified/pending don't show a button.
  const cooldown = computeCooldown(lastAttemptedAt);
  const canRetry =
    !cooldown ||
    cooldown.now >= cooldown.eligibleAt;
  const retryDateLabel = cooldown
    ? new Date(cooldown.eligibleAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  function startVerification() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/identity/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Couldn't start verification.");
          return;
        }
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError("Stripe didn't return a verification URL.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't start verification.");
      }
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Identity Verification</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Optional. Available on every plan.
          </p>
        </div>
        <StatusPill status={status} />
      </div>

      {showProcessingBanner && status !== "verified" && (
        <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong className="font-semibold">Verification submitted.</strong> Stripe is
          processing it now — usually under a minute. Refresh this page in
          ~30 seconds to see your status update.
        </div>
      )}

      <div className="mt-5 text-sm leading-relaxed text-[#525252]">
        {status === "none" && (
          <p>
            Add a Stripe-issued ✓ Verified badge to your storefront. The
            check takes about 30 seconds — Stripe asks for a photo of your
            ID and a quick selfie. We never see the documents.
          </p>
        )}

        {status === "pending" && (
          <p>
            <strong>Verification in progress.</strong> Stripe is reviewing your
            submission — usually under a minute. Refresh this page to check.
          </p>
        )}

        {status === "verified" && (
          <p>
            <strong>✓ Verified{verifiedDate ? ` on ${verifiedDate}` : ""}.</strong>{" "}
            The badge is live on your storefront. Need to remove it? Email{" "}
            <a
              href="mailto:support@oyrb.space"
              className="underline hover:text-[#0A0A0A]"
            >
              support@oyrb.space
            </a>
            .
          </p>
        )}

        {status === "requires_input" && (
          <p>
            <strong>More info needed.</strong> Stripe couldn&apos;t fully verify on
            the last attempt — usually a glare on the ID or a blurry selfie.
            Try again with better lighting.
          </p>
        )}

        {status === "failed" && (
          <p>
            <strong>Verification didn&apos;t complete.</strong> This can happen if
            the document expired or didn&apos;t match.
          </p>
        )}
      </div>

      {(status === "none" ||
        status === "requires_input" ||
        status === "failed") && (
        <div className="mt-5">
          {canRetry ? (
            <>
              <button
                type="button"
                onClick={startVerification}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
              >
                {isPending
                  ? "Starting…"
                  : status === "none"
                    ? "Get verified"
                    : "Continue verification"}
              </button>
              {error && (
                <p className="mt-2 text-xs text-red-700">{error}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#737373]">
              You can retry after <strong>{retryDateLabel}</strong>. We use a
              cooldown to keep verification costs sustainable.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: IdentityStatus }) {
  if (status === "verified") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
        ✓ Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
        Pending
      </span>
    );
  }
  if (status === "requires_input" || status === "failed") {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
        Needs attention
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#FAFAF9] px-2.5 py-1 text-[10px] font-semibold text-[#737373]">
      Not verified
    </span>
  );
}

function computeCooldown(
  lastAttemptedAt: string | null,
): { now: number; eligibleAt: number } | null {
  if (!lastAttemptedAt) return null;
  const last = new Date(lastAttemptedAt).getTime();
  if (isNaN(last)) return null;
  return { now: Date.now(), eligibleAt: last + COOLDOWN_MS };
}
