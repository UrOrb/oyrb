// Pure phone-number utilities. No runtime dependencies — safe to
// import from client components, server components, route handlers,
// and edge code alike.
//
// Lives in its own file (instead of src/lib/sms.ts where this function
// originally lived) so client components can normalize a phone for
// preview / comparison without dragging the SMS-sending module's
// transitive deps (notification-log → supabase/server → next/headers)
// into the client bundle. That chain previously broke the Vercel
// build with "next/headers in Pages Router context" — the bundler
// flags any client-imported module that reaches a next/headers user.
//
// `src/lib/sms.ts` re-exports normalizeToE164 from here so existing
// server-side callers don't need to update their imports.

/**
 * Normalize a US-style phone number to E.164. Returns null when the
 * input doesn't match a known shape (10 digits, 11 digits starting
 * with 1, or already-prefixed +).
 *
 *   "(404) 555-1234"  → "+14045551234"
 *   "404 555 1234"    → "+14045551234"
 *   "1-404-555-1234"  → "+14045551234"
 *   "+14045551234"    → "+14045551234"
 *   "abcd"            → null
 *   "555-1234"        → null
 */
export function normalizeToE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
