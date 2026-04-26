"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, ExternalLink, CircleDashed } from "lucide-react";
import type { ConnectStatus } from "@/lib/stripe-connect";

type Banner = "success" | "error" | null;

type Props = {
  businessName: string;
  status: ConnectStatus;
  requirementsCurrentlyDue: string[];
  payoutsEnabled: boolean;
  banner: Banner;
  bannerMessage: string | null;
};

export function PaymentsClient({
  businessName,
  status,
  requirementsCurrentlyDue,
  payoutsEnabled,
  banner,
  bannerMessage,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  function startOnboarding() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start Stripe onboarding.");
        return;
      }
      window.location.href = data.url;
    });
  }

  function openStripeDashboard() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/stripe/connect/dashboard-link", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open Stripe Dashboard.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    });
  }

  function disconnect() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not disconnect.");
        setConfirmingDisconnect(false);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-medium">Payments</h1>
        <p className="mt-1 text-sm text-[#737373]">
          Stripe Connect for <strong>{businessName}</strong>. Once connected,
          your clients pay you directly — money flows to your Stripe account,
          not OYRB&apos;s.
        </p>
      </div>

      {banner === "success" && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          You&apos;re back from Stripe. We&apos;ve refreshed your status below.
        </div>
      )}
      {banner === "error" && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Stripe sent an error: <code>{bannerMessage}</code>. Try again, or
          contact support.
        </div>
      )}

      <StatusCard
        status={status}
        payoutsEnabled={payoutsEnabled}
        requirementsCurrentlyDue={requirementsCurrentlyDue}
      />

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {status === "not_connected" && (
          <button
            onClick={startOnboarding}
            disabled={pending}
            className="rounded-md bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Opening Stripe…" : "Connect Stripe"}
          </button>
        )}

        {(status === "onboarding_incomplete" || status === "restricted") && (
          <button
            onClick={startOnboarding}
            disabled={pending}
            className="rounded-md bg-[#B8896B] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Opening Stripe…" : "Complete Stripe setup"}
          </button>
        )}

        {(status === "ready" ||
          status === "restricted" ||
          status === "onboarding_incomplete") && (
          <button
            onClick={openStripeDashboard}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-5 py-3 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAF9] disabled:opacity-50"
          >
            Open Stripe Dashboard <ExternalLink size={14} />
          </button>
        )}
      </div>

      {(status === "ready" ||
        status === "restricted" ||
        status === "onboarding_incomplete") && (
        <DisconnectSection
          confirming={confirmingDisconnect}
          setConfirming={setConfirmingDisconnect}
          onConfirm={disconnect}
          pending={pending}
        />
      )}

      <Explainer />
    </div>
  );
}

function StatusCard({
  status,
  payoutsEnabled,
  requirementsCurrentlyDue,
}: {
  status: ConnectStatus;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue: string[];
}) {
  const meta = STATUS_META[status];

  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${meta.iconClass}`}>{meta.icon}</span>
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${meta.kickerClass}`}>
            {meta.kicker}
          </p>
          <h2 className="mt-1 font-display text-xl font-medium">
            {meta.title}
          </h2>
          <p className="mt-1 text-sm text-[#525252]">{meta.body}</p>
        </div>
      </div>

      {(status === "ready" || status === "restricted") && (
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E7E5E4] pt-4 text-xs">
          <Indicator
            label="Charges"
            ok={status === "ready"}
            okText="Enabled"
            offText="Disabled"
          />
          <Indicator
            label="Payouts"
            ok={payoutsEnabled}
            okText="Enabled"
            offText="Pending"
          />
        </dl>
      )}

      {requirementsCurrentlyDue.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold text-amber-900">
            Stripe still needs:
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-amber-900">
            {requirementsCurrentlyDue.map((r) => (
              <li key={r}>
                <code className="text-[11px]">{r}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-amber-900">
            Click <strong>Complete Stripe setup</strong> below to finish these.
          </p>
        </div>
      )}
    </div>
  );
}

function Indicator({
  label,
  ok,
  okText,
  offText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  offText: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-2">
      <span className="font-medium text-[#525252]">{label}</span>
      <span
        className={`font-semibold ${
          ok ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {ok ? okText : offText}
      </span>
    </div>
  );
}

function DisconnectSection({
  confirming,
  setConfirming,
  onConfirm,
  pending,
}: {
  confirming: boolean;
  setConfirming: (v: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-10 rounded-md border border-[#E7E5E4] bg-[#FAF6F2] p-5 text-sm">
      <p className="font-semibold text-[#0A0A0A]">Disconnect Stripe</p>
      <p className="mt-1 text-xs text-[#737373]">
        This unlinks your Stripe account from OYRB but does not delete it —
        you keep ownership at dashboard.stripe.com. While disconnected,
        clients can&apos;t pay you through the booking site. You can re-link
        any time, though re-linking creates a fresh Stripe account rather
        than reusing the old one.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="mt-3 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#525252] hover:bg-white/80 disabled:opacity-50"
        >
          Disconnect…
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Disconnecting…" : "Yes, disconnect"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#525252] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function Explainer() {
  return (
    <div className="mt-10 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-5 text-xs leading-relaxed text-[#525252]">
      <p className="font-semibold text-[#0A0A0A]">How OYRB + Stripe Connect works</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>
          You create a Stripe account through OYRB. It&apos;s your account —
          OYRB never touches your money.
        </li>
        <li>
          When clients book, they pay your Stripe account directly. Stripe&apos;s
          fee comes off the top; OYRB charges nothing extra.
        </li>
        <li>
          Refunds, payouts, disputes, taxes — all in your own Stripe Dashboard.
        </li>
        <li>
          OYRB charges you only the monthly tier subscription. There&apos;s no
          per-booking transaction fee.
        </li>
      </ul>
    </div>
  );
}

const STATUS_META: Record<
  ConnectStatus,
  {
    kicker: string;
    title: string;
    body: string;
    icon: React.ReactNode;
    kickerClass: string;
    iconClass: string;
  }
> = {
  not_connected: {
    kicker: "Not connected",
    title: "Connect Stripe to start taking payments",
    body: "You'll be sent to Stripe to create an account or sign in. Stripe handles ID verification and bank linking — OYRB never sees your sensitive info.",
    icon: <CircleDashed size={20} />,
    kickerClass: "text-[#737373]",
    iconClass: "text-[#A3A3A3]",
  },
  onboarding_incomplete: {
    kicker: "Onboarding in progress",
    title: "Stripe still needs a bit more from you",
    body: "Your Stripe account exists but isn't fully set up yet. Finish the steps below to start accepting payments.",
    icon: <AlertCircle size={20} />,
    kickerClass: "text-amber-700",
    iconClass: "text-amber-600",
  },
  restricted: {
    kicker: "Restricted",
    title: "Stripe paused new charges on your account",
    body: "Stripe needs additional info to keep accepting charges. Complete the items below to lift the restriction.",
    icon: <AlertCircle size={20} />,
    kickerClass: "text-amber-700",
    iconClass: "text-amber-600",
  },
  ready: {
    kicker: "Connected and ready",
    title: "You're set up to take payments",
    body: "Your Stripe account is fully verified. Clients can pay you directly through bookings, and money lands in your Stripe balance.",
    icon: <CheckCircle2 size={20} />,
    kickerClass: "text-emerald-700",
    iconClass: "text-emerald-600",
  },
};
