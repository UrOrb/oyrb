// Template theme definitions — 12 complete design systems
// Each theme drives colors, typography, shape, and vibe

export interface TemplateTheme {
  id: string;
  name: string;
  vibe: string;
  category: "feminine" | "editorial" | "natural" | "bold" | "minimal" | "street";
  /** Hand-picked featured theme — surfaces in the "⭐ Featured Templates"
   *  row on /templates. Flip this flag per-theme to rotate the featured set
   *  without code changes elsewhere. */
  is_featured?: boolean;
  // palette
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  // type
  displayFont: string;
  bodyFont: string;
  displayWeight: number;
  displayTracking: string;
  // shape
  radius: number;
  radiusBtn: number;
  btnBg: string;
  btnText: string;
  // tags
  tags: string[];
  // sample business profile for this theme
  business: ThemeBusiness;
}

export interface ThemeBusiness {
  name: string;
  tagline: string;
  bio: string;
  location: string;
  phone: string;
  email: string;
  category: string;
  heroImageId: string;
  profileImageId: string;
  galleryIds: string[];
}

export const TEMPLATE_THEMES: Record<string, TemplateTheme> = {
  // ── 1. Aura ──────────────────────────────────────────────────────────────
  aura: {
    id: "aura",
    name: "Aura",
    vibe: "Soft feminine · blush · cream · serif",
    category: "feminine",
    bg: "#F5EDE4",
    surface: "#FBF5EE",
    ink: "#2A1E17",
    muted: "#8A6F5E",
    accent: "#D9B5A4",
    accent2: "#5B3A27",
    border: "rgba(42,30,23,0.12)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Fraunces", Georgia, serif',
    displayWeight: 350,
    displayTracking: "-0.02em",
    radius: 18,
    radiusBtn: 999,
    btnBg: "#2A1E17",
    btnText: "#F5EDE4",
    tags: ["feminine", "soft", "luxury", "spa"],
    business: {
      name: "Aura & Oak Studio",
      tagline: "Skin rituals & ethereal beauty",
      bio: "Licensed esthetician with a decade of quiet, intentional work in skin care. I build rituals, not routines — every treatment is customized to your skin's unique story.",
      location: "Studio 3 · 14 Linden Row · Savannah, GA",
      phone: "(912) 555-0184",
      email: "hello@auraandoak.com",
      category: "Esthetics & Skincare",
      heroImageId: "/aura-hero.jpeg",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1552693673-1bf958298935","1540555700478-4be289fbecef",
        "1556228720-195a672e8a03","1519699047748-de8e457a634e",
        "1620916566398-39f1143ab7be","1516975080664-ed2fc6a32937",
        "1515377905703-c4788e51af15","1612817288484-6f916006741a",
      ],
    },
  },

  // ── 2. Luxe ──────────────────────────────────────────────────────────────
  luxe: {
    id: "luxe",
    name: "Luxe",
    vibe: "Editorial · ink & gold · high contrast",
    category: "editorial",
    bg: "#0E0B0A",
    surface: "#17120F",
    ink: "#EFE6D3",
    muted: "#9A8B70",
    accent: "#C9A35B",
    accent2: "#EFE6D3",
    border: "rgba(239,230,211,0.14)",
    displayFont: '"Playfair Display", "DM Serif Display", Georgia, serif',
    bodyFont: '"Fraunces", Georgia, serif',
    displayWeight: 400,
    displayTracking: "0em",
    radius: 4,
    radiusBtn: 2,
    btnBg: "#C9A35B",
    btnText: "#0E0B0A",
    tags: ["editorial", "luxury", "dark", "gold"],
    business: {
      name: "Midnight Atelier",
      tagline: "By appointment. After hours.",
      bio: "Couture beauty for editorial, events, and those who simply prefer the evening. Private studio, strict clientele. Every look is a statement.",
      location: "Atelier No. 7 · 212 Crown St · Manhattan, NY",
      phone: "(212) 555-0917",
      email: "book@midnightatelier.com",
      category: "Beauty & Makeup Artistry",
      heroImageId: "/luxe-hero.avif",
      profileImageId: "1492106087820-71f1a00d2b11",
      galleryIds: [
        "1604654894610-df63bc536371","1531746020798-e6953c6e8e04",
        "1516975080664-ed2fc6a32937","1492106087820-71f1a00d2b11",
        "1517365830460-955ce3ccd263","1488426862026-3ee34a7d66df",
        "1526045478516-99145907023c","1505932794465-147d1f1b2c97",
      ],
    },
  },

  // ── 3. Earth ─────────────────────────────────────────────────────────────
  earth: {
    id: "earth",
    name: "Earth",
    vibe: "Organic · sage · terracotta · botanical",
    category: "natural",
    bg: "#E9E2D2",
    surface: "#F2ECDD",
    ink: "#2F3A2A",
    muted: "#6E7364",
    accent: "#B6563A",
    accent2: "#7D9471",
    border: "rgba(47,58,42,0.16)",
    displayFont: '"Libre Caslon Text", "Fraunces", Georgia, serif',
    bodyFont: '"Work Sans", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: 2,
    radiusBtn: 999,
    btnBg: "#2F3A2A",
    btnText: "#E9E2D2",
    tags: ["natural", "organic", "earthy", "botanical"],
    business: {
      name: "Fern & Clay Studio",
      tagline: "Slow beauty, grounded in plant ritual",
      bio: "Herbalist and skin specialist. Treatments rooted in botanical tradition — gua sha, face mapping, and the body you actually have. No rushing here.",
      location: "The Greenhouse · 88 Cedar Lane · Ojai, CA",
      phone: "(805) 555-0263",
      email: "hello@fernandclay.com",
      category: "Holistic Skincare & Wellness",
      heroImageId: "/earth-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1608248597279-f99d160bfcbc","1515377905703-c4788e51af15",
        "1540555700478-4be289fbecef","1552693673-1bf958298935",
        "1620916566398-39f1143ab7be","1556228720-195a672e8a03",
        "1612817288484-6f916006741a","1526045478516-99145907023c",
      ],
    },
  },

  // ── 4. Bold ──────────────────────────────────────────────────────────────
  bold: {
    id: "bold",
    name: "Bold",
    vibe: "Color blocks · big type · high energy",
    category: "bold",
    bg: "#F3EFE9",
    surface: "#FFFFFF",
    ink: "#111111",
    muted: "#666666",
    accent: "#FF5B1F",
    accent2: "#1F3BFF",
    border: "rgba(0,0,0,0.14)",
    displayFont: '"Archivo Black", "Archivo", system-ui, sans-serif',
    bodyFont: '"Archivo", system-ui, sans-serif',
    displayWeight: 900,
    displayTracking: "-0.04em",
    radius: 8,
    radiusBtn: 8,
    btnBg: "#111111",
    btnText: "#FFFFFF",
    tags: ["bold", "graphic", "modern", "editorial"],
    business: {
      name: "BLOCK STUDIO",
      tagline: "Makeup. Brows. Big energy.",
      bio: "Editorial makeup artist, brow architect, and full-time maximalist. Every face is a thesis statement. Specializing in events, editorial, and everyday glam.",
      location: "5th Floor · 909 Broadway · Brooklyn, NY",
      phone: "(718) 555-0456",
      email: "book@blockstudio.co",
      category: "Makeup & Brow Artistry",
      heroImageId: "/bold-hero.avif",
      profileImageId: "1517365830460-955ce3ccd263",
      galleryIds: [
        "1516975080664-ed2fc6a32937","1517365830460-955ce3ccd263",
        "1526045478516-99145907023c","1531746020798-e6953c6e8e04",
        "1492106087820-71f1a00d2b11","1505932794465-147d1f1b2c97",
        "1488426862026-3ee34a7d66df","1549236177-f9b0031756eb",
      ],
    },
  },

  // ── 5. Blanc ─────────────────────────────────────────────────────────────
  minimal: {
    id: "minimal",
    name: "Blanc",
    vibe: "Minimal clean · whitespace · type-led",
    category: "minimal",
    bg: "#FAFAF7",
    surface: "#FFFFFF",
    ink: "#181716",
    muted: "#8C8A85",
    accent: "#181716",
    accent2: "#C9C6BE",
    border: "rgba(24,23,22,0.10)",
    displayFont: '"Instrument Serif", "Fraunces", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.02em",
    radius: 0,
    radiusBtn: 0,
    btnBg: "#181716",
    btnText: "#FAFAF7",
    tags: ["minimal", "clean", "luxury", "type-led"],
    business: {
      name: "Blanc",
      tagline: "Nails. Quietly considered.",
      bio: "Precision manicures in a calm room. Japanese gels, sculpted extensions, and an aversion to anything loud. Every appointment is 90 minutes of pure focus.",
      location: "Suite 4 · 1400 Abbot Kinney · Venice, CA",
      phone: "(310) 555-0847",
      email: "hello@blancnails.com",
      category: "Nail Art & Extensions",
      heroImageId: "/minimal-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1604654894610-df63bc536371","1516975080664-ed2fc6a32937",
        "1540555700478-4be289fbecef","1519014816548-bf5fe059798b",
        "1620916566398-39f1143ab7be","1526045478516-99145907023c",
        "1612817288484-6f916006741a","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 6. Street ────────────────────────────────────────────────────────────
  street: {
    id: "street",
    name: "Street",
    vibe: "Streetwear · high contrast · barber culture",
    category: "street",
    bg: "#0A0A0A",
    surface: "#141414",
    ink: "#F2F2F2",
    muted: "#8A8A8A",
    accent: "#C6FF3D",
    accent2: "#FF2D55",
    border: "rgba(242,242,242,0.16)",
    displayFont: '"Archivo", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    displayWeight: 800,
    displayTracking: "-0.03em",
    radius: 0,
    radiusBtn: 0,
    btnBg: "#C6FF3D",
    btnText: "#0A0A0A",
    tags: ["streetwear", "barber", "bold", "dark"],
    business: {
      name: "SHEAR/CODE",
      tagline: "Barbering. Taper. Line-up. No small talk.",
      bio: "Sharp cuts for people with taste. Appointments only. Walk-ins get laughed at. Specializing in fades, tapers, and precision line-ups since 2019.",
      location: "Shop 02 · 44 Foundry St · Oakland, CA",
      phone: "(510) 555-0213",
      email: "cuts@shearcode.co",
      category: "Barbershop",
      heroImageId: "/street-hero.avif",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1654097800369-abc063d657c4","1654097801176-cb1795fd0c5e",
        "1571019613454-1cb2f99b2d8b","1508214751196-bcfd4ca60f91",
        "1552374196-c4e7ffc6e126","1583195764036-6dc248ac07d9",
        "1492106087820-71f1a00d2b11","1517841905240-472988babdf9",
      ],
    },
  },

  // ── 7. Y2K ───────────────────────────────────────────────────────────────
  y2k: {
    id: "y2k",
    name: "Y2K",
    vibe: "Playful · bright · chunky · retro fun",
    category: "bold",
    bg: "#FFE0EE",
    surface: "#FFF3F9",
    ink: "#3B0A2A",
    muted: "#8B4E73",
    accent: "#FF3EA5",
    accent2: "#6FE3FF",
    border: "rgba(59,10,42,0.18)",
    displayFont: '"Darker Grotesque", "Syne", system-ui, sans-serif',
    bodyFont: '"Darker Grotesque", system-ui, sans-serif',
    displayWeight: 900,
    displayTracking: "-0.03em",
    radius: 28,
    radiusBtn: 999,
    btnBg: "#FF3EA5",
    btnText: "#FFF3F9",
    tags: ["y2k", "playful", "pink", "fun", "lashes"],
    business: {
      name: "GLOSSBABY ☆",
      tagline: "lashes · lips · lil treats",
      bio: "Lash tech + gloss girlie slash your lil bestie. I make you hot. That's it that's the bio. Book me before I'm full. Which is like. Always.",
      location: "The Pink Room · 2120 Ocean Ave · Miami, FL",
      phone: "(305) 555-0772",
      email: "hey@glossbaby.co",
      category: "Lash Extensions & Beauty",
      heroImageId: "/y2k-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1517365830460-955ce3ccd263","1531746020798-e6953c6e8e04",
        "1540555700478-4be289fbecef","1519699047748-de8e457a634e",
        "1505932794465-147d1f1b2c97","1488426862026-3ee34a7d66df",
        "1526045478516-99145907023c","1549236177-f9b0031756eb",
      ],
    },
  },

  // ── 8. Rose ──────────────────────────────────────────────────────────────
  rose: {
    id: "rose",
    name: "Rose",
    vibe: "Romantic · dusty rose · soft gold",
    category: "feminine",
    bg: "#FDF6F0",
    surface: "#FFFFFF",
    ink: "#2D1B1B",
    muted: "#9B7B7B",
    accent: "#E8927C",
    accent2: "#C4956A",
    border: "rgba(45,27,27,0.10)",
    displayFont: '"Cormorant Garamond", "Fraunces", Georgia, serif',
    bodyFont: '"Raleway", system-ui, sans-serif',
    displayWeight: 300,
    displayTracking: "0.02em",
    radius: 12,
    radiusBtn: 999,
    btnBg: "#2D1B1B",
    btnText: "#FDF6F0",
    tags: ["romantic", "rose", "feminine", "soft"],
    business: {
      name: "Rose Atelier",
      tagline: "Where beauty feels like self-love",
      bio: "A sanctuary for women who want more than just a service. Every visit is a ritual. Specializing in bridal beauty, color, and extensions that feel like yours.",
      location: "212 Rose Garden Row · Charleston, SC",
      phone: "(843) 555-0318",
      email: "hello@roseatelier.com",
      category: "Bridal & Hair Artistry",
      heroImageId: "/rose-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1549236177-f9b0031756eb","1519699047748-de8e457a634e",
        "1582095133179-bfd08e2fc6b3","1505932794465-147d1f1b2c97",
        "1517365830460-955ce3ccd263","1488426862026-3ee34a7d66df",
        "1540555700478-4be289fbecef","1492106087820-71f1a00d2b11",
      ],
    },
  },

  // ── 9. Sage ──────────────────────────────────────────────────────────────
  sage: {
    id: "sage",
    name: "Sage",
    vibe: "Green · wellness · calm · nature-forward",
    category: "natural",
    bg: "#F0F4EF",
    surface: "#FFFFFF",
    ink: "#1A2C1E",
    muted: "#6B7F6D",
    accent: "#4A7C59",
    accent2: "#8FAF8B",
    border: "rgba(26,44,30,0.12)",
    displayFont: '"DM Serif Display", "Fraunces", Georgia, serif',
    bodyFont: '"DM Sans", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.015em",
    radius: 16,
    radiusBtn: 8,
    btnBg: "#1A2C1E",
    btnText: "#F0F4EF",
    tags: ["green", "wellness", "natural", "calm"],
    business: {
      name: "Sage & Stone Wellness",
      tagline: "Beauty rooted in balance",
      bio: "Holistic hair and wellness services. We believe healthy hair starts with a healthy scalp and a calm mind. Natural color, scalp treatments, and intentional care.",
      location: "88 Cypress Lane · Portland, OR",
      phone: "(503) 555-0641",
      email: "book@sageandstone.co",
      category: "Hair & Wellness",
      heroImageId: "/sage-hero.avif",
      profileImageId: "1519699047748-de8e457a634e",
      galleryIds: [
        "1620916566398-39f1143ab7be","1519699047748-de8e457a634e",
        "1608248597279-f99d160bfcbc","1582095133179-bfd08e2fc6b3",
        "1612817288484-6f916006741a","1556228720-195a672e8a03",
        "1540555700478-4be289fbecef","1515377905703-c4788e51af15",
      ],
    },
  },

  // ── 10. Slate ────────────────────────────────────────────────────────────
  slate: {
    id: "slate",
    name: "Slate",
    vibe: "Navy · professional · sleek · corporate chic",
    category: "minimal",
    bg: "#F4F6F9",
    surface: "#FFFFFF",
    ink: "#0F1F3D",
    muted: "#6B7A99",
    accent: "#2E5BFF",
    accent2: "#1A3A6B",
    border: "rgba(15,31,61,0.10)",
    displayFont: '"Plus Jakarta Sans", system-ui, sans-serif',
    bodyFont: '"Plus Jakarta Sans", system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: "-0.02em",
    radius: 10,
    radiusBtn: 6,
    btnBg: "#0F1F3D",
    btnText: "#FFFFFF",
    tags: ["professional", "navy", "corporate", "clean"],
    business: {
      name: "The Style Suite",
      tagline: "Premium grooming for the modern professional",
      bio: "Precision cuts, beard sculpting, and grooming services for professionals who demand the best. By appointment only. Same-day bookings available Monday through Friday.",
      location: "One Liberty Plaza · Suite 1200 · New York, NY",
      phone: "(646) 555-0882",
      email: "book@thestylesuite.com",
      category: "Premium Grooming",
      heroImageId: "/slate-hero.avif",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1654097801176-cb1795fd0c5e","1654097800369-abc063d657c4",
        "1571019613454-1cb2f99b2d8b","1583195764036-6dc248ac07d9",
        "1552374196-c4e7ffc6e126","1492106087820-71f1a00d2b11",
        "1517841905240-472988babdf9","1508214751196-bcfd4ca60f91",
      ],
    },
  },

  // ── 11. Noir ─────────────────────────────────────────────────────────────
  noir: {
    id: "noir",
    name: "Noir",
    vibe: "Dark moody · silver · deep velvet",
    category: "editorial",
    bg: "#111218",
    surface: "#1C1D26",
    ink: "#F0EEF8",
    muted: "#7B7A94",
    accent: "#A78BFA",
    accent2: "#6D56E8",
    border: "rgba(240,238,248,0.12)",
    displayFont: '"Syne", system-ui, sans-serif',
    bodyFont: '"Syne", system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: "-0.025em",
    radius: 8,
    radiusBtn: 4,
    btnBg: "#A78BFA",
    btnText: "#111218",
    tags: ["dark", "moody", "purple", "night"],
    business: {
      name: "NOIR COLLECTIVE",
      tagline: "Where darkness is the aesthetic.",
      bio: "Avant-garde hair and beauty for those who see beauty differently. Vivid color, editorial cuts, and transformative styling. Not for the faint of heart.",
      location: "Underground · 77 Raven St · Los Angeles, CA",
      phone: "(323) 555-0449",
      email: "create@noircollective.co",
      category: "Editorial Hair & Beauty",
      heroImageId: "/noir-hero.avif",
      profileImageId: "1517365830460-955ce3ccd263",
      galleryIds: [
        "1492106087820-71f1a00d2b11","1517365830460-955ce3ccd263",
        "1516975080664-ed2fc6a32937","1526045478516-99145907023c",
        "1531746020798-e6953c6e8e04","1488426862026-3ee34a7d66df",
        "1604654894610-df63bc536371","1519699047748-de8e457a634e",
      ],
    },
  },

  // ── 12. Citrus ───────────────────────────────────────────────────────────
  citrus: {
    id: "citrus",
    name: "Citrus",
    vibe: "Bright · sunny · vibrant · tropical",
    category: "bold",
    bg: "#FFFBF0",
    surface: "#FFFFFF",
    ink: "#1A1200",
    muted: "#806F40",
    accent: "#F5A623",
    accent2: "#E8366B",
    border: "rgba(26,18,0,0.12)",
    displayFont: '"Syne", "Archivo", system-ui, sans-serif',
    bodyFont: '"Nunito", system-ui, sans-serif',
    displayWeight: 800,
    displayTracking: "-0.02em",
    radius: 20,
    radiusBtn: 999,
    btnBg: "#F5A623",
    btnText: "#1A1200",
    tags: ["bright", "sunny", "vibrant", "energetic"],
    business: {
      name: "Citrus Beauty Bar",
      tagline: "Good vibes. Great hair. Always.",
      bio: "Your neighborhood beauty bar bringing sunshine to every appointment. Specializing in natural hair, vibrant color, and styles that make you smile when you look in the mirror.",
      location: "Sunshine Market · 303 Mango Blvd · Miami, FL",
      phone: "(786) 555-0195",
      email: "hey@citrusbeautybar.com",
      category: "Natural Hair & Color",
      heroImageId: "/citrus-vegetables.avif",
      profileImageId: "1519014816548-bf5fe059798b",
      galleryIds: [
        "1519699047748-de8e457a634e","1519014816548-bf5fe059798b",
        "1531746020798-e6953c6e8e04","1582095133179-bfd08e2fc6b3",
        "1517365830460-955ce3ccd263","1505932794465-147d1f1b2c97",
        "1516975080664-ed2fc6a32937","1492106087820-71f1a00d2b11",
      ],
    },
  },

  // ── 13. Color Block ──────────────────────────────────────────────────────
  colorblock: {
    id: "colorblock",
    name: "Color Block",
    vibe: "Bold · black base · orange + blue accents · high contrast",
    category: "bold",
    bg: "#0A0A0A",
    surface: "#1A1A1A",
    ink: "#FFFFFF",
    muted: "#999999",
    accent: "#2563EB",      // blue — per-service Book buttons
    accent2: "#FF6A00",     // orange — Now booking badge + stars
    border: "rgba(255,255,255,0.14)",
    displayFont: '"Space Grotesk", "Archivo", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: "-0.02em",
    radius: 2,
    radiusBtn: 2,
    btnBg: "#FF6A00",       // orange — Request a Booking CTA + top nav Book Now
    btnText: "#FFFFFF",
    tags: ["bold", "color block", "black", "orange", "blue"],
    business: {
      name: "Block & Co.",
      tagline: "Sharp cuts. Loud color. No filler.",
      bio: "A brutalist beauty studio with a minimalist workflow. Precision services, fast turnaround, brand-forward results. Walk-outs look like they stepped out of a fashion week runway.",
      location: "Unit 12 · 88 Warehouse Ln · Brooklyn, NY",
      phone: "(718) 555-0817",
      email: "hello@blockandco.studio",
      category: "Barbershop",
      heroImageId: "/colorblock-hero.avif",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1654097800369-abc063d657c4","1654097801176-cb1795fd0c5e",
        "1583195764036-6dc248ac07d9","1571019613454-1cb2f99b2d8b",
        "1552374196-c4e7ffc6e126","1492106087820-71f1a00d2b11",
        "1517841905240-472988babdf9","1508214751196-bcfd4ca60f91",
      ],
    },
  },

  // ── 14. RIOT ROOM ────────────────────────────────────────────────────────
  riot: {
    id: "riot",
    name: "RIOT ROOM",
    vibe: "Graffiti rockstar · pop · spray-paint",
    category: "street",
    bg: "#FFF200",
    surface: "#111111",
    ink: "#111111",
    muted: "#555555",
    accent: "#FF2E88",
    accent2: "#00E5FF",
    border: "rgba(0,0,0,0.2)",
    displayFont: '"Bungee", "Archivo Black", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "0em",
    radius: 0,
    radiusBtn: 0,
    btnBg: "#111111",
    btnText: "#FFF200",
    tags: ["graffiti", "pop", "neon", "yellow", "chaos"],
    business: {
      name: "RIOT ROOM",
      tagline: "Color. Cuts. Chaos — by appointment.",
      bio: "Hair colorist & texture tech. I work in neon, bleach, and zero apologies. Bring references, leave your rules. Specializing in vivid color and creative texture work.",
      location: "BACK ALLEY · 337 WARPED ST · BROOKLYN, NY",
      phone: "(718) 555-0808",
      email: "book@riotroom.co",
      category: "Vivid Color & Texture",
      heroImageId: "/riot-hero.avif",
      profileImageId: "1517365830460-955ce3ccd263",
      galleryIds: [
        "1492106087820-71f1a00d2b11","1517365830460-955ce3ccd263",
        "1516975080664-ed2fc6a32937","1582095133179-bfd08e2fc6b3",
        "1505932794465-147d1f1b2c97","1488426862026-3ee34a7d66df",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
      ],
    },
  },

  // ── 15. Mochi Room ───────────────────────────────────────────────────────
  mochi: {
    id: "mochi",
    name: "Mochi Room",
    vibe: "Japanese kawaii · pastel · soft & sweet",
    category: "feminine",
    bg: "#FFE9F0",
    surface: "#FFFFFF",
    ink: "#4A2740",
    muted: "#9A7A8E",
    accent: "#FF9EC1",
    accent2: "#A7D8E8",
    border: "rgba(74,39,64,0.14)",
    displayFont: '"Fraunces", "DM Serif Display", Georgia, serif',
    bodyFont: '"Manrope", "Inter", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: 28,
    radiusBtn: 999,
    btnBg: "#4A2740",
    btnText: "#FFE9F0",
    tags: ["kawaii", "pastel", "pink", "cute", "nails", "lashes"],
    business: {
      name: "mochi room ꕥ",
      tagline: "sweet little salon · nails ✿ lashes ✿ lil bow things",
      bio: "Certified nail + lash artist. I design tiny, perfectly cute things for softies, sweeties, and the chronically online. Every set is a little world.",
      location: "2F Peach Bldg · 4-12-2 Harajuku · Tokyo",
      phone: "(424) 555-0622",
      email: "hi@mochiroom.co",
      category: "Nail & Lash Artistry",
      heroImageId: "/mochi-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1604654894610-df63bc536371","1531746020798-e6953c6e8e04",
        "1540555700478-4be289fbecef","1626954079979-ec4f7b05e032",
        "1519014816548-bf5fe059798b","1505932794465-147d1f1b2c97",
        "1516975080664-ed2fc6a32937","1549236177-f9b0031756eb",
      ],
    },
  },

  // ── 16. Linden Studio ────────────────────────────────────────────────────
  linden: {
    id: "linden",
    name: "Linden",
    vibe: "Trust & care · soft teal · warm taupe · cream",
    category: "minimal",
    bg: "#F4EFE6",
    surface: "#FFFFFF",
    ink: "#2B3A3A",
    muted: "#6E7A78",
    accent: "#4A8E8B",
    accent2: "#B89C7A",
    border: "rgba(43,58,58,0.14)",
    displayFont: '"Fraunces", "Libre Caslon Text", Georgia, serif',
    bodyFont: '"Manrope", "Inter", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.015em",
    radius: 14,
    radiusBtn: 999,
    btnBg: "#4A8E8B",
    btnText: "#FFFFFF",
    tags: ["trust", "clinical", "teal", "wellness", "inclusive"],
    business: {
      name: "Linden Studio",
      tagline: "Considered beauty care, for every body.",
      bio: "Board-certified licensed professional with 12 years of clinical and holistic practice. Consent-forward, inclusive, and unhurried. Every visit begins with a conversation, not a checklist.",
      location: "2nd floor · 180 Linden Ave · Portland, OR",
      phone: "(503) 555-0392",
      email: "care@lindenstudio.co",
      category: "Holistic Skincare & Wellness",
      heroImageId: "/linden-hero.avif",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1620916566398-39f1143ab7be","1608248597279-f99d160bfcbc",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
        "1612817288484-6f916006741a","1540555700478-4be289fbecef",
        "1556228720-195a672e8a03","1519699047748-de8e457a634e",
      ],
    },
  },

  // ── 17. Harajuku Cloud ────────────────────────────────────────────────
  //
  // Airy kawaii palette. Baby blue + crisp white lead every layout, with
  // pale lemon as quiet accents and soft marshmallow pink reserved for
  // CTAs. Text uses Cloud Gray / Soft Charcoal instead of pure black so
  // the dreamy vibe never tips into hard contrast.
  //
  // Contrast audit (WCAG AA):
  //   · Cloud Gray #5A6B7A on Crisp White #FFFFFF → 6.14:1  ✅ (body)
  //   · Soft Charcoal #3D4A55 on Crisp White      → 9.65:1  ✅ (headings)
  //   · Soft Charcoal #3D4A55 on Baby Blue #B5D8EB → 6.36:1  ✅
  //   · Soft Charcoal #3D4A55 on Pale Lemon #FBF4C7 → 8.91:1 ✅
  //   · Soft Charcoal #3D4A55 on Soft Pink #F5C8D1 → 6.87:1  ✅  (CTA text)
  //   · Cloud Gray on Whisper White / Soft Sky — always ≥ 5.8:1. ✅
  harajuku: {
    id: "harajuku",
    name: "Harajuku Cloud",
    vibe: "Airy · kawaii · cotton candy · dreamy pastels",
    category: "feminine",
    is_featured: true,
    bg: "#FFFFFF",            // Crisp White — main surface
    surface: "#FAFCFE",       // Whisper White — card backgrounds
    ink: "#3D4A55",           // Soft Charcoal — headings
    muted: "#5A6B7A",         // Cloud Gray — body copy, secondary text
    accent: "#F5C8D1",        // Soft Marshmallow Pink — CTAs, primary accents
    accent2: "#B5D8EB",       // Baby Blue — secondary accents, airy surfaces
    border: "rgba(61,74,85,0.15)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Nunito", "Manrope", system-ui, sans-serif',
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: 24,
    radiusBtn: 999,
    btnBg: "#F5C8D1",         // Soft Pink button surface
    btnText: "#3D4A55",       // Soft Charcoal text on pink = 6.87:1 contrast
    tags: ["kawaii", "pastel", "airy", "cotton candy", "dreamy", "harajuku"],
    business: {
      name: "Cloud Nine Studio ☁︎",
      tagline: "lashes · lips · cloud-soft color",
      bio: "A dreamy little studio for soft girls and sweet treats. Specializing in airy color, cloud-gradient hair, and the kind of glow that looks like you just walked out of a daydream.",
      location: "Suite 4 · 88 Pastel Lane · Los Angeles, CA",
      phone: "(213) 555-0904",
      email: "hi@cloudninestudio.co",
      category: "Lash Extensions & Beauty",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
        "1556228720-195a672e8a03","1505932794465-147d1f1b2c97",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
      ],
    },
  },

  // ── 18. Red Velvet Sorbet ───────────────────────────────────────────────
  //
  // Sophisticated-romantic palette. Cream leads every layout as the main
  // surface; Soft Watermelon carries the accent work; Champagne Gold
  // anchors CTAs so the buttons read as dessert-luxury rather than pink.
  // Text uses Soft / Rich Bordeaux in place of pure black so the warmth
  // never tips into hard contrast.
  //
  // Contrast audit (WCAG AA):
  //   · Soft Bordeaux #7A4A48 on Cream #FBF4EC        → 7.41:1  ✅ (body)
  //   · Rich Bordeaux #5C3534 on Cream                → 10.89:1 ✅ (headings)
  //   · Rich Bordeaux #5C3534 on Champagne Gold #D4AF7A → 6.03:1 ✅ (CTA)
  //   · Rich Bordeaux #5C3534 on Soft Watermelon #F4A6A0 → 6.27:1 ✅
  //   · Rich Bordeaux on Whisper Cream #FFF9F2         → 11.58:1 ✅
  //   · Soft Bordeaux on Light Blush #F2D5D0           → 5.72:1 ✅
  sorbet: {
    id: "sorbet",
    name: "Red Velvet Sorbet",
    vibe: "Romantic · warm · dessert-luxury · strawberry & rose-gold",
    category: "feminine",
    is_featured: true,
    bg: "#FBF4EC",            // Cream — main surface
    surface: "#FFF9F2",       // Whisper Cream — layered cards
    ink: "#5C3534",            // Rich Bordeaux — headings
    muted: "#7A4A48",          // Soft Bordeaux — body copy
    accent: "#F4A6A0",         // Soft Watermelon — primary accent, hero highlights
    accent2: "#D4948D",        // Dusty Rose — hover states + secondary accent
    border: "rgba(92,53,52,0.14)",
    displayFont: '"Fraunces", "Playfair Display", Georgia, serif',
    bodyFont: '"Fraunces", Georgia, serif',
    displayWeight: 400,
    displayTracking: "-0.015em",
    radius: 20,
    radiusBtn: 999,
    btnBg: "#D4AF7A",          // Champagne Gold — elegant CTA surface
    btnText: "#5C3534",        // Rich Bordeaux text on gold = 6.03:1
    tags: ["romantic", "elegant", "warm", "dessert", "gold", "pink", "cream"],
    business: {
      name: "Velvet & Gold Studio",
      tagline: "Soft hues. Slow service. Always.",
      bio: "A quiet, appointment-only studio specializing in bridal beauty, soft cinematic color, and editorial updos. We believe in long sessions, warm light, and champagne before the final veil check.",
      location: "Second Floor · 14 Linden Row · Savannah, GA",
      phone: "(912) 555-0169",
      email: "hi@velvetandgold.co",
      category: "Bridal & Hair Artistry",
      heroImageId: "1605497788044-5a32c7078486",
      profileImageId: "1519699047748-de8e457a634e",
      galleryIds: [
        "1605497788044-5a32c7078486","1519699047748-de8e457a634e",
        "1549236177-f9b0031756eb","1559599101-f09722fb4948",
        "1552693673-1bf958298935","1515377905703-c4788e51af15",
        "1560869713-7d0a29430803","1521590832167-7bcbfaa6381f",
      ],
    },
  },

  // ── 19. Amethyst Mist ───────────────────────────────────────────────────
  //
  // Ethereal spa-luxury palette. White Linen leads every layout as the main
  // surface; Pale Lavender carries the accent work; Muted Periwinkle anchors
  // CTAs so buttons read as refined wellness rather than cartoon purple.
  // Silver Birch stays structural (dividers, borders). Text uses Twilight
  // Plum / Deep Amethyst in place of pure black so the calm never tips into
  // hard contrast.
  //
  // Contrast audit (WCAG AA):
  //   · Twilight Plum #5C5470 on White Linen #FBFAF7     → 6.98:1  ✅ (body)
  //   · Deep Amethyst  #3F3852 on White Linen            → 10.47:1 ✅ (headings)
  //   · Deep Amethyst  #3F3852 on Muted Periwinkle #A8B0D4 → 5.16:1 ✅ (CTA)
  //   · Deep Amethyst  #3F3852 on Pale Lavender #D9CCE3  → 7.14:1  ✅
  //   · Twilight Plum  #5C5470 on Mist Lavender #EDE5F2  → 5.94:1  ✅
  //   · Twilight Plum  #5C5470 on Whisper Linen #FFFFFC  → 7.13:1  ✅
  amethyst: {
    id: "amethyst",
    name: "Amethyst Mist",
    vibe: "Ethereal · spa-luxury · lavender mist · meditative",
    category: "feminine",
    bg: "#FBFAF7",            // White Linen — main surface
    surface: "#FFFFFC",       // Whisper Linen — layered cards
    ink: "#3F3852",            // Deep Amethyst — headings
    muted: "#5C5470",          // Twilight Plum — body copy
    accent: "#D9CCE3",         // Pale Lavender — primary accent, hero highlights
    accent2: "#A8B0D4",        // Muted Periwinkle — secondary accent, CTAs
    border: "rgba(63,56,82,0.14)", // derived from Deep Amethyst; Silver Birch tone
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter", "Manrope", system-ui, sans-serif',
    displayWeight: 350,
    displayTracking: "-0.015em",
    radius: 20,
    radiusBtn: 999,
    btnBg: "#A8B0D4",          // Muted Periwinkle — elegant CTA surface
    btnText: "#3F3852",        // Deep Amethyst text on periwinkle = 5.16:1
    tags: ["ethereal", "spa", "lavender", "calm", "meditative", "wellness"],
    business: {
      name: "Mist & Linen Atelier",
      tagline: "quiet beauty · slow rituals · lavender hours",
      bio: "An appointment-only wellness atelier for slow, sensory facials and bespoke skin ceremonies. Think fresh linen, polished silver, a little lavender steam, and the kind of quiet that actually makes your shoulders drop.",
      location: "Studio 3 · 27 Birch Lane · Portland, OR",
      phone: "(503) 555-0218",
      email: "hello@mistandlinen.co",
      category: "Facials & Wellness",
      heroImageId: "1540555700478-4be289fbecef",
      profileImageId: "1519699047748-de8e457a634e",
      galleryIds: [
        "1540555700478-4be289fbecef","1519699047748-de8e457a634e",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
        "1505932794465-147d1f1b2c97","1519014816548-bf5fe059798b",
        "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 20. Cool Quartz ─────────────────────────────────────────────────────
  //
  // Medical-spa palette. Pearl White + Frost White lead every layout; Icy
  // Blue-Gray handles accent surfaces; Slate anchors CTAs so the buttons
  // read as glass-and-steel precision. Cool Silver stays structural
  // (dividers, borders). Text uses Graphite / Obsidian instead of pure
  // black so the clinical polish never goes harsh.
  //
  // Contrast audit (WCAG AA):
  //   · Graphite #2D3540 on Pearl White #F4F6F7        → 11.40:1 ✅ (body)
  //   · Obsidian #1A1F26 on Pearl White                → 15.14:1 ✅ (headings)
  //   · Pearl White on Slate #5A6770                   → 5.50:1  ✅ (CTA text)
  //   · Graphite on Icy Blue-Gray #C4D1D9              → 8.92:1  ✅
  //   · Graphite on Mist Gray #E1E6EA                  → 10.40:1 ✅
  //   · Graphite on Frost White #FBFCFD                → 12.30:1 ✅
  quartz: {
    id: "quartz",
    name: "Cool Quartz",
    vibe: "Medical-spa · glass & steel · frosted ice · clinical luxe",
    category: "minimal",
    is_featured: true,
    bg: "#F4F6F7",            // Pearl White — main surface
    surface: "#FBFCFD",       // Frost White — layered cards
    ink: "#1A1F26",            // Obsidian — headings
    muted: "#2D3540",          // Graphite — body copy
    accent: "#C4D1D9",         // Icy Blue-Gray — primary accent, hero highlights
    accent2: "#A8B2BA",        // Cool Silver — secondary accent, dividers
    border: "rgba(26,31,38,0.14)",
    displayFont: '"Inter", "Helvetica Neue", system-ui, sans-serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 500,
    displayTracking: "-0.02em",
    radius: 8,
    radiusBtn: 6,
    btnBg: "#5A6770",          // Slate — CTA surface
    btnText: "#F4F6F7",        // Pearl White text on slate = 5.50:1
    tags: ["minimal", "clinical", "modern", "medical-spa", "cool", "precision"],
    business: {
      name: "Quartz & Atelier",
      tagline: "advanced skin · precision finish · glass-house calm",
      bio: "A modern medical-spa atelier for results-driven facials, precision injectables, and laser refinement. Our treatment suites are quiet, cool, and engineered for exacting work — think operating-theatre clean with atelier craftsmanship.",
      location: "8th Floor · 1220 Glass Tower · Chicago, IL",
      phone: "(312) 555-0471",
      email: "concierge@quartzatelier.co",
      category: "Medical Aesthetics & Skin",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1515377905703-c4788e51af15",
        "1552693673-1bf958298935","1505932794465-147d1f1b2c97",
        "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 21. Floral Latte ────────────────────────────────────────────────────
  //
  // Quiet-luxury palette. Ivory + Whisper Ivory lead every layout; Soft Clay
  // carries the accent work; Toasted Almond anchors CTAs so the buttons
  // read as warm grounded luxury. Greige stays structural (dividers,
  // borders). Text uses Espresso / Dark Cocoa instead of pure black so the
  // Pinterest-dream-salon warmth never tips into hard contrast.
  //
  // Contrast audit (WCAG AA):
  //   · Espresso #3D2E22 on Ivory #F7F1E8             → 11.55:1 ✅ (body)
  //   · Dark Cocoa #2A1E14 on Ivory                   → 14.38:1 ✅ (headings)
  //   · Dark Cocoa on Toasted Almond #B8956F          → 5.82:1  ✅ (CTA text)
  //   · Dark Cocoa on Soft Clay #D4B8A5               → 8.62:1  ✅
  //   · Espresso on Warm Linen #EAE0D2                → 9.92:1  ✅
  //   · Espresso on Whisper Ivory #FCF7EF             → 12.10:1 ✅
  latte: {
    id: "latte",
    name: "Floral Latte",
    vibe: "Quiet luxury · bleached oak · dried pampas · timeless warm neutrals",
    category: "natural",
    is_featured: true,
    bg: "#F7F1E8",            // Ivory — main surface
    surface: "#FCF7EF",       // Whisper Ivory — layered cards
    ink: "#2A1E14",            // Dark Cocoa — headings
    muted: "#3D2E22",          // Espresso — body copy
    accent: "#D4B8A5",         // Soft Clay — primary accent, hero highlights
    accent2: "#A89B8C",        // Greige — secondary accent, structural dividers
    border: "rgba(42,30,20,0.14)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter", "Manrope", system-ui, sans-serif',
    displayWeight: 350,
    displayTracking: "-0.02em",
    radius: 18,
    radiusBtn: 999,
    btnBg: "#B8956F",          // Toasted Almond — CTA surface
    btnText: "#2A1E14",        // Dark Cocoa on almond = 5.82:1
    tags: ["neutral", "warm", "luxury", "pinterest", "timeless", "pampas", "beige"],
    business: {
      name: "Linen & Clay Atelier",
      tagline: "bleached oak · dried pampas · quiet luxury",
      bio: "A warm, appointment-only atelier for lived-in color, soft cuts, and slow skin rituals. Think linen drapes, terracotta ceramics, and the golden-hour light that makes every client look like the best version of herself.",
      location: "Second Floor · 42 Oakwood Row · Austin, TX",
      phone: "(512) 555-0382",
      email: "hello@linenandclay.co",
      category: "Hair & Skin Studio",
      heroImageId: "1515377905703-c4788e51af15",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1515377905703-c4788e51af15","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1552693673-1bf958298935",
        "1505932794465-147d1f1b2c97","1531746020798-e6953c6e8e04",
        "1556228720-195a672e8a03","1519014816548-bf5fe059798b",
      ],
    },
  },

  // ── 22. League Lead ─────────────────────────────────────────────────────
  //
  // HIGH-IMPACT THEME — the FIRST theme to apply typography overrides on
  // top of the layout's existing fonts. When this theme is active, every
  // template root div carries `data-oyrb-theme="league"`; scoped CSS in
  // `globals.css` then uppercases h1/h2/h3/button text, tightens heading
  // letter-spacing, widens button letter-spacing, and squares off any
  // leftover rounded corners. Font FAMILY is never changed — only CSS
  // transforms (case, weight, tracking, italic, radius) layer on top.
  //
  // DO NOT replicate this override pattern on other themes unless the
  // theme is explicitly marked as "high-impact" in its own spec. The
  // CSS selector `[data-oyrb-theme="league"]` is intentionally scoped
  // so every other theme keeps its unmodified typography.
  //
  // Contrast audit (WCAG AA):
  //   · Matte Black #0A0A0A on Pure White #FFFFFF     → 20.38:1 ✅ (headings)
  //   · Sharp Slate #3A4046 on Pure White             → 10.05:1 ✅ (body)
  //   · Matte Black #0A0A0A on Electric Volt #D4FF00  → 15.09:1 ✅ (CTA text)
  //   · Matte Black on Sharp Slate #3A4046            → 2.02:1  ❌ — avoid
  //     (instead, Pure White on Sharp Slate → 10.05:1 ✅)
  //   · Sport Steel #5A6168 on Pure White             → 5.40:1  ✅ (muted)
  league: {
    id: "league",
    name: "League Lead",
    vibe: "Athletic · kinetic · sneaker-drop · championship energy",
    category: "bold",
    is_featured: true,
    bg: "#FFFFFF",            // Pure White — main surface
    surface: "#F5F5F5",       // Hot White — layered cards
    ink: "#0A0A0A",            // Matte Black — headings
    muted: "#3A4046",          // Sharp Slate — body copy / secondary text
    accent: "#D4FF00",         // Electric Volt — CTA fill + spark moments
    accent2: "#3A4046",        // Sharp Slate — structural emphasis
    border: "rgba(10,10,10,0.9)", // Near-black, thick stamp-feel borders
    displayFont: '"Inter", "Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 800,
    displayTracking: "-0.02em",
    radius: 0,                  // Sharp corners — square edges
    radiusBtn: 0,               // Square buttons
    btnBg: "#D4FF00",           // Electric Volt — CTA surface
    btnText: "#0A0A0A",         // Matte Black on Volt = 15.09:1
    tags: ["bold", "athletic", "kinetic", "high-impact", "sport", "uppercase"],
    business: {
      name: "LEAGUE / LEAD ATHLETICS",
      tagline: "performance beauty · championship finish",
      bio: "Precision cuts, power color, and training-grade skin for athletes, coaches, and people who show up. We work fast, we work clean, we work like the game's on the line.",
      location: "Training Floor · 77 Stadium Way · Brooklyn, NY",
      phone: "(718) 555-0145",
      email: "team@leaguelead.co",
      category: "Performance Beauty Studio",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1515377905703-c4788e51af15",
        "1552693673-1bf958298935","1505932794465-147d1f1b2c97",
        "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 23. Crimson Luxe ────────────────────────────────────────────────────
  //
  // Ferrari-showroom palette. Stark White + Whisper White lead every
  // layout; True Ferrari Red anchors CTAs and single-moment accents;
  // Cool Charcoal carries structural depth (headings, dividers on dark
  // surfaces); Soft Silver/Chrome is the refined structural accent.
  // Text uses Onyx / True Black for stark editorial contrast.
  //
  // STANDARD color-only theme. Do NOT apply the League Lead typography
  // override pattern — fonts and casing stay at each layout's defaults.
  //
  // Contrast audit (WCAG AA):
  //   · Onyx #15171B on Stark White #FFFFFF          → 18.10:1 ✅ (body)
  //   · True Black #0A0A0A on Stark White            → 20.38:1 ✅ (headings)
  //   · Stark White on True Ferrari Red #E32227      → 4.64:1  ✅ (CTA text, AA body)
  //   · Stark White on Cool Charcoal #2A2D33         → 13.82:1 ✅
  //   · Onyx on Polished Chrome #E1E5EA              → 15.12:1 ✅
  //   · Onyx on Whisper White #FAFBFC                → 17.68:1 ✅
  crimson: {
    id: "crimson",
    name: "Crimson Luxe",
    vibe: "Ferrari showroom · red carpet · editorial power · glossy confidence",
    category: "editorial",
    bg: "#FFFFFF",            // Stark White — main surface
    surface: "#FAFBFC",       // Whisper White — layered cards
    ink: "#0A0A0A",            // True Black — headings
    muted: "#15171B",          // Onyx — body copy
    accent: "#E32227",         // True Ferrari Red — CTA / hero highlight
    accent2: "#2A2D33",        // Cool Charcoal — structural emphasis
    border: "rgba(21,23,27,0.14)",
    displayFont: '"Fraunces", "Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 450,
    displayTracking: "-0.02em",
    radius: 6,
    radiusBtn: 999,
    btnBg: "#E32227",          // Ferrari Red — CTA surface
    btnText: "#FFFFFF",        // White on red = 4.64:1 (AA body)
    tags: ["bold", "editorial", "luxury", "power", "red", "glossy", "couture"],
    business: {
      name: "Maison Crimson",
      tagline: "statement beauty · editorial precision",
      bio: "A couture appointment-only atelier for red-carpet hair, glossy editorial skin, and the kind of dramatic finish that earns a second look. We specialize in statement color, precision cuts, and lips that read from across a room.",
      location: "Fifth Floor · 210 Atelier Row · Miami, FL",
      phone: "(305) 555-0129",
      email: "salon@maisoncrimson.co",
      category: "Couture Hair & Skin",
      heroImageId: "1540555700478-4be289fbecef",
      profileImageId: "1519699047748-de8e457a634e",
      galleryIds: [
        "1540555700478-4be289fbecef","1519699047748-de8e457a634e",
        "1515377905703-c4788e51af15","1519014816548-bf5fe059798b",
        "1552693673-1bf958298935","1505932794465-147d1f1b2c97",
        "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 24. First Avenger ───────────────────────────────────────────────────
  //
  // HEROIC-AUTHORITY palette. Deep Heroic Navy dominates every layout; Ink
  // Navy takes cards for subtle layer depth; Pure White carries headings;
  // Warm Nude grounds body copy + structural details; Action Red is the
  // single "spark" CTA moment. Reads like a premium menswear boutique —
  // navy walls with red-accent leather and warm-nude upholstery. Never
  // patriotic-flag obvious, never cartoonish, never costume-y.
  //
  // IMPORTANT differentiation vs. Crimson Luxe:
  //   · Crimson Luxe — Stark White dominant + Ferrari Red CTA ("showroom")
  //   · First Avenger — Heroic Navy dominant + Action Red CTA ("boutique")
  //
  // STANDARD color-only theme. Do NOT apply the League Lead typography
  // override pattern — fonts and casing stay at each layout's defaults.
  //
  // Note on "white cards": the spec's ideal is Pure White content cards
  // on a Heroic Navy page. In the current theme architecture a single
  // `ink`/`muted` color has to read on BOTH page bg AND card surface, so
  // true white-card-on-navy would need a scoped CSS layer. Here we use the
  // dark-theme convention (Ink Navy cards, White headings, Warm Nude body)
  // which delivers the navy-dominant identity cleanly across all 5 layouts
  // without risking contrast on any surface.
  //
  // Contrast audit (WCAG AA):
  //   · Pure White #FFFFFF on Heroic Navy #0A1F3D     → 16.39:1 ✅ (headings)
  //   · Warm Nude #D4BFA3 on Heroic Navy              →  9.17:1 ✅ (body)
  //   · Pure White on Ink Navy #1A2D4F                → ~14:1   ✅ (card heads)
  //   · Warm Nude on Ink Navy                         → ~7.5:1  ✅ (card body)
  //   · Pure White on Action Red #D62828              →  4.89:1 ✅ (CTA)
  //   · Action Red on Heroic Navy                     → ~3.55:1 ✅ AA Large only
  //     (large accent splashes / icons only — never body text)
  avenger: {
    id: "avenger",
    name: "First Avenger",
    vibe: "Heroic navy · power red · warm nude · premium authority",
    category: "editorial",
    bg: "#0A1F3D",             // Heroic Navy — main background (dominant)
    surface: "#1A2D4F",        // Ink Navy — layered cards (slightly lighter)
    ink: "#FFFFFF",            // Pure White — headings on navy surfaces
    muted: "#D4BFA3",          // Warm Nude — body copy on navy surfaces
    accent: "#D62828",         // Action Red — CTA / statement highlight
    accent2: "#D4BFA3",        // Warm Nude — grounding structural accent
    border: "rgba(212,191,163,0.22)",  // warm-nude-tinted hairlines
    displayFont: '"Fraunces", "Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 500,
    displayTracking: "-0.02em",
    radius: 6,
    radiusBtn: 6,
    btnBg: "#D62828",          // Action Red — CTA surface
    btnText: "#FFFFFF",        // Pure White on Red = 4.89:1
    tags: ["bold", "professional", "navy", "classic", "authority", "hero"],
    business: {
      name: "Vanguard & Veil",
      tagline: "bridal precision · editorial calm · big-day beauty",
      bio: "A bridal-first studio for big-day hair, editorial skin, and confidence-first consulting. We run timed rehearsals, on-site teams, and a calm room on the morning of — so the only surprise left is how you feel walking out.",
      location: "Third Floor · 91 Marlow Street · New York, NY",
      phone: "(212) 555-0407",
      email: "studio@vanguardveil.co",
      category: "Bridal & Event Beauty",
      heroImageId: "1605497788044-5a32c7078486",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1605497788044-5a32c7078486","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1515377905703-c4788e51af15",
        "1552693673-1bf958298935","1549236177-f9b0031756eb",
        "1559599101-f09722fb4948","1560869713-7d0a29430803",
      ],
    },
  },

  // ── 25. Dark Knight & Amazon ────────────────────────────────────────────
  //
  // Watch-boutique palette. Pure Alabaster + Whisper Alabaster lead every
  // layout; Royal Cobalt anchors CTAs and the single confident "action"
  // moment; Gotham Graphite carries headings + body for sleek weight;
  // Victory Gold is decorative-only (borders, icon strokes, refined frame
  // details — never text). Reads like a high-end watch boutique, not a
  // costume or comic-book theme.
  //
  // STANDARD color-only theme. Do NOT apply the League Lead typography
  // override pattern — fonts and casing stay at each layout's defaults.
  //
  // Contrast audit (WCAG AA):
  //   · Midnight Graphite #1A1D24 on Alabaster #FAFBFC → 16.05:1 ✅ (headings)
  //   · Gotham Graphite #2E323A on Alabaster           → 12.33:1 ✅ (body)
  //   · Alabaster on Royal Cobalt #2B5BD4              → 5.78:1  ✅ (CTA text)
  //   · Alabaster on Gotham Graphite                   → 12.33:1 ✅
  //   · Gotham Graphite on Victory Gold #C9A85C        → 5.60:1  ✅ (if text on gold)
  //   · Victory Gold on Alabaster                      → 2.20:1  ❌ — never text
  knight: {
    id: "knight",
    name: "Dark Knight & Amazon",
    vibe: "Watch boutique · cobalt & gold accents · premium modernism",
    category: "editorial",
    bg: "#FAFBFC",            // Pure Alabaster — main surface
    surface: "#FFFFFF",       // Whisper Alabaster — layered cards
    ink: "#1A1D24",            // Midnight Graphite — headings
    muted: "#2E323A",          // Gotham Graphite — body copy
    accent: "#2B5BD4",         // Royal Cobalt — primary accent / hero highlight
    accent2: "#C9A85C",        // Victory Gold — decorative premium accent (non-text)
    border: "rgba(26,29,36,0.16)",
    displayFont: '"Fraunces", "Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 450,
    displayTracking: "-0.02em",
    radius: 4,
    radiusBtn: 6,
    btnBg: "#2B5BD4",          // Royal Cobalt — CTA surface
    btnText: "#FAFBFC",        // Alabaster on cobalt = 5.78:1
    tags: ["editorial", "premium", "boutique", "cobalt", "gold", "modernist"],
    business: {
      name: "Atelier Gotham",
      tagline: "precision consulting · boutique beauty · private clientele",
      bio: "A private-consultation studio for serious clientele — custom skin protocols, signature color systems, and long-view hair strategy. We work slowly, we work by referral, and we treat every appointment like a boardroom brief.",
      location: "Penthouse Suite · 340 Steelworks · Chicago, IL",
      phone: "(312) 555-0618",
      email: "private@ateliergotham.co",
      category: "Private Beauty Consultancy",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1515377905703-c4788e51af15",
        "1552693673-1bf958298935","1505932794465-147d1f1b2c97",
        "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
      ],
    },
  },

  // ── 26. Neon Dream Island ───────────────────────────────────────────────
  //
  // ENHANCED THEME — second theme (after League Lead) to ship decorative
  // overrides beyond colors. When this theme is active, scoped CSS in
  // `globals.css` applies: floating-cloud rounded containers with inner
  // glow, 2px Deep Violet sticker borders on buttons/inputs, pill-shaped
  // candy-shine CTAs with pseudo-element white highlight, Sunlight Yellow
  // star bullets on service lists, and sparkle pseudo-elements in section
  // corners. DISTINCT from Harajuku Cloud (soft pastel kawaii) — this is
  // the saturated maximalist sibling.
  //
  // DO NOT replicate this enhanced pattern on other themes unless the
  // theme is explicitly flagged as enhanced in its own spec. Every other
  // standard theme in the system is colors-only.
  //
  // Scope note: CSS cannot swap React Lucide icon components (e.g. rating
  // <Star> → <Heart>). That level of swap would require template-level
  // theme-id branching, which is out of scope for this theme. All CSS-
  // achievable treatments (bullets, borders, shapes, pseudos) are applied.
  //
  // Contrast audit (WCAG AA):
  //   · Deep Violet #5E35B1 on Crisp White #FFFFFF    → 8.02:1  ✅ (body)
  //   · Royal Plum  #4A148C on Crisp White            → 11.93:1 ✅ (headings)
  //   · Royal Plum  on Vibrant Sky Blue #4FC3F7       → 5.92:1  ✅ (headings on sky)
  //   · Deep Violet on Soft Sky Mist #B3E5FC          → 5.94:1  ✅
  //   · Crisp White on Electric Magenta #EC407A       → 3.75:1  ✅ AA Large
  //     (CTA button labels only — fails AA body at 4.5:1; keep label
  //     weight ≥ 600 and size ≥ 14px so large-text rules apply.)
  //   · Sunlight Yellow #FFD54F on White              → 1.69:1  ❌ decorative only
  neon: {
    id: "neon",
    name: "Neon Dream Island",
    vibe: "Saturated kawaii · Sanrio-energy · candy-shine · maximalist",
    category: "feminine",
    bg: "#4FC3F7",            // Vibrant Sky Blue — main background
    surface: "#FFFFFF",       // Crisp White — cloud containers
    ink: "#4A148C",            // Royal Plum — headings
    muted: "#5E35B1",          // Deep Violet — body copy, sticker borders
    accent: "#EC407A",         // Electric Magenta — primary CTA + selections
    accent2: "#FFD54F",        // Sunlight Yellow — decorative (stars, sparkles, highlights)
    border: "#5E35B1",         // Deep Violet — 2px sticker outline
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Nunito", "Manrope", system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: "-0.01em",
    radius: 30,                 // Cloud-rounded surfaces
    radiusBtn: 9999,            // Pill CTAs
    btnBg: "#EC407A",           // Magenta — CTA fill
    btnText: "#FFFFFF",         // White on magenta = 3.75:1 (AA Large only)
    tags: ["kawaii", "saturated", "sanrio", "candy", "maximalist", "sparkle", "heart"],
    business: {
      name: "Neon Dream Island ♡",
      tagline: "sticker-cute · candy-bright · maximum magic",
      bio: "A maximum-sparkle salon for bold color, rainbow lashes, and finishes that look like they jumped off a sticker sheet. We believe in glitter, hearts, candy lips, and treating every appointment like a mini photo-shoot.",
      location: "Suite 7 · 12 Sugar Cloud Ave · Los Angeles, CA",
      phone: "(213) 555-0616",
      email: "hi@neondreamisland.co",
      category: "Kawaii Beauty & Color",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
        "1556228720-195a672e8a03","1505932794465-147d1f1b2c97",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
      ],
    },
  },

  // ── 27. Unicorn Candy-Cloud ─────────────────────────────────────────────
  //
  // MAXIMALIST THEME — highest decoration tier, above standard (colors-
  // only) and enhanced (League Lead / Neon Dream Island). Scoped CSS in
  // `globals.css` adds: tri-color radial mesh gradient background, faint
  // sparkle overlay, glassmorphism panels with iridescent rainbow border,
  // pill-shape candy CTAs with sparkle clusters, lollipop-swirl bullets,
  // pulse-on-hover animation (respects `prefers-reduced-motion`), and a
  // print stylesheet that strips the gradient for clean bookings.
  //
  // DISTINCT from Neon Dream Island (saturated kawaii with solid sky blue
  // background). Unicorn Candy-Cloud is the maximalist sugar-rush sibling
  // — gradient mesh, glass panels, iridescent borders. Both coexist.
  //
  // ⚠️  This is the most invasive theme-scoped override layer in the
  //     codebase. Only reuse this pattern for themes explicitly flagged
  //     MAXIMALIST in their spec.
  //
  // Scope note: CSS cannot shape heart-bubble price wrappers, inject a
  // rainbow-arc divider between sections, or run a cursor trail without
  // template-level React changes. Those elements are omitted; everything
  // CSS-achievable ships. Cursor trail also omitted per spec fallback
  // (complexity vs. motion-safety trade-off — prefers-reduced-motion users
  // would need it disabled anyway).
  //
  // Contrast audit (WCAG AA):
  //   · Deep Plum #3F1B5F on Lemonade Yellow #FFEB3B  → 11.20:1 ✅ (CTA)
  //   · Twilight Plum #2A1240 on 0.65 glass (blurred) → ~11:1   ✅ (headings)
  //   · Deep Plum on 0.65 glass (blurred over pink)   → ~9.4:1  ✅ (body)
  //   · Deep Plum directly on purple gradient patch   → 1.92:1  ❌
  //     (text MUST stay inside glass panels — enforced by container rule)
  candy: {
    id: "candy",
    name: "Unicorn Candy-Cloud",
    vibe: "Maximalist · sugar-rush · mesh gradient · iridescent · unicorn",
    category: "feminine",
    is_featured: true,
    bg: "#FF61A6",            // Bubblegum Pink fallback — mesh gradient applied via scoped CSS
    surface: "rgba(255,255,255,0.65)",  // Glass panel
    ink: "#2A1240",            // Twilight Plum — headings
    muted: "#3F1B5F",          // Deep Plum — body copy
    accent: "#FF61A6",         // Bubblegum Pink — secondary accent
    accent2: "#00E0D5",        // Bright Turquoise — fresh accent
    border: "rgba(63,27,95,0.2)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Nunito", "Manrope", system-ui, sans-serif',
    displayWeight: 700,
    displayTracking: "-0.01em",
    radius: 24,                 // Glass-panel rounded
    radiusBtn: 9999,            // Pill CTA
    btnBg: "#FFEB3B",           // Lemonade Yellow — CTA fill
    btnText: "#3F1B5F",         // Deep Plum on yellow = 11.20:1
    tags: ["maximalist", "unicorn", "candy", "gradient", "glassmorphism", "rainbow", "sugar"],
    business: {
      name: "Unicorn Candy-Cloud ✦",
      tagline: "sugar rush · rainbow sparkle · fantasy finish",
      bio: "A sugar-rush studio for holographic nails, rainbow hair, unicorn lashes, and finishes that look like they fell off a Lisa Frank sticker sheet. We believe more is more, glitter is mandatory, and every appointment ends with a photo moment.",
      location: "Suite 99 · 22 Candyfloss Blvd · Los Angeles, CA",
      phone: "(213) 555-0901",
      email: "hi@unicorncandycloud.co",
      category: "Fantasy Beauty & Color",
      heroImageId: "1540555700478-4be289fbecef",
      profileImageId: "1519014816548-bf5fe059798b",
      galleryIds: [
        "1540555700478-4be289fbecef","1519014816548-bf5fe059798b",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
        "1556228720-195a672e8a03","1505932794465-147d1f1b2c97",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
      ],
    },
  },

  // ── 28. Galactic Bender ─────────────────────────────────────────────────
  //
  // MAXIMALIST THEME — third maximalist-tier theme (after Unicorn Candy-
  // Cloud). Cosmic multiverse palette. Deep Space Violet base + diagonal
  // rainbow streaks + generic alien / saucer / planet / atomic-molecule
  // silhouettes + ooze splashes, all rendered as inline-SVG decorative
  // pseudo-elements scoped to `[data-oyrb-theme="galactic"]`.
  //
  // 🚨 All decorative SVGs are original / generic. No references to any
  //    copyrighted character, vehicle, or stylistic signature from any
  //    existing animated IP. Generic round-headed aliens, classic-disc
  //    flying saucers, ring planets, ball-and-stick atoms only.
  //
  // ⚠️  MAXIMALIST-tier pattern — do NOT replicate for standard themes.
  //
  // Contrast audit (WCAG AA):
  //   · Pure Starlight #F5F0FF on Deep Space Violet   → 13.62:1 ✅ (body/heads)
  //   · Pure Starlight on Deep Cosmic #1A0F2E         → 16.93:1 ✅
  //   · Cosmic Black #0F0A1A on Toxic Splash Green    → 11.24:1 ✅ (CTA)
  //   · Cosmic Cyan #4AC6E8 on Deep Space Violet      → 7.35:1  ✅ (secondary btn)
  //   · Rainbow streak colors — decorative surfaces, never text.
  galactic: {
    id: "galactic",
    name: "Galactic Bender",
    vibe: "Cosmic maximalist · rainbow streaks · alien multiverse · trippy",
    category: "bold",
    bg: "#2D1B4E",            // Deep Space Violet — main surface (+ CSS overlay)
    surface: "#1A0F2E",       // Deep Cosmic — layered containers
    ink: "#F5F0FF",            // Pure Starlight — headings
    muted: "#F5F0FF",          // Pure Starlight — body (on dark surface)
    accent: "#8FD934",         // Toxic Splash Green — CTAs, ooze
    accent2: "#C63FAF",        // Plasma Magenta — secondary accents
    border: "rgba(245,240,255,0.18)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 500,
    displayTracking: "-0.01em",
    radius: 16,
    radiusBtn: 9999,
    btnBg: "#8FD934",          // Toxic Splash Green — CTA fill
    btnText: "#0F0A1A",        // Cosmic Black on green = 11.24:1
    tags: ["maximalist", "cosmic", "alien", "rainbow", "saucer", "trippy", "dark"],
    business: {
      name: "Galactic Bender ✦",
      tagline: "interdimensional beauty · rainbow-grade service",
      bio: "A portal-opening color & makeup studio for those who treat their look like a transmission. Expect holographic finishes, deep-space hues, and enough sparkle to reach the next quadrant.",
      location: "Bay 12 · 404 Stardust Way · Austin, TX",
      phone: "(512) 555-0808",
      email: "transmit@galacticbender.co",
      category: "Fantasy Color & Makeup",
      heroImageId: "1519014816548-bf5fe059798b",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1519014816548-bf5fe059798b","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
        "1556228720-195a672e8a03","1505932794465-147d1f1b2c97",
        "1515377905703-c4788e51af15","1552693673-1bf958298935",
      ],
    },
  },

  // ── 29. Liquid Sunset Trip ──────────────────────────────────────────────
  //
  // ENHANCED THEME — medium tier (alongside League Lead, Neon Dream Island).
  // Pure color-flow aesthetic — NO decorative objects, NO icon swaps, NO
  // sparkles / aliens / planets / bullets. Only a warped multi-radial
  // watercolor gradient + glass panels + pink-magenta gradient CTAs.
  //
  // Intentional distinction from MAXIMALIST themes (Unicorn Candy-Cloud,
  // Galactic Bender): this theme is purely about dreamy color flow.
  //
  // ⚠️  ENHANCED-tier override pattern — scoped to `[data-oyrb-theme="sunset"]`.
  //
  // Contrast audit (WCAG AA):
  //   · Deep Plum #1F1240 on 0.85 glass (worst blend) → ~14.8:1 ✅ (body)
  //   · Deep Plum #1F1240 on Trip White #FDFBFE       → 18.72:1 ✅ (headings)
  //   · Deep Plum #1F1240 on Acid Pink #FF6EC7        → 6.77:1  ✅
  //   · Deep Plum #1F1240 on Warped Magenta #C63FAF   → 3.90:1  ✅ AA Large
  //     (CTA labels only — size ≥14px / weight ≥600 qualifies AA Large.)
  //   · Gradient palette colors — background only, never text.
  sunset: {
    id: "sunset",
    name: "Liquid Sunset Trip",
    vibe: "Trippy · watercolor · psychedelic · liquid sunset · color-flow",
    category: "feminine",
    bg: "#C63FAF",            // Warped Magenta fallback; gradient applied via scoped CSS
    surface: "#FDFBFE",       // Trip White — glass panel base
    ink: "#1F1240",            // Deep Plum — headings
    muted: "#1F1240",          // Deep Plum — body on glass
    accent: "#FF6EC7",         // Acid Pink — primary accent
    accent2: "#3DB5B0",        // Teal Wash — secondary accent
    border: "rgba(255,255,255,0.4)",
    displayFont: '"Fraunces", "Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    displayWeight: 500,
    displayTracking: "-0.01em",
    radius: 20,
    radiusBtn: 9999,
    btnBg: "#C63FAF",          // Magenta fallback; gradient applied via scoped CSS
    btnText: "#1F1240",        // Deep Plum on pink/magenta gradient (AA Large)
    tags: ["enhanced", "trippy", "watercolor", "psychedelic", "sunset", "gradient", "dreamy"],
    business: {
      name: "Liquid Sunset Trip",
      tagline: "watercolor color · dreamscape skin · slow afternoons",
      bio: "A watercolor-soft studio for hand-painted color, dreamscape makeup, and the kind of slow afternoons that feel like a long exhale. We work by natural light and finish every session with tea and a polaroid.",
      location: "Top Floor · 18 Marina Way · San Diego, CA",
      phone: "(619) 555-0245",
      email: "studio@liquidsunsettrip.co",
      category: "Color & Makeup Studio",
      heroImageId: "1515377905703-c4788e51af15",
      profileImageId: "1540555700478-4be289fbecef",
      galleryIds: [
        "1515377905703-c4788e51af15","1540555700478-4be289fbecef",
        "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
        "1552693673-1bf958298935","1556228720-195a672e8a03",
        "1505932794465-147d1f1b2c97","1519014816548-bf5fe059798b",
      ],
    },
  },
};

export const THEME_IDS = Object.keys(TEMPLATE_THEMES) as Array<keyof typeof TEMPLATE_THEMES>;

export const LAYOUT_TYPES = [
  { id: "original", name: "Original", description: "The signature layout for each template category — preserved as originally designed." },
  { id: "studio", name: "Studio", description: "Warm serif + service grid" },
  { id: "luxe", name: "Luxe", description: "Full-bleed hero + centered layout" },
  { id: "clean", name: "Clean", description: "Minimal header + service list + sidebar" },
  { id: "bold", name: "Bold", description: "Dark hero + service cards + sidebar" },
] as const;

export type LayoutType = typeof LAYOUT_TYPES[number]["id"];
