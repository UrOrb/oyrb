// "Original" layout — faithful port of the original OYRB zip-file designs.
// 11 distinct themes, each with its own hero, service rows, and ornaments.
// One component driven by theme ID, matching the original screens.jsx exactly.

import Image from "next/image";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS } from "@/lib/template-images";
import type { SampleService, SampleHour, SampleBusiness } from "@/lib/sample-data";

interface OriginalTemplateProps {
  theme: TemplateTheme;
  services?: SampleService[];
  hours?: SampleHour[];
  business?: SampleBusiness;
}

function fmt$(cents: number) { return `$${(cents / 100).toFixed(0)}`; }
function fmtDur(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Shared primitive helpers ──────────────────────────────────────────────────
function Kicker({ id, mono, accent, kicker, children, style }: {
  id: string; mono: string; accent: string; kicker?: string; children?: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, color: "#888", display: "flex", alignItems: "center", gap: 8, ...style }}>
      {kicker && <span style={{ color: accent }}>{kicker}</span>}
      {children}
    </div>
  );
}

function StarRow({ accent, n = 5 }: { accent: string; n?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={11} height={11} viewBox="0 0 12 12" fill={i < n ? accent : "none"} stroke={accent} strokeWidth="1">
          <path d="M6 1l1.5 3.3 3.5.4-2.6 2.4.8 3.5L6 8.9 2.8 10.6l.8-3.5L1 4.7l3.5-.4L6 1z" />
        </svg>
      ))}
    </div>
  );
}

function Ornament({ t }: { t: TemplateTheme }) {
  const s: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
  if (t.id === "aura" || t.id === "rose") return (
    <svg viewBox="0 0 80 12" width="80" height="12">
      <path d="M2 10 Q 40 -4 78 10" fill="none" stroke={t.accent2 ?? t.accent} strokeWidth="1.2" />
    </svg>
  );
  if (t.id === "luxe" || t.id === "noir") return (
    <div style={s}>
      <div style={{ width: 24, height: 1, background: t.accent }} />
      <div style={{ width: 4, height: 4, background: t.accent, transform: "rotate(45deg)" }} />
      <div style={{ width: 24, height: 1, background: t.accent }} />
    </div>
  );
  if (t.id === "earth" || t.id === "sage") return (
    <svg viewBox="0 0 60 12" width="60" height="12">
      <line x1="30" y1="0" x2="30" y2="12" stroke={t.accent2 ?? t.accent} strokeWidth="1" />
      <path d="M30 4 L 22 0 M30 6 L 20 4 M30 8 L 22 10" stroke={t.accent2 ?? t.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M30 4 L 38 0 M30 6 L 40 4 M30 8 L 38 10" stroke={t.accent2 ?? t.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
  if (t.id === "bold") return (
    <div style={{ display: "flex", gap: 4 }}>
      <div style={{ width: 12, height: 12, background: t.accent }} />
      <div style={{ width: 12, height: 12, background: t.accent2 ?? t.muted }} />
      <div style={{ width: 12, height: 12, background: t.ink }} />
    </div>
  );
  if (t.id === "street") return (
    <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1, color: t.accent }}>▞▞ EOF ▞▞</div>
  );
  if (t.id === "y2k") return (
    <div style={{ fontSize: 14, color: t.accent, letterSpacing: 4 }}>★ ✦ ★</div>
  );
  return <div style={{ width: 32, height: 1, background: t.border }} />;
}

// ── Hero section — each theme gets its exact layout ────────────────────────────
function Hero({ t, biz, bookHref }: { t: TemplateTheme; biz: TemplateTheme["business"]; bookHref: string }) {
  const heroUrl = unsplash(biz.heroImageId, 800);
  const portraitUrl = unsplash(biz.profileImageId, 400);

  if (t.id === "luxe" || t.id === "noir") return (
    <div style={{ background: t.bg, padding: "28px 20px 40px", position: "relative" }}>
      <div style={{ position: "absolute", top: 28, right: 20, fontFamily: "monospace", fontSize: 9, color: t.accent, letterSpacing: 3, writingMode: "vertical-rl" as const }}>EST. MMXVIII</div>
      <Kicker id={t.id} mono="monospace" accent={t.accent} style={{ marginBottom: 20 }}>Private Studio · By Appointment</Kicker>
      <h1 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 56, lineHeight: 1.0, letterSpacing: "-0.02em", margin: 0, color: t.ink, fontStyle: "italic" }}>
        {biz.name.split(" ")[0]}<br /><span style={{ color: t.accent }}>{biz.name.split(" ").slice(1).join(" ")}</span>
      </h1>
      <Ornament t={t} />
      <p style={{ fontFamily: t.bodyFont, fontSize: 14, color: t.muted, margin: "12px 0 0", lineHeight: 1.55 }}>{biz.tagline}</p>
      <div style={{ marginTop: 24, position: "relative", borderRadius: t.radius }}>
        <Image src={heroUrl} alt={biz.name} width={800} height={1000} className="w-full object-cover" style={{ borderRadius: t.radius, aspectRatio: "4/5" }} />
      </div>
      <div style={{ marginTop: 24 }}>
        <a href={bookHref} style={{ display: "block", width: "100%", background: t.btnBg, color: t.btnText, fontFamily: t.bodyFont, fontWeight: 500, fontSize: 14, textAlign: "center", padding: "16px", borderRadius: t.radiusBtn, textDecoration: "none" }}>Request Appointment</a>
      </div>
    </div>
  );

  if (t.id === "bold" || t.id === "citrus") return (
    <div style={{ background: t.ink, color: t.bg, padding: "24px 20px 28px" }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: t.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>◼ OPEN FOR BOOKING</div>
      <div style={{ fontFamily: t.displayFont, fontWeight: 900, fontSize: 68, lineHeight: 0.88, letterSpacing: "-0.045em", color: t.bg }}>
        {biz.name.toUpperCase().split(" ")[0]}.<br />
        <span style={{ color: t.accent }}>{biz.name.toUpperCase().split(" ").slice(1).join(" ") || "STUDIO"}</span>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ width: 10, height: 10, background: t.accent }} />
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 1, color: t.bg }}>{biz.tagline.toUpperCase()}</div>
      </div>
      <div style={{ marginTop: 20, position: "relative" }}>
        <Image src={heroUrl} alt={biz.name} width={800} height={1000} className="w-full object-cover" style={{ borderRadius: 8, aspectRatio: "4/5" }} />
        <div style={{ position: "absolute", bottom: -12, left: -4, background: t.accent, color: t.ink, fontFamily: t.displayFont, fontWeight: 900, fontSize: 14, padding: "6px 12px", letterSpacing: 1 }}>NEW WORK ⟶</div>
      </div>
      <div style={{ marginTop: 28 }}>
        <a href={bookHref} style={{ display: "block", background: t.accent, color: t.ink, fontFamily: t.displayFont, fontWeight: 900, fontSize: 15, textAlign: "center", padding: "16px", textDecoration: "none", letterSpacing: "0.05em", textTransform: "uppercase" }}>BOOK NOW →</a>
      </div>
    </div>
  );

  if (t.id === "street" || t.id === "slate") return (
    <div style={{ background: t.bg, color: t.ink, padding: "20px 18px 28px", position: "relative" }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: t.accent, letterSpacing: 2, marginBottom: 8 }}>
        // STUDIO · EST_2019 · ACCEPTING CLIENTS
      </div>
      <div style={{ fontFamily: t.displayFont, fontWeight: 800, fontSize: 64, lineHeight: 0.85, letterSpacing: "-0.045em", color: t.ink, textTransform: "uppercase" as const }}>
        {biz.name.split(" ")[0]}<span style={{ color: t.accent }}>/</span>{biz.name.split(" ").slice(1).join("")}
      </div>
      <div style={{ marginTop: 12, border: `1px solid ${t.border}`, padding: "10px 12px", display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 10, letterSpacing: 1, color: t.muted, textTransform: "uppercase" as const }}>
        <span>BY APPT · ONLY</span>
        <span style={{ color: t.accent }}>● LIVE</span>
      </div>
      <div style={{ marginTop: 14, position: "relative" }}>
        <Image src={heroUrl} alt={biz.name} width={800} height={800} className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
        <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 8px", background: t.accent, color: t.ink, fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>CLIENT_048</div>
      </div>
      <div style={{ marginTop: 14, fontFamily: t.bodyFont, fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{biz.tagline}</div>
      <div style={{ marginTop: 20 }}>
        <a href={bookHref} style={{ display: "block", background: t.btnBg, color: t.btnText, fontFamily: t.displayFont, fontWeight: 700, fontSize: 14, textAlign: "center", padding: "16px", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.05em" }}>▸ BOOK THE CHAIR</a>
      </div>
    </div>
  );

  if (t.id === "y2k") return (
    <div style={{ background: `linear-gradient(180deg, ${t.accent2}44 0%, ${t.bg} 40%)`, padding: "24px 20px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 40, right: -20, fontSize: 120, opacity: 0.25, color: t.accent, userSelect: "none" }}>★</div>
      <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, color: t.muted, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: t.accent }}>★</span> OPEN · come thru!!
      </div>
      <div style={{ fontFamily: t.displayFont, fontWeight: 900, fontSize: 62, lineHeight: 0.9, letterSpacing: "-0.03em", color: t.ink }}>
        {biz.name.toLowerCase().split(" ")[0]}<span style={{ color: t.accent }}>☆</span>
      </div>
      <div style={{ fontFamily: t.bodyFont, fontSize: 15, color: t.muted, fontWeight: 500, marginTop: 8 }}>{biz.tagline}</div>
      <div style={{ marginTop: 18, position: "relative" }}>
        <div style={{ borderRadius: 28, overflow: "hidden", border: `3px solid ${t.ink}`, boxShadow: `6px 6px 0 0 ${t.accent2 ?? t.muted}` }}>
          <Image src={heroUrl} alt={biz.name} width={800} height={1000} className="w-full object-cover" style={{ aspectRatio: "4/5" }} />
        </div>
        <div style={{ position: "absolute", top: -10, right: -6, background: t.accent, color: t.surface, fontFamily: t.displayFont, fontWeight: 900, fontSize: 13, padding: "8px 12px", borderRadius: 999, border: `2px solid ${t.ink}`, transform: "rotate(8deg)" }}>✧ NEW SET ✧</div>
      </div>
      <div style={{ marginTop: 24 }}>
        <a href={bookHref} style={{ display: "block", background: t.btnBg, color: t.btnText, fontFamily: t.displayFont, fontWeight: 900, fontSize: 15, textAlign: "center", padding: "16px", borderRadius: 999, textDecoration: "none" }}>☆ book me ☆</a>
      </div>
    </div>
  );

  if (t.id === "earth" || t.id === "sage") return (
    <div style={{ background: t.bg, padding: "28px 20px 32px" }}>
      <Kicker id={t.id} mono="monospace" accent={t.accent} kicker="✦" style={{ marginBottom: 16 }}>A small studio · since 2017</Kicker>
      <h1 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 44, lineHeight: 1.02, letterSpacing: "-0.01em", margin: 0, color: t.ink }}>
        Slow beauty,<br /><span style={{ color: t.accent, fontStyle: "italic" }}>grounded.</span>
      </h1>
      <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.muted, margin: "12px 0 20px", lineHeight: 1.55 }}>{biz.tagline}</p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
        <Image src={heroUrl} alt={biz.name} width={400} height={533} className="w-full object-cover" style={{ borderRadius: t.radius, aspectRatio: "3/4" }} />
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          <Image src={unsplash(biz.galleryIds[0] ?? biz.heroImageId, 300)} alt="" width={200} height={200} className="w-full object-cover" style={{ borderRadius: t.radius, aspectRatio: "1/1" }} />
          <Image src={unsplash(biz.galleryIds[1] ?? biz.heroImageId, 300)} alt="" width={200} height={200} className="w-full object-cover" style={{ borderRadius: t.radius, aspectRatio: "1/1" }} />
        </div>
      </div>
      <div style={{ margin: "24px auto", display: "flex", justifyContent: "center" }}><Ornament t={t} /></div>
      <a href={bookHref} style={{ display: "block", background: t.btnBg, color: t.btnText, fontFamily: t.bodyFont, fontWeight: 500, fontSize: 14, textAlign: "center", padding: "16px", borderRadius: t.radiusBtn, textDecoration: "none" }}>Book a treatment</a>
    </div>
  );

  if (t.id === "minimal") return (
    <div style={{ background: t.bg, padding: "60px 28px 40px" }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: t.muted, marginBottom: 48 }}>001 — {biz.name.toUpperCase()}</div>
      <h1 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 44, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 8px", color: t.ink, fontStyle: "italic" }}>
        {biz.name.split(" ")[0]}.
      </h1>
      <h2 style={{ fontFamily: t.bodyFont, fontWeight: 300, fontSize: 44, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 32px", color: t.ink }}>
        {biz.tagline}
      </h2>
      <Image src={heroUrl} alt={biz.name} width={800} height={1000} className="w-full object-cover" style={{ aspectRatio: "4/5" }} />
      <div style={{ marginTop: 32, fontFamily: t.bodyFont, fontSize: 13, lineHeight: 1.7, color: t.ink }}>{biz.bio ?? biz.tagline}</div>
      <div style={{ marginTop: 32 }}>
        <a href={bookHref} style={{ display: "block", background: t.btnBg, color: t.btnText, fontFamily: t.bodyFont, fontWeight: 500, fontSize: 14, textAlign: "center", padding: "16px", textDecoration: "none" }}>Book</a>
      </div>
    </div>
  );

  if (t.id === "rose" || t.id === "aura") return (
    // laveom / rose — centered masthead + link-in-bio tile grid
    <div style={{ background: t.bg, padding: "28px 20px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, margin: "0 auto 14px", overflow: "hidden", border: `1px solid ${t.border}` }}>
          <Image src={unsplash(biz.profileImageId, 144)} alt={biz.name} width={144} height={144} className="object-cover w-full h-full" />
        </div>
        <h1 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 42, color: t.ink, letterSpacing: "-0.02em", lineHeight: 1, margin: 0, fontStyle: "italic" }}>{biz.name}</h1>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: t.accent, textTransform: "uppercase" as const, marginTop: 6 }}>— studio —</div>
        <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.muted, marginTop: 14, lineHeight: 1.55 }}>{biz.tagline}</p>
      </div>
      <Image src={heroUrl} alt={biz.name} width={800} height={640} className="w-full object-cover" style={{ borderRadius: t.radius, aspectRatio: "5/4" }} />
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Book a treatment", sub: "Available now", primary: true },
          { label: "Service menu", sub: "View all" },
          { label: "Free consult", sub: "15 min intro" },
          { label: "Gift cards", sub: "Starting $50" },
        ].map((tile, i) => (
          <a key={i} href={bookHref} style={{
            display: "flex", flexDirection: "column" as const, justifyContent: "space-between",
            minHeight: 82, padding: "14px 16px", borderRadius: t.radius, textDecoration: "none",
            background: tile.primary ? t.ink : t.surface,
            color: tile.primary ? t.btnText : t.ink,
            border: tile.primary ? "none" : `1px solid ${t.border}`,
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" as const, opacity: 0.7, color: tile.primary ? t.btnText : t.muted }}>{tile.sub}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontFamily: t.displayFont, fontStyle: "italic", fontSize: 18, fontWeight: t.displayWeight }}>{tile.label}</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );

  // kawaii / default
  return (
    <div style={{ background: `linear-gradient(180deg, ${t.accent2 ?? t.accent}44 0%, ${t.bg} 40%)`, padding: "24px 20px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 60, right: -30, width: 140, height: 140, background: t.accent, opacity: 0.35, borderRadius: "50% 55% 45% 55% / 55% 45% 55% 45%" }} />
      <div style={{ position: "absolute", top: 18, right: 26, fontSize: 16, color: t.accent }}>❀</div>
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, color: t.muted, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: t.accent }}>{t.id === "y2k" ? "★" : "ꕥ"}</span> open & cozy <span style={{ color: t.accent }}>{t.id === "y2k" ? "★" : "ꕥ"}</span>
        </div>
        <h1 style={{ fontFamily: t.displayFont, fontStyle: "italic", fontWeight: t.displayWeight, fontSize: 54, lineHeight: 0.95, letterSpacing: "-0.02em", color: t.ink, margin: 0 }}>
          {biz.name.split(" ")[0]}<br /><span style={{ color: t.accent }}>{biz.name.split(" ").slice(1).join(" ")}</span>
        </h1>
        <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.muted, marginTop: 14, lineHeight: 1.55 }}>{biz.tagline}</p>
      </div>
      <div style={{ marginTop: 22, position: "relative" }}>
        <div style={{ borderRadius: 32, overflow: "hidden", border: `2px solid ${t.ink}`, boxShadow: `5px 5px 0 0 ${t.accent}` }}>
          <Image src={heroUrl} alt={biz.name} width={800} height={1000} className="w-full object-cover" style={{ aspectRatio: "4/5" }} />
        </div>
        <div style={{ position: "absolute", top: -10, left: -10, background: t.surface, border: `2px solid ${t.ink}`, borderRadius: 999, padding: "6px 12px", fontFamily: t.displayFont, fontStyle: "italic", fontSize: 13, color: t.ink, transform: "rotate(-6deg)", whiteSpace: "nowrap" as const }}>
          ꕥ new set!
        </div>
        <div style={{ position: "absolute", bottom: -12, right: -8, background: t.accent, color: t.surface, border: `2px solid ${t.ink}`, borderRadius: 999, padding: "6px 12px", fontFamily: t.displayFont, fontStyle: "italic", fontSize: 13, transform: "rotate(5deg)", whiteSpace: "nowrap" as const }}>
          so cute ✿
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <a href={bookHref} style={{ display: "block", background: t.btnBg, color: t.btnText, fontFamily: t.displayFont, fontWeight: 900, fontSize: 15, textAlign: "center", padding: "16px", borderRadius: 999, textDecoration: "none" }}>ꕥ book your cute time ꕥ</a>
      </div>
    </div>
  );
}

// ── Service row — 5 distinct styles ──────────────────────────────────────────
function ServiceRow({ t, svc, last, bookHref }: { t: TemplateTheme; svc: SampleService; last: boolean; bookHref: string }) {
  if (t.id === "bold" || t.id === "citrus") return (
    <a href={bookHref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: t.surface, padding: "18px 16px", borderRadius: 8, textDecoration: "none", marginBottom: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: t.displayFont, fontWeight: 900, fontSize: 17, color: t.ink, letterSpacing: "-0.02em", textTransform: "uppercase" as const, lineHeight: 1.1 }}>{svc.name}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1, color: t.muted, textTransform: "uppercase" as const, marginTop: 6 }}>{fmtDur(svc.duration_minutes)}</div>
      </div>
      <div style={{ background: t.accent, color: t.ink, padding: "8px 12px", fontFamily: t.displayFont, fontWeight: 900, fontSize: 16 }}>{fmt$(svc.price_cents)}</div>
    </a>
  );

  if (t.id === "street" || t.id === "slate") return (
    <a href={bookHref} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "center", padding: "16px 0", borderBottom: last ? "none" : `1px solid ${t.border}`, textDecoration: "none" }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: t.accent, letterSpacing: 1 }}>0{1}</div>
      <div>
        <div style={{ fontFamily: t.displayFont, fontWeight: 700, fontSize: 15, color: t.ink, textTransform: "uppercase" as const, letterSpacing: "0.5px", lineHeight: 1.2 }}>{svc.name}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: t.muted, marginTop: 4, letterSpacing: 1 }}>{fmtDur(svc.duration_minutes)}_MIN · {fmt$(svc.price_cents)}.00</div>
      </div>
      <div style={{ fontFamily: "monospace", color: t.accent, fontSize: 14 }}>▸</div>
    </a>
  );

  if (t.id === "y2k" || t.id === "citrus") return (
    <a href={bookHref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `2px solid ${t.ink}`, background: t.surface, padding: "14px 16px", borderRadius: 22, boxShadow: `3px 3px 0 0 ${t.accent2 ?? t.muted}`, marginBottom: 10, textDecoration: "none" }}>
      <div>
        <div style={{ fontFamily: t.displayFont, fontWeight: 900, fontSize: 16, color: t.ink, lineHeight: 1.1 }}>{svc.name}</div>
        <div style={{ fontFamily: t.bodyFont, fontSize: 12, color: t.muted, marginTop: 2 }}>{fmtDur(svc.duration_minutes)} min · so cute</div>
      </div>
      <div style={{ background: t.accent, color: t.surface, padding: "6px 12px", borderRadius: 999, fontFamily: t.displayFont, fontWeight: 900, fontSize: 15 }}>{fmt$(svc.price_cents)}</div>
    </a>
  );

  // editorial list (aura, luxe, earth, minimal, rose, sage, noir)
  return (
    <a href={bookHref} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "flex-start", padding: "18px 0", borderBottom: last ? "none" : `1px solid ${t.border}`, textDecoration: "none" }}>
      <div>
        <div style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 17, color: t.ink, letterSpacing: t.displayTracking, lineHeight: 1.2 }}>{svc.name}</div>
        <div style={{ fontFamily: t.bodyFont, fontSize: 12, color: t.muted, marginTop: 6, lineHeight: 1.5 }}>{svc.description}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, color: t.muted, textTransform: "uppercase" as const, marginTop: 8 }}>{fmtDur(svc.duration_minutes)}</div>
      </div>
      <div style={{ textAlign: "right", whiteSpace: "nowrap" as const }}>
        <div style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 18, color: t.ink }}>{fmt$(svc.price_cents)}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, color: t.accent, textTransform: "uppercase" as const, marginTop: 4 }}>book →</div>
      </div>
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function OriginalTemplate({ theme: t, services = [], hours = SAMPLE_HOURS, business }: OriginalTemplateProps) {
  // Merge real business data over the theme's sample business so the template
  // renders the pro's actual name/tagline/bio/photos. unsplash() returns full
  // URLs unchanged, so substituting hero/profile/gallery with real image URLs
  // works transparently throughout the template.
  const sample = t.business;
  const hasBiz = !!business;
  const biz = {
    ...sample,
    name: business?.name || sample.name,
    tagline: business?.tagline || sample.tagline,
    bio: business?.bio || sample.bio,
    location: business?.location || sample.location,
    phone: business?.phone || sample.phone,
    email: business?.email || sample.email,
    heroImageId: business?.hero_image_url || sample.heroImageId,
    profileImageId: business?.profile_image_url || sample.profileImageId,
    galleryIds: (business?.photos && business.photos.length > 0)
      ? business.photos
      : sample.galleryIds,
  };
  // Any Book button on a real business site should open the floating BookingWidget
  // (which listens for hash === "#book"). In preview mode (no real business),
  // keep a harmless mailto: fallback so the demo gallery still works.
  const demoEmail = biz.email || `hello@${biz.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const bookHref = hasBiz ? "#book" : `mailto:${demoEmail}`;

  // Instagram: prefer user-provided URL; fall back to a handle derived from business name
  const igHandle = (business?.instagram_url?.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "") || biz.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const igUrl = business?.instagram_url || `https://instagram.com/${igHandle}`;

  // Instagram grid: use uploaded gallery photos if present, else theme's sample gallery IDs via Unsplash
  const galleryFromBiz: string[] = (business?.photos ?? []) as string[];
  const galleryFromTheme: string[] = (biz.galleryIds ?? []).map(
    (id: string) => id.startsWith("http")
      ? id
      : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&q=80`
  );
  const igPhotos: string[] = (galleryFromBiz.length > 0 ? galleryFromBiz : galleryFromTheme).slice(0, 6);

  const reviews = [
    { name: "Simone R.", body: "I've never been treated with this much care. My skin looked lit from inside for a week.", stars: 5 },
    { name: "Jordan K.", body: "Booking was easy, the studio is serene, the work is meticulous. Worth every dollar.", stars: 5 },
    { name: "Priya M.", body: "Rebooked before I left. That says it all.", stars: 5 },
  ];

  const policies = [
    { title: "Deposit", body: "A 30% non-refundable deposit secures your appointment and is applied to your final total." },
    { title: "Cancellation", body: "48 hours notice required. Cancellations inside 48 hours forfeit the deposit; same-day cancels billed 50%." },
    { title: "Late arrivals", body: "After 15 minutes your service may be shortened or rescheduled to protect the next guest." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.ink, fontFamily: t.bodyFont }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: `${t.bg}dd`,
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          fontFamily: t.displayFont, fontWeight: t.displayWeight,
          fontSize: 16, color: t.ink,
          letterSpacing: (t.id === "street" || t.id === "slate") ? 1 : 0,
          textTransform: (t.id === "street" || t.id === "slate") ? "uppercase" as const : "none" as const,
        }}>{biz.name}</div>
        <a href={bookHref} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 36, padding: "0 16px",
          background: t.btnBg, color: t.btnText,
          borderRadius: t.radiusBtn, fontSize: 12, fontWeight: 600,
          textDecoration: "none", fontFamily: t.bodyFont,
        }}>Book</a>
      </div>

      {/* Constrained content width on large screens */}
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* ── Hero ── */}
        <Hero t={t} biz={biz} bookHref={bookHref} />

        {/* ── Stats strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, background: t.surface }}>
          {[{ k: "4.9", l: "rating" }, { k: "320+", l: "reviews" }, { k: "9 yrs", l: "practice" }].map((s, i) => (
            <div key={i} style={{ padding: "14px 10px", textAlign: "center", borderRight: i < 2 ? `1px solid ${t.border}` : "none" }}>
              <div style={{ fontFamily: t.displayFont, fontSize: 20, fontWeight: t.displayWeight, color: t.ink, letterSpacing: t.displayTracking }}>{s.k}</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, color: t.muted, textTransform: "uppercase" as const, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── About ── */}
        <section style={{ padding: "32px 22px", background: t.bg }}>
          <Kicker id={t.id} mono="monospace" accent={t.accent} kicker={t.id === "y2k" ? "★" : undefined} style={{ marginBottom: 10 }}>Meet the specialist</Kicker>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 8 }}>
            <div style={{ width: 82, flexShrink: 0, borderRadius: (t.id === "y2k" || t.id === "rose") ? 999 : t.radius, overflow: "hidden" }}>
              <Image src={unsplash(biz.profileImageId, 200)} alt={biz.name} width={164} height={164} className="object-cover w-full" style={{ aspectRatio: "1/1" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 20, color: t.ink, margin: 0, fontStyle: (t.id === "aura" || t.id === "luxe") ? "italic" : "normal", letterSpacing: t.displayTracking }}>{biz.name}</h2>
              <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.muted, marginTop: 8, lineHeight: 1.55 }}>{biz.bio}</p>
            </div>
          </div>
        </section>

        {/* ── Services ── */}
        <section style={{ padding: "8px 22px 32px", background: t.bg }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 28, color: t.ink, margin: 0, fontStyle: t.id === "aura" ? "italic" : "normal", letterSpacing: t.displayTracking }}>Services</h2>
            <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, color: t.muted, textTransform: "uppercase" as const }}>{services.length} offered</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: (t.id === "bold" || t.id === "y2k") ? 0 : 0 }}>
            {services.map((svc, i) => (
              <ServiceRow key={svc.id} t={t} svc={svc} last={i === services.length - 1} bookHref={bookHref} />
            ))}
          </div>
        </section>

        {/* ── Gallery ── */}
        {biz.galleryIds.length > 0 && (
          <section style={{ padding: "32px 22px", background: t.surface }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 28, color: t.ink, margin: 0, fontStyle: t.id === "aura" ? "italic" : "normal", letterSpacing: t.displayTracking }}>Portfolio</h2>
              <Kicker id={t.id} mono="monospace" accent={t.accent}>recent work</Kicker>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {biz.galleryIds.slice(0, 6).map((id, i) => (
                <div key={i} style={{ borderRadius: t.radius, overflow: "hidden", aspectRatio: (i === 0 || i === 3) ? "3/4" : "1/1" }}>
                  <Image src={unsplash(id, 400)} alt={`Work ${i + 1}`} width={400} height={i === 0 || i === 3 ? 533 : 400} className="w-full object-cover h-full transition-transform duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        <section style={{ padding: "32px 22px", background: t.bg }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 28, color: t.ink, margin: 0, fontStyle: t.id === "aura" ? "italic" : "normal", letterSpacing: t.displayTracking }}>What clients say</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StarRow accent={t.accent} n={5} />
              <span style={{ fontFamily: "monospace", fontSize: 10, color: t.muted, letterSpacing: 1 }}>4.9</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            {reviews.map((r, i) => (
              <div key={i} style={{
                background: t.surface,
                borderRadius: t.radius,
                padding: "16px 18px",
                border: (t.id === "street" || t.id === "bold") ? `1px solid ${t.border}` : "none",
                boxShadow: t.id === "y2k" ? `3px 3px 0 0 ${t.accent2 ?? t.muted}` : "none",
              }}>
                <StarRow accent={t.accent} n={r.stars} />
                <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.ink, margin: "10px 0 0", lineHeight: 1.55, fontStyle: (t.id === "aura" || t.id === "luxe") ? "italic" : "normal" }}>
                  &ldquo;{r.body}&rdquo;
                </p>
                <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, color: t.muted, textTransform: "uppercase" as const, marginTop: 10 }}>— {r.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Hours ── */}
        <section style={{ padding: "32px 22px", background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
          <Kicker id={t.id} mono="monospace" accent={t.accent} kicker={t.id === "y2k" ? "★" : undefined} style={{ marginBottom: 12 }}>Studio hours</Kicker>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {hours.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: t.bodyFont, fontSize: 14, color: t.ink }}>
                <span>{h.day}</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: h.open ? t.ink : t.muted, letterSpacing: 1 }}>
                  {h.open ? `${fmtTime(h.open_time)} — ${fmtTime(h.close_time)}` : "closed"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Policies ── */}
        <section style={{ padding: "32px 22px", background: t.bg }}>
          <h2 style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 22, color: t.ink, margin: "0 0 16px", fontStyle: t.id === "aura" ? "italic" : "normal", letterSpacing: t.displayTracking }}>Booking & policies</h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            {policies.map((p, i) => (
              <div key={i}>
                <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, color: t.accent, textTransform: "uppercase" as const, marginBottom: 4 }}>{p.title}</div>
                <p style={{ fontFamily: t.bodyFont, fontSize: 13, color: t.muted, margin: 0, lineHeight: 1.55 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Instagram ── */}
        <section style={{ padding: "32px 22px", background: t.surface }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <Kicker id={t.id} mono="monospace" accent={t.accent} style={{ marginBottom: 4 }}>Instagram</Kicker>
              <h3
                style={{
                  fontFamily: t.displayFont,
                  fontWeight: t.displayWeight,
                  fontSize: 20,
                  color: t.ink,
                  margin: 0,
                  fontStyle: t.id === "aura" ? "italic" : "normal",
                  letterSpacing: t.displayTracking,
                }}
              >
                @{igHandle}
              </h3>
            </div>
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                color: t.muted,
                textTransform: "uppercase" as const,
                textDecoration: "none",
              }}
            >
              follow →
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
            {igPhotos.map((src, i) => (
              <a
                key={i}
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  display: "block",
                  backgroundColor: i % 2 === 0 ? t.accent : t.accent2,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Instagram post ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </a>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section style={{ padding: "32px 22px 24px", background: t.surface, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><Ornament t={t} /></div>
          <Kicker id={t.id} mono="monospace" accent={t.accent} style={{ justifyContent: "center", marginBottom: 10 }}>Find the studio</Kicker>
          <p style={{ fontFamily: t.bodyFont, fontSize: 14, color: t.ink, maxWidth: 260, margin: "0 auto" }}>{biz.location}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <a href={bookHref} style={{ flex: 1, display: "block", background: "transparent", color: t.ink, border: `1px solid ${t.border}`, fontFamily: t.bodyFont, fontWeight: 500, fontSize: 14, textAlign: "center", padding: "14px", borderRadius: t.radiusBtn, textDecoration: "none" }}>Directions</a>
            <a href={bookHref} style={{ flex: 1, display: "block", background: "transparent", color: t.ink, border: `1px solid ${t.border}`, fontFamily: t.bodyFont, fontWeight: 500, fontSize: 14, textAlign: "center", padding: "14px", borderRadius: t.radiusBtn, textDecoration: "none" }}>Message</a>
          </div>
        </section>

        {/* ── Footer ── */}
        <div style={{ padding: "28px 22px 48px", background: t.surface, textAlign: "center" }}>
          <div style={{ fontFamily: t.displayFont, fontWeight: t.displayWeight, fontSize: 18, color: t.ink, letterSpacing: t.displayTracking }}>{biz.name}</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase" as const, marginTop: 6 }}>© 2026 · Powered by OYRB</div>
        </div>

      </div>
    </div>
  );
}
