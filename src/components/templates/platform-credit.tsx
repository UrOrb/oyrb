/**
 * Platform attribution — "Powered by OYRB".
 *
 * Rendered by the platform's server-side React tree inside every layout
 * template. It is intentionally NOT driven by `template_content` or any
 * other user-editable row — that's the whole point. Removing this credit
 * requires changing code, not data.
 *
 * Guarantees, in order of strength:
 *
 *   1. STRUCTURAL. Every layout template (studio, luxe, clean, bold,
 *      original) renders <PlatformCredit /> unconditionally inside its
 *      footer. There is no `{condition && <PlatformCredit />}` anywhere —
 *      the React component tree cannot produce an OYRB page without this
 *      element. Any page request that returns HTML runs through a
 *      template, so the credit is present by construction.
 *
 *   2. CLASS OBFUSCATION. The wrapper class is derived from the deploy's
 *      commit SHA (Vercel surfaces VERCEL_GIT_COMMIT_SHA at build time),
 *      so a user can't ship CSS rules targeting a known class name in
 *      advance. Every deploy mints a new class; same-deploy instances
 *      share it so HTML caches stay consistent.
 *
 *   3. POLICY. ToS §24 prohibits removing, modifying, or obscuring this
 *      credit. Technical enforcement covers the in-app paths; the ToS
 *      covers determined bad actors (e.g. re-hosting exported HTML).
 *
 * If you ever add a "custom CSS" or "custom HTML" feature, sanitize user
 * submissions to strip any rule or element that would target the class
 * below, and reset the deploy-time class generator so old classes become
 * invalid.
 */

// Deploy-scoped class — changes on every Vercel deploy so a precomputed
// CSS rule in user-submitted markup (if that feature is ever added) won't
// carry across deploys.
const CLASS = `__oyrb_credit_${(process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 8)}`;

type Props = {
  /** Theme-aware muted color so the link blends with the surrounding
   *  footer but stays legible. Default falls back to a safe neutral. */
  color?: string;
};

export function PlatformCredit({ color = "#A3A3A3" }: Props) {
  return (
    <div
      className={CLASS}
      // Inline styles so user-authored stylesheets (current or future)
      // can't override size/visibility without a !important arms race
      // targeting this specific element. Position is by natural flow —
      // always the last element in the footer.
      style={{
        marginTop: 12,
        fontSize: 10,
        lineHeight: 1.6,
        letterSpacing: "0.02em",
        color,
        textAlign: "center",
        opacity: 0.85,
      }}
    >
      Powered by{" "}
      <a
        href="https://oyrb.space"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color,
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        OYRB
      </a>
    </div>
  );
}
