// Template theme definitions — 12 complete design systems
// Each theme drives colors, typography, shape, and vibe

export interface TemplateTheme {
  id: string;
  name: string;
  vibe: string;
  category: "feminine" | "editorial" | "natural" | "bold" | "minimal" | "street";
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
      heroImageId: "1570172619644-bfd9a5847c35",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1570172619644-bfd9a5847c35","1512290923682-db3b00b66e5c",
        "1522337660416-9e4f73a7da7e","1519699047748-de8e457a634e",
        "1560399465-a34fcba35f01","1560066984-138daab7b9dd",
        "1522338242992-e1d3aeac3b4a","1619451334792-3e8f0b7c4c94",
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
      heroImageId: "1522337360426-a1af4b2b9f90",
      profileImageId: "1503951458645-643d3701e0b0",
      galleryIds: [
        "1522337360426-a1af4b2b9f90","1531746020798-e6953c6e8e04",
        "1542838132-92c53300491e","1503951458645-643d3701e0b0",
        "1523264939339-c89f9dadde2e","1487412720507-e7ab37603c6f",
        "1516975080664-ed2fc6a32937","1507003211169-0a1dd7228f2d",
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
      heroImageId: "1515377905703-c4788e51af15",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1515377905703-c4788e51af15","1508214751196-bcfd4ca60f91",
        "1519014816548-bf5fe059798b","1556229162-5777d4c4d405",
        "1620916566398-39f1143ab7be","1556228720-195a672e8a03",
        "1516585427167-1c1e1ddc50f6","1612817288484-6f916006741a",
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
      heroImageId: "1487412720507-e7ab37603c6f",
      profileImageId: "1541516160021-aa34e43e4c95",
      galleryIds: [
        "1487412720507-e7ab37603c6f","1541516160021-aa34e43e4c95",
        "1523264939339-c89f9dadde2e","1512290923682-db3b00b66e5c",
        "1516975080664-ed2fc6a32937","1547425827-e0d0e9f41b60",
        "1493412922794-1f7f4be50d1c","1505932794465-147d1f1b2c97",
      ],
    },
  },

  // ── 5. Minimal ───────────────────────────────────────────────────────────
  minimal: {
    id: "minimal",
    name: "Minimal",
    vibe: "Clean whitespace · type-led · quiet luxury",
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
      name: "Blanc Studio",
      tagline: "Nails. Quietly considered.",
      bio: "Precision manicures in a calm room. Japanese gels, sculpted extensions, and an aversion to anything loud. Every appointment is 90 minutes of pure focus.",
      location: "Suite 4 · 1400 Abbot Kinney · Venice, CA",
      phone: "(310) 555-0847",
      email: "hello@blancnails.com",
      category: "Nail Art & Extensions",
      heroImageId: "1604654894610-df63bc536371",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1604654894610-df63bc536371","1560066984-138daab7b9dd",
        "1603217040831-61fa3e3e1cd8","1604654894610-df63bc536371",
        "1519014816548-bf5fe059798b","1547962214523-aaee3bbf5ad3",
        "1556229162-5777d4c4d405","1512290923682-db3b00b66e5c",
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
      heroImageId: "1503951458645-643d3701e0b0",
      profileImageId: "1507003211169-0a1dd7228f2d",
      galleryIds: [
        "1503951458645-643d3701e0b0","1507003211169-0a1dd7228f2d",
        "1622115166-bbc5c7aff475","1605497788090-9956dd3c3a0f",
        "1621605815971-86d50c90de2b","1503951458645-643d3701e0b0",
        "1484515991647-c03168d7de6e","1604654894610-df63bc536371",
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
      heroImageId: "1522337660416-9e4f73a7da7e",
      profileImageId: "1531746020798-e6953c6e8e04",
      galleryIds: [
        "1522337660416-9e4f73a7da7e","1531746020798-e6953c6e8e04",
        "1603217040831-61fa3e3e1cd8","1519699047748-de8e457a634e",
        "1547425827-e0d0e9f41b60","1493412922794-1f7f4be50d1c",
        "1541516160021-aa34e43e4c95","1512290923682-db3b00b66e5c",
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
      heroImageId: "1519699047748-de8e457a634e",
      profileImageId: "1508214751196-bcfd4ca60f91",
      galleryIds: [
        "1519699047748-de8e457a634e","1508214751196-bcfd4ca60f91",
        "1522337360426-a1af4b2b9f90","1547425827-e0d0e9f41b60",
        "1522337660416-9e4f73a7da7e","1493412922794-1f7f4be50d1c",
        "1512290923682-db3b00b66e5c","1523264939339-c89f9dadde2e",
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
      heroImageId: "1620916566398-39f1143ab7be",
      profileImageId: "1519699047748-de8e457a634e",
      galleryIds: [
        "1620916566398-39f1143ab7be","1519699047748-de8e457a634e",
        "1515377905703-c4788e51af15","1556229162-5777d4c4d405",
        "1612817288484-6f916006741a","1620916566398-39f1143ab7be",
        "1516585427167-1c1e1ddc50f6","1508214751196-bcfd4ca60f91",
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
      heroImageId: "1503951458645-643d3701e0b0",
      profileImageId: "1507003211169-0a1dd7228f2d",
      galleryIds: [
        "1503951458645-643d3701e0b0","1507003211169-0a1dd7228f2d",
        "1605497788090-9956dd3c3a0f","1622115166-bbc5c7aff475",
        "1621605815971-86d50c90de2b","1484515991647-c03168d7de6e",
        "1605497788090-9956dd3c3a0f","1503951458645-643d3701e0b0",
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
      heroImageId: "1523264939339-c89f9dadde2e",
      profileImageId: "1541516160021-aa34e43e4c95",
      galleryIds: [
        "1523264939339-c89f9dadde2e","1541516160021-aa34e43e4c95",
        "1516975080664-ed2fc6a32937","1487412720507-e7ab37603c6f",
        "1505932794465-147d1f1b2c97","1493412922794-1f7f4be50d1c",
        "1547962214523-aaee3bbf5ad3","1512290923682-db3b00b66e5c",
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
      heroImageId: "1542838132-92c53300491e",
      profileImageId: "1560399465-a34fcba35f01",
      galleryIds: [
        "1542838132-92c53300491e","1560399465-a34fcba35f01",
        "1531746020798-e6953c6e8e04","1522337660416-9e4f73a7da7e",
        "1519699047748-de8e457a634e","1547425827-e0d0e9f41b60",
        "1560066984-138daab7b9dd","1603217040831-61fa3e3e1cd8",
      ],
    },
  },
};

export const THEME_IDS = Object.keys(TEMPLATE_THEMES) as Array<keyof typeof TEMPLATE_THEMES>;

export const LAYOUT_TYPES = [
  { id: "bold", name: "Bold", description: "Dark hero + service cards + sidebar" },
  { id: "clean", name: "Clean", description: "Minimal header + service list + sidebar" },
  { id: "studio", name: "Studio", description: "Warm serif + service grid" },
  { id: "luxe", name: "Luxe", description: "Full-bleed hero + centered layout" },
] as const;

export type LayoutType = typeof LAYOUT_TYPES[number]["id"];
