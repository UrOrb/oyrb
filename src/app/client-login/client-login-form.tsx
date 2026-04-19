"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

export function ClientLoginForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/client-auth/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Try again.");
      else setSent(true);
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center">
        <Check className="mx-auto text-green-600" size={28} />
        <p className="mt-3 text-sm font-semibold text-green-900">Check your email</p>
        <p className="mt-1 text-xs leading-relaxed text-green-800">
          If we found bookings under <strong>{email}</strong>, a sign-in link is on its way. Check your inbox (and spam folder) — link expires in 20 minutes.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="mt-4 text-xs text-green-700 underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <div className="mt-1.5 flex items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-3 focus-within:border-[#B8896B]">
          <Mail size={14} className="text-[#A3A3A3]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !email}
        className="w-full rounded-md bg-[#0A0A0A] py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
