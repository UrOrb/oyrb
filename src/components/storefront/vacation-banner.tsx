"use client";

import { Palmtree } from "lucide-react";
import { PROS_I_TRUST_ANCHOR } from "./pros-i-trust";

interface VacationBannerProps {
  /** Display name of the pro who's away. */
  businessName: string;
  /** ISO start. */
  vacationStart: string;
  /** ISO end. */
  vacationEnd: string;
  /** Optional pro-authored line. Falls through to a default. */
  message?: string | null;
  /** True when the storefront has at least one accepted referral to scroll to. */
  hasTrustedPros: boolean;
  theme: {
    accent: string;
    ink: string;
    surface: string;
    border: string;
    bodyFont: string;
  };
}

export function VacationBanner({
  businessName,
  vacationStart,
  vacationEnd,
  message,
  hasTrustedPros,
  theme,
}: VacationBannerProps) {
  const start = new Date(vacationStart);
  const end = new Date(vacationEnd);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const range = `${fmt(start)} – ${fmt(end)}`;

  const defaultCopy = `${businessName} is away ${range}. While they're out, see their pro referrals below.`;
  const proCopy = message?.trim();

  function scrollToProsITrust() {
    if (!hasTrustedPros) return;
    const el = document.getElementById(PROS_I_TRUST_ANCHOR);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Render as a button so the entire banner is one clear, accessible
  // affordance when there are trusted pros to surface. When the pro is
  // away with NO referrals we still show the away state but it's not
  // clickable — there's nowhere to scroll.
  const Tag = hasTrustedPros ? "button" : "div";

  return (
    <Tag
      type={hasTrustedPros ? "button" : undefined}
      onClick={hasTrustedPros ? scrollToProsITrust : undefined}
      aria-label={hasTrustedPros ? "Jump to pro referrals" : undefined}
      style={{
        width: "100%",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        padding: "12px 24px",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: hasTrustedPros ? "pointer" : "default",
        fontSize: 14,
        lineHeight: 1.4,
      }}
    >
      <Palmtree size={16} style={{ color: theme.accent, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {proCopy ? (
          <>
            <strong style={{ fontWeight: 600 }}>
              {businessName} is away {range}.
            </strong>{" "}
            {proCopy}
          </>
        ) : (
          defaultCopy
        )}
      </span>
      {hasTrustedPros && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.accent,
            whiteSpace: "nowrap",
          }}
          aria-hidden="true"
        >
          See pro referrals →
        </span>
      )}
    </Tag>
  );
}
