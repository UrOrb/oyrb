"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { TrustedProPeer } from "@/lib/pass-the-torch-storefront";

/**
 * Anchor id used by the vacation banner's "see who I trust" auto-scroll.
 * Templates pass this on the wrapping <section>.
 */
export const PROS_I_TRUST_ANCHOR = "pros-i-trust";

/**
 * The three Pass-the-Torch props every template accepts. Editor preview /
 * template browser callers pass nothing — `showTrustedPros` falsy means
 * the section never renders, preserving the legacy zero-data path.
 */
export type TrustedProsTemplateProps = {
  trustedPros?: TrustedProPeer[];
  referrerSlug?: string;
  showTrustedPros?: boolean;
};

interface ProsITrustProps {
  /** Up to 5 accepted referrals, position-ordered. */
  peers: TrustedProPeer[];
  /** The slug of the storefront we're rendering on — drives ?ref=. */
  referrerSlug: string;
  /**
   * Theme tokens lifted from src/lib/template-themes.ts. Each layout
   * passes its own values so the section inherits the layout's visual
   * language without duplicating style logic.
   */
  theme: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    border: string;
    radius: number;
    displayFont: string;
    bodyFont: string;
  };
  /**
   * Optional layout flavor for type/spacing. Default works for Original,
   * Studio, Clean. Bold leans into chunkier type; Luxe leans editorial.
   */
  variant?: "default" | "bold" | "editorial";
  /** Optional caption shown above the carousel (e.g., booking-flow disclosure). */
  caption?: React.ReactNode;
  /** Override the section heading text (defaults to "Pro Referrals"). */
  heading?: string;
  /**
   * When set, soft-filters peers by service-name match (case-insensitive
   * substring). If at least one peer matches, only matching peers
   * render. If none match, all peers render and a fallback caption is
   * shown (booking-flow "missing_service" trigger per Phase 1 spec).
   */
  filterServiceName?: string | null;
  /** Render the section section <section> wrapper (default true). When
   * embedded inside another container — like the booking widget — the
   * caller can opt out of the framing chrome. */
  renderSectionWrapper?: boolean;
}

const CARD_WIDTH = 296; // px — fits 2-3 per row on desktop, 1.5 on mobile
const CARD_GAP = 16;

export function ProsITrust({
  peers,
  referrerSlug,
  theme,
  variant = "default",
  caption,
  heading = "Pro Referrals",
  filterServiceName,
  renderSectionWrapper = true,
}: ProsITrustProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateChevronState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scrollByCard(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (CARD_WIDTH + CARD_GAP), behavior: "smooth" });
  }

  useEffect(() => {
    updateChevronState();
    function onResize() {
      updateChevronState();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // peers length is stable across renders for a given storefront load.
  }, [peers.length]);

  // Service-aware filter for the booking-flow "missing_service" trigger.
  // If at least one peer offers a matching service, only those render.
  // If none match, all peers render with a fallback note explaining why.
  let effectivePeers = peers;
  let fallbackNotice: string | null = null;
  if (filterServiceName) {
    const needle = filterServiceName.trim().toLowerCase();
    const matched = peers.filter((p) =>
      p.service_names.some(
        (s) =>
          s.toLowerCase() === needle ||
          s.toLowerCase().includes(needle) ||
          needle.includes(s.toLowerCase()),
      ),
    );
    if (matched.length > 0) {
      effectivePeers = matched;
    } else {
      fallbackNotice =
        "None of these pros offer that exact service, but here are my pro referrals.";
    }
  }

  if (effectivePeers.length === 0) return null;

  const headingSize =
    variant === "bold" ? 26 : variant === "editorial" ? 24 : 22;
  const headingWeight = variant === "bold" ? 800 : 600;
  // Section padding ~30% lighter than the prior pass.
  const sectionPaddingY = variant === "editorial" ? 44 : 32;

  const inner = (
    <>
      <h2
        style={{
          fontFamily: theme.displayFont,
          fontWeight: headingWeight,
          fontSize: headingSize,
          color: theme.ink,
          margin: 0,
        }}
      >
        {heading}
      </h2>

      {caption && (
        <div
          style={{
            fontFamily: theme.bodyFont,
            color: theme.muted,
            fontSize: 13,
            lineHeight: 1.55,
            marginTop: 10,
            maxWidth: 640,
          }}
        >
          {caption}
        </div>
      )}

      {fallbackNotice && (
        <p
          style={{
            fontFamily: theme.bodyFont,
            color: theme.muted,
            fontSize: 12.5,
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          {fallbackNotice}
        </p>
      )}

      <div className="group/carousel relative mt-5">
          {/* Left chevron — desktop hover only. Hidden on mobile (swipe). */}
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous referral"
            tabIndex={canScrollLeft ? 0 : -1}
            className={`absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-opacity duration-200 md:flex ${
              canScrollLeft
                ? "opacity-0 group-hover/carousel:opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            style={{
              background: theme.surface,
              color: theme.ink,
              border: `1px solid ${theme.border}`,
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Scroll track. Tailwind v4 arbitrary CSS hides the scrollbar
              cross-browser; snap-x makes each card's left edge align on
              touch swipes. */}
          <div
            ref={scrollRef}
            onScroll={updateChevronState}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
          >
            {effectivePeers.map((p) => (
              <div
                key={p.slug}
                className="snap-start shrink-0"
                style={{ width: CARD_WIDTH }}
              >
                <PeerCard
                  peer={p}
                  referrerSlug={referrerSlug}
                  theme={theme}
                  variant={variant}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next referral"
            tabIndex={canScrollRight ? 0 : -1}
            className={`absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-opacity duration-200 md:flex ${
              canScrollRight
                ? "opacity-0 group-hover/carousel:opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            style={{
              background: theme.surface,
              color: theme.ink,
              border: `1px solid ${theme.border}`,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
    </>
  );

  if (!renderSectionWrapper) {
    return inner;
  }

  return (
    <section
      id={PROS_I_TRUST_ANCHOR}
      style={{
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
        paddingTop: sectionPaddingY,
        paddingBottom: sectionPaddingY,
      }}
    >
      <div className="mx-auto max-w-5xl px-6">{inner}</div>
    </section>
  );
}

function PeerCard({
  peer,
  referrerSlug,
  theme,
  variant,
}: {
  peer: TrustedProPeer;
  referrerSlug: string;
  theme: ProsITrustProps["theme"];
  variant: NonNullable<ProsITrustProps["variant"]>;
}) {
  const specialty = peer.referral_specialty ?? peer.primary_specialty;
  const href = `/s/${peer.slug}?ref=${encodeURIComponent(referrerSlug)}`;
  const padding = variant === "editorial" ? 18 : 16;
  const avatarSize = 48;

  return (
    <a
      role="listitem"
      href={href}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        textDecoration: "none",
        display: "block",
        height: "100%",
        transition: "transform 150ms ease, box-shadow 150ms ease",
      }}
      className="group/peer hover:-translate-y-px"
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: 9999,
            overflow: "hidden",
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {peer.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={peer.profile_image_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImageIcon size={16} style={{ color: theme.muted }} />
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: theme.displayFont,
              fontSize: variant === "bold" ? 16 : 15,
              fontWeight: variant === "bold" ? 700 : 600,
              color: theme.ink,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {peer.business_name}
          </div>

          <div
            style={{
              marginTop: 2,
              fontSize: 10.5,
              color: theme.muted,
              letterSpacing: 0.2,
            }}
          >
            Independent professional
          </div>

          {specialty && (
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                padding: "1px 8px",
                borderRadius: 9999,
                background: `${theme.accent}22`,
                color: theme.accent,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "lowercase",
              }}
            >
              · {specialty}
            </span>
          )}
        </div>
      </div>

      {peer.vouch_note && (
        <p
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: theme.ink,
            fontStyle: "italic",
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          &ldquo;{peer.vouch_note}&rdquo;
        </p>
      )}

      <div
        className="group-hover/peer:underline"
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: theme.accent,
        }}
      >
        View their site
        <ArrowRight size={12} />
      </div>
    </a>
  );
}
