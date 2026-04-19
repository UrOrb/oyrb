import { ClientLoginForm } from "./client-login-form";

export const metadata = {
  title: "Client sign-in",
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ClientLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMsg =
    error === "expired"
      ? "That sign-in link expired. Enter your email to get a new one."
      : error === "missing"
      ? "Your sign-in link wasn't complete. Please request a new one."
      : null;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-6 py-20">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium text-[#B8896B]">Client sign-in</p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-[-0.02em]">
          Your bookings, one tap away.
        </h1>
        <p className="mt-3 text-sm text-[#525252]">
          Enter the email you used to book. We&apos;ll send you a sign-in link — no password needed.
        </p>
        {errorMsg && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">{errorMsg}</p>
        )}
        <div className="mt-6">
          <ClientLoginForm />
        </div>
        <p className="mt-8 text-center text-xs text-[#A3A3A3]">
          Are you a beauty pro?{" "}
          <a href="/login" className="underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
