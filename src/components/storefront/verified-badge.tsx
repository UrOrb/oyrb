// "✓ Verified" badge — renders next to the business name on storefronts
// when identity_verification_status === 'verified'. Pure trust signal —
// never a gate. The native title attribute provides the tooltip on hover.

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? 18 : 14;
  const fontSize = size === "md" ? 12 : 11;
  return (
    <span
      title="Identity verified through Stripe."
      aria-label="Identity verified through Stripe."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginLeft: 6,
        verticalAlign: "middle",
        padding: `2px ${size === "md" ? 8 : 6}px`,
        borderRadius: 999,
        backgroundColor: "rgba(5,150,105,0.10)",
        color: "#047857",
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
        cursor: "help",
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          d="M10 1.5l2.4 1.7 2.9-.4 1 2.7 2.4 1.7-1.1 2.7 1.1 2.7-2.4 1.7-1 2.7-2.9-.4L10 18.5l-2.4-1.7-2.9.4-1-2.7L1.3 12.8l1.1-2.7L1.3 7.4l2.4-1.7 1-2.7 2.9.4L10 1.5z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M6.5 10.5l2.5 2.5 4.5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}
