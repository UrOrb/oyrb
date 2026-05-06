// Single source of truth for the public TOS + Privacy version strings
// and the "is this user up to date?" comparison helper.
//
// Bump TOS_VERSION (or PRIVACY_VERSION) when the corresponding legal
// document materially changes. Existing users will see the in-app
// re-acceptance modal on their next dashboard navigation; new signups
// land directly on the bumped version.

export const TOS_VERSION = "v1.3";
export const PRIVACY_VERSION = "v1.1";

/**
 * Compares a vN.M version string against a required floor. Returns
 * `true` when the accepted version meets or exceeds the required one.
 *
 * String compare alone breaks on v1.10 vs v1.2, so we parse the dotted
 * segments to integers and compare element-by-element.
 */
export function meetsTosVersion(
  accepted: string | null | undefined,
  required: string = TOS_VERSION,
): boolean {
  if (!accepted) return false;
  const parse = (s: string) =>
    s.replace(/^v/i, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const a = parse(accepted);
  const r = parse(required);
  for (let i = 0; i < Math.max(a.length, r.length); i++) {
    const av = a[i] ?? 0;
    const rv = r[i] ?? 0;
    if (av > rv) return true;
    if (av < rv) return false;
  }
  return true;
}
