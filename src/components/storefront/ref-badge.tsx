import { Heart } from "lucide-react";

/**
 * Small "Recommended by [name]" pill rendered when a storefront is
 * loaded with a `?ref=<slug>` query param. The badge sits at the very
 * top of the storefront, above the template's own hero, so the
 * referral context is the first thing the visitor sees.
 *
 * Themed via the storefront's accent + ink + surface tokens so it
 * blends with whatever layout/theme combination the destination pro
 * is using.
 */
export function RefBadge({
  referrerName,
  theme,
}: {
  referrerName: string;
  theme: { accent: string; ink: string; surface: string; border: string; bodyFont: string };
}) {
  return (
    <div
      role="note"
      style={{
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        padding: "10px 24px",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textAlign: "center",
      }}
    >
      <Heart size={14} style={{ color: theme.accent, flexShrink: 0 }} aria-hidden="true" />
      <span>
        Recommended by{" "}
        <strong style={{ fontWeight: 600 }}>{referrerName}</strong>
      </span>
    </div>
  );
}
