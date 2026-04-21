"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user arrived from a "Use this template" link, stash the choice so it
  // survives email confirmation + Stripe checkout and can be applied to the
  // business once the webhook has created it.
  useEffect(() => {
    const layout = searchParams.get("layout");
    const theme = searchParams.get("theme");
    if (layout || theme) {
      try {
        localStorage.setItem(
          "oyrb_pending_template",
          JSON.stringify({ layout: layout ?? null, theme: theme ?? null })
        );
      } catch {}
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Auto-confirm projects: Supabase returns a live session and the user
    // is already signed in. Skip the "check your email" step entirely and
    // route them straight into the trial-start flow. If email confirmation
    // is turned on later, data.session will be null and we fall through
    // to the check-email screen below.
    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogle() {
    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  if (success) {
    return (
      <div className="mt-8 rounded-md border border-[#E7E5E4] p-6 text-center">
        <p className="font-display text-lg font-medium">Check your email.</p>
        <p className="mt-2 text-sm text-[#737373]">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">Full name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-[#B8896B] focus:ring-2 focus:ring-[#B8896B]/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-[#B8896B] focus:ring-2 focus:ring-[#B8896B]/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-[#B8896B] focus:ring-2 focus:ring-[#B8896B]/20"
        />
      </div>

      <label className="mt-1 flex items-start gap-2 text-xs text-[#525252]">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" className="font-medium text-[#B8896B] underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" className="font-medium text-[#B8896B] underline">
            Privacy Policy
          </a>
          , including the auto-renewal and chargeback policies.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !agreed}
        className="mt-2 rounded-md bg-[#0A0A0A] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-[#E7E5E4]" />
        <span className="text-xs text-[#A3A3A3]">or</span>
        <div className="flex-1 border-t border-[#E7E5E4]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="flex items-center justify-center gap-3 rounded-md border border-[#E7E5E4] py-2.5 text-sm font-medium transition-colors hover:bg-[#F5F5F4]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}
