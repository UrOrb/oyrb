"use client";

import { useState, useTransition } from "react";

const PRESETS = [25, 50, 75, 100, 150, 200] as const;

type Props = {
  slug: string;
  businessName: string;
};

export function GiftCardForm({ slug, businessName }: Props) {
  const [amount, setAmount] = useState<number | "custom">(50);
  const [custom, setCustom] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const amountCents = (() => {
    if (amount === "custom") {
      const n = parseFloat(custom);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.round(n * 100);
    }
    return amount * 100;
  })();

  const submit = () => {
    setErr(null);
    if (amountCents < 500) {
      setErr("Minimum gift card is $5.");
      return;
    }
    if (!buyerEmail || !buyerName) {
      setErr("Please add your name and email so we can send your receipt.");
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/public/gift-cards/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            amount_cents: amountCents,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
            recipient_name: recipientName.trim() || null,
            recipient_email: recipientEmail.trim() || null,
            message: message.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          setErr(data.error ?? `Couldn't start checkout (HTTP ${res.status}).`);
          return;
        }
        window.location.href = data.url;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
      {/* Amount */}
      <label className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        Amount
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom("");
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              amount === p
                ? "bg-[#0A0A0A] text-white"
                : "border border-[#E7E5E4] bg-white text-[#525252]"
            }`}
          >
            ${p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount("custom")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            amount === "custom"
              ? "bg-[#0A0A0A] text-white"
              : "border border-[#E7E5E4] bg-white text-[#525252]"
          }`}
        >
          Custom
        </button>
      </div>
      {amount === "custom" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-[#525252]">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="5"
            step="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="25"
            className="w-28 rounded-md border border-[#E7E5E4] px-3 py-1.5 text-sm"
            aria-label="Custom gift card amount"
          />
        </div>
      )}

      {/* Buyer */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Your name</label>
          <input
            required
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Your email</label>
          <input
            required
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Optional gift-to-another recipient */}
      <details className="mt-5 rounded-md bg-[#FAFAF9] p-3 text-xs">
        <summary className="cursor-pointer font-medium text-[#0A0A0A]">
          Sending as a gift to someone else? (optional)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient name"
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="Recipient email"
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 280))}
          rows={2}
          placeholder={`Optional message (e.g. "Happy birthday!")`}
          className="mt-2 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
        />
      </details>

      <button
        type="button"
        onClick={submit}
        disabled={pending || amountCents < 500}
        className="mt-6 w-full rounded-full bg-[#0A0A0A] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "Redirecting to checkout…"
          : `Buy $${(amountCents / 100).toFixed(2)} gift card`}
      </button>

      {err && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}

      <p className="mt-3 text-[10px] text-[#A3A3A3]">
        Valid for booking on oyrb.space at this site. Non-refundable. No expiration.
      </p>
    </div>
  );
}
