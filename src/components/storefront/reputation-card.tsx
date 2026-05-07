// "Trust signals" card on public storefronts (Phase 2.3).
//
// Three render modes:
//   - stats present, tier shown          → full card with tier pill
//   - stats present, tier null + strikes → partial card (no tier, no
//                                          "no recent issues" badge,
//                                          completion/repeat rates
//                                          still display — partial card
//                                          per spec)
//   - stats null, opted in               → "Earning trust" empty state
//   - stats null, NOT opted in           → caller renders nothing
//                                          (component never sees this
//                                          path)
//
// Theme: takes a small subset of the storefront's resolved theme so the
// card visually inherits accent / border / fonts without coupling to
// the full theme object shape. Inline styles match the storefront-side
// component pattern (see verified-badge.tsx) — we intentionally avoid
// Tailwind here because the storefront mounts theme tokens as CSS vars
// and the card must read them rather than ship hardcoded utility
// classes.
//
// Privacy guarantees this component upholds:
//   - Never displays raw strike count (the prop type doesn't even
//     expose one).
//   - Never displays dispute counts, reasons, or client names.
//   - Never compares to other pros.
//   - No numeric overall score.

import type { ReputationStats, ReputationTier } from "@/lib/reputation-stats";

type CardTheme = {
  accent: string;
  ink: string;
  muted: string;
  surface: string;
  border: string;
  bodyFont: string;
  displayFont: string;
  radius?: number;
};

type Props = {
  stats: ReputationStats | null;
  theme: CardTheme;
  /**
   * When true, renders dimmed with a "Preview" caption above. Used by
   * the dashboard settings page so the pro can see what clients will
   * see before flipping the public toggle on.
   */
  preview?: boolean;
};

const TIER_LABEL: Record<ReputationTier, string> = {
  trusted: "Trusted",
  established: "Established",
  rising: "Rising",
};

// Tier pill background color is computed from the storefront accent so
// each layout's theme drives the visual treatment. We don't hardcode
// per-tier colors (e.g. green for trusted, blue for rising) on purpose
// — the spec's "positive signals only" framing means there's nothing
// to color-code negatively. All three tiers get the same accent
// treatment with different label text.

export function ReputationCard({ stats, theme, preview = false }: Props) {
  const radius = theme.radius ?? 12;
  const containerStyle: React.CSSProperties = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: radius,
    padding: 24,
    fontFamily: theme.bodyFont,
    color: theme.ink,
    opacity: preview ? 0.92 : 1,
  };

  return (
    <div style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px" }}>
      {preview && (
        <p
          style={{
            margin: "0 0 8px",
            fontFamily: theme.bodyFont,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: theme.muted,
          }}
        >
          Preview — visible to clients when the storefront opt-in is on
        </p>
      )}
      <section style={containerStyle} aria-label="Trust signals">
        {stats ? <FullCard stats={stats} theme={theme} /> : <EmptyState theme={theme} />}
      </section>
    </div>
  );
}

function FullCard({ stats, theme }: { stats: ReputationStats; theme: CardTheme }) {
  const showTier = stats.tier !== null && !stats.hasActiveStrikes;
  const showNoIssuesBadge = stats.hasZeroRecentStrikes && !stats.hasActiveStrikes;

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: theme.muted,
          }}
        >
          Trust signals
        </p>
        {showTier && stats.tier && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: 999,
              backgroundColor: hexWithAlpha(theme.accent, 0.12),
              color: theme.accent,
              fontFamily: theme.displayFont,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: ".02em",
            }}
          >
            {TIER_LABEL[stats.tier]}
          </span>
        )}
      </header>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <Stat
          label="Completion rate"
          value={`${Math.round(stats.completionRate * 100)}%`}
          sublabel={
            stats.proCancelledCount === 0
              ? "No pro cancellations in the window"
              : `Across ${stats.completedCount} completed booking${stats.completedCount === 1 ? "" : "s"}`
          }
          theme={theme}
        />
        {stats.repeatClientRate !== null && (
          <Stat
            label="Repeat clients"
            value={`${Math.round(stats.repeatClientRate * 100)}%`}
            sublabel={`Of bookings from clients who've booked before`}
            theme={theme}
          />
        )}
      </div>

      {showNoIssuesBadge && (
        <p
          style={{
            marginTop: 18,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            backgroundColor: "rgba(5,150,105,0.10)",
            color: "#047857",
            fontFamily: theme.bodyFont,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ✓ No recent reputation issues
        </p>
      )}

      <p
        style={{
          marginTop: 18,
          fontSize: 11,
          color: theme.muted,
          lineHeight: 1.55,
        }}
      >
        Computed from real bookings over the last {stats.windowDays} days.
        {showNoIssuesBadge &&
          ` "No recent issues" reflects the last ${stats.strikeWindowDays} days.`}
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  sublabel,
  theme,
}: {
  label: string;
  value: string;
  sublabel: string;
  theme: CardTheme;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: theme.muted,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 11,
            color: theme.muted,
            opacity: 0.75,
          }}
        >
          {sublabel}
        </p>
      </div>
      <span
        style={{
          fontFamily: theme.displayFont,
          fontSize: 22,
          fontWeight: 600,
          color: theme.ink,
          letterSpacing: ".01em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({ theme }: { theme: CardTheme }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        Earning trust
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: theme.displayFont,
          fontSize: 18,
          fontWeight: 500,
          color: theme.ink,
          lineHeight: 1.4,
        }}
      >
        This pro is new to OYRB.
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 14,
          color: theme.muted,
          lineHeight: 1.55,
        }}
      >
        Check back as they build their booking history.
      </p>
    </div>
  );
}

// Mix a hex color with an alpha. Falls back to the original string if
// the input doesn't parse — the storefront accent is sometimes an HSL
// or named color string from a custom theme.
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
