export const SAMPLE_BUSINESS = {
  name: "Honey George Studio",
  tagline: "Where your beauty meets intention.",
  bio: "Licensed cosmetologist with 10+ years of experience in natural hair, precision color, and transformative cuts. Every client leaves feeling seen, cared for, and stunning. Based in Atlanta, GA.",
  location: "Atlanta, GA",
  phone: "(404) 555-0192",
  email: "hello@honeygeorgestudio.com",
  instagram_url: "https://instagram.com/honeygeorge",
  hero_image_url: "https://images.unsplash.com/photo-1522337360426-a1af4b2b9f90?auto=format&fit=crop&w=1400&q=90",
  profile_image_url: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=400&q=85",
  photos: [
    "https://images.unsplash.com/photo-1560399465-a34fcba35f01?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1522338242992-e1d3aeac3b4a?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1619451334792-3e8f0b7c4c94?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80",
  ],
  subscription_status: "active",
};

export const SAMPLE_SERVICES = [
  { id: "1", name: "Signature Cut & Style", duration_minutes: 90, price_cents: 12500, description: "Precision cut tailored to your face shape, finished with a blowout and style." },
  { id: "2", name: "Full Color",             duration_minutes: 180, price_cents: 22000, description: "Single-process color from root to tip. Includes toner and blowout." },
  { id: "3", name: "Balayage",               duration_minutes: 240, price_cents: 30000, description: "Hand-painted highlights for a sun-kissed, natural-looking result." },
  { id: "4", name: "Silk Press",             duration_minutes: 120, price_cents: 9500,  description: "Smooth, shiny, heat-styled silk press on natural hair. Lasts up to 2 weeks." },
  { id: "5", name: "Loc Maintenance",        duration_minutes: 120, price_cents: 8500,  description: "Retwist, palm roll, or interlocking. Includes scalp treatment." },
  { id: "6", name: "Braid Styles",           duration_minutes: 180, price_cents: 15000, description: "Box braids, Knotless, or Senegalese twists. Length and add-ons may affect price." },
];

export const SAMPLE_HOURS = [
  { day: "Monday",    open: false, open_time: "",      close_time: "" },
  { day: "Tuesday",   open: true,  open_time: "10:00", close_time: "19:00" },
  { day: "Wednesday", open: true,  open_time: "10:00", close_time: "19:00" },
  { day: "Thursday",  open: true,  open_time: "10:00", close_time: "20:00" },
  { day: "Friday",    open: true,  open_time: "09:00", close_time: "20:00" },
  { day: "Saturday",  open: true,  open_time: "09:00", close_time: "18:00" },
  { day: "Sunday",    open: false, open_time: "",      close_time: "" },
];

export type SampleBusiness = typeof SAMPLE_BUSINESS;
export type SampleService  = (typeof SAMPLE_SERVICES)[number];
export type SampleHour     = (typeof SAMPLE_HOURS)[number];
