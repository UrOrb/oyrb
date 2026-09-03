"use client";

import { useState } from "react";

// "Have an Etsy code? Redeem it" — posts to the server-only
// /api/dashboard/redeem-code endpoint. On success the parent refreshes the
// server props (templateUnlocks), so the newly unlocked theme drops into
// the Theme grid below without a full reload.

type Props = {
  onRedeemed: (theme: string, layout: string | null) => void;
};

type Msg = { type: "ok" | "info" | "err"; text: string };

export function RedeemCodeBox({ onRedeemed }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        alreadyRedeemed?: boolean;
        theme?: string;
        layout?: string | null;
        message?: string;
        error?: string;
      };

      if (res.ok && data.success && data.theme) {
        setMsg({
          type: "ok",
          text: `Unlocked the “${data.theme}” template — it’s selected in the preview and in your themes below.`,
        });
        setCode("");
        onRedeemed(data.theme, data.layout ?? null);
      } else if (res.ok && data.alreadyRedeemed && data.theme) {
        setMsg({
          type: "info",
          text: data.message ?? "You’ve already redeemed this code.",
        });
        setCode("");
        onRedeemed(data.theme, data.layout ?? null);
      } else if (res.status === 401) {
        setMsg({ type: "err", text: "Log in to redeem a code." });
      } else {
        setMsg({
          type: "err",
          text: data.error ?? "Something went wrong. Try again.",
        });
      }
    } catch {
      setMsg({ type: "err", text: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-3"
    >
      <p className="text-xs font-medium text-[#525252]">
        Have an Etsy code? Redeem it
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-[#A3A3A3]"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-2 text-[11px] ${
            msg.type === "ok"
              ? "text-green-700"
              : msg.type === "info"
                ? "text-[#525252]"
                : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
