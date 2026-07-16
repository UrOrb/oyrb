import { signIn } from "./actions";

export const metadata = { title: "Sign in — STAXK" };

// Next 16: searchParams is async-only.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal">
          STAXK
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Single-user app — your Supabase credentials.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-caution px-3 py-2 text-sm text-caution"
          >
            Wrong email or password. Try again.
          </p>
        )}

        <form action={signIn} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </div>
          <button
            type="submit"
            className="mt-1 rounded-lg bg-signal px-3 py-2 font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
