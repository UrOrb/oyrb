// Stock photo library — two-tier system:
// 1. Live Unsplash search (when UNSPLASH_ACCESS_KEY is set)
// 2. Curated verified Unsplash IDs as fallback
//
// Each category has a strict search query matching the beauty profession.
// When the API is enabled, the picker fetches fresh, on-topic photos.

import { unsplash } from "./template-images";

type Category = {
  label: string;
  description: string;
  query: string;              // Unsplash search query
  orientation: "landscape" | "portrait" | "squarish";
  // Fallback verified IDs if API isn't configured
  fallbackIds: string[];
};

export const STOCK_LIBRARY: Record<string, Category> = {
  hero: {
    label: "✦ Hero images",
    description: "Wide banner photos for the top of your site — salons, spas, studios",
    query: "beauty salon",
    orientation: "landscape",
    fallbackIds: [
      "1519014816548-bf5fe059798b", "1612817288484-6f916006741a",
      "1508214751196-bcfd4ca60f91", "1515377905703-c4788e51af15",
      "1556228720-195a672e8a03", "1604654894610-df63bc536371",
      "1620916566398-39f1143ab7be", "1556909114-f6e7ad7d3136",
      "1560250097-0b93528c311a", "1552693673-1bf958298935",
      "1560963805-6c64417e3413", "1580196969807-cc6de06c05be",
    ],
  },
  profile: {
    label: "✦ Profile images",
    description: "Beauty icons, product flatlays, cosmetic imagery (no people)",
    query: "beauty cosmetics flatlay",
    orientation: "squarish",
    fallbackIds: [
      "1519014816548-bf5fe059798b", "1612817288484-6f916006741a",
      "1556228720-195a672e8a03", "1580618672591-eb180b1a973f",
      "1505932794465-147d1f1b2c97", "1593642532744-d377ab507dc8",
      "1521123845560-14093637aa7d", "1507003211169-0a1dd7228f2d",
      "1612198188060-c7c2a3b66eae", "1526045478516-99145907023c",
    ],
  },
  hair: {
    label: "Hair styling",
    description: "Braids, curls, bundles, hairstyles, styling tools",
    query: "hair salon",
    orientation: "portrait",
    fallbackIds: [
      "1531746020798-e6953c6e8e04", "1519699047748-de8e457a634e",
      "1542838132-92c53300491e", "1581803118522-7b72a50f7e9f",
      "1623428187969-5da2dcea5ebf", "1492106087820-71f1a00d2b11",
      "1488426862026-3ee34a7d66df", "1582095133179-bfd08e2fc6b3",
      "1522337094846-8a818192de1f", "1562259929-b4e1fd3aef09",
    ],
  },
  nails: {
    label: "Nails",
    description: "Manicures, pedicures, nail art, hands, feet, pedicure bowls",
    query: "manicure nails",
    orientation: "squarish",
    fallbackIds: [
      "1604654894610-df63bc536371", "1519014816548-bf5fe059798b",
      "1562322140-8baeececf3df", "1620331311520-246422fd82f9",
      "1606107557195-0e29a4b5b4aa", "1595475207225-428b62bda831",
      "1549236177-f9b0031756eb", "1608248597279-f99d160bfcbc",
      "1540555700478-4be289fbecef", "1519415943484-9fa1873496d4",
    ],
  },
  lashes: {
    label: "Lash & brow",
    description: "Lash extensions, brow shaping, eyelashes, lash tools",
    query: "eyelashes eyebrows",
    orientation: "squarish",
    fallbackIds: [
      "1523264939339-c89f9dadde2e", "1516975080664-ed2fc6a32937",
      "1487412720507-e7ab37603c6f", "1580618672591-eb180b1a973f",
      "1588361861040-ac9b1018f6d5", "1618410320928-25228d811631",
      "1567892737950-30c4db37cd89", "1626954079979-ec4f7b05e032",
      "1552374196-c4e7ffc6e126", "1562259949-e8e7689d7828",
    ],
  },
  barber: {
    label: "Barbering",
    description: "Haircuts, fades, beards, barbershops, barbering tools",
    query: "barber barbershop",
    orientation: "portrait",
    fallbackIds: [
      "1503443207922-dff7d543fd0e", "1583195764036-6dc248ac07d9",
      "1519085360753-af0119f7cbe7", "1588466585717-f8041aec7875",
      "1549236177-f9b0031756eb", "1582053433976-25c00369fc93",
      "1519340241574-2cec6aef0c01", "1509783236416-c9ad59bae472",
      "1524502397800-2eeaad7c3fe5", "1571019613454-1cb2f99b2d8b",
    ],
  },
  skincare: {
    label: "Skincare & facials",
    description: "Facials, spa, hydrafacial, esthetician rooms, body care",
    query: "skincare facial",
    orientation: "squarish",
    fallbackIds: [
      "1556228720-195a672e8a03", "1515377905703-c4788e51af15",
      "1508214751196-bcfd4ca60f91", "1620916566398-39f1143ab7be",
      "1612817288484-6f916006741a", "1595152452543-e5fc28ebc2b8",
      "1505932794465-147d1f1b2c97", "1606107557195-0e29a4b5b4aa",
      "1527239441953-caffd968d952", "1519415943484-9fa1873496d4",
    ],
  },
  makeup: {
    label: "Makeup artistry",
    description: "Makeup application, brushes, palettes, glam, cosmetics",
    query: "makeup brushes",
    orientation: "squarish",
    fallbackIds: [
      "1487412720507-e7ab37603c6f", "1523264939339-c89f9dadde2e",
      "1516975080664-ed2fc6a32937", "1521123845560-14093637aa7d",
      "1580618672591-eb180b1a973f", "1588361861040-ac9b1018f6d5",
      "1618410320928-25228d811631", "1562259949-e8e7689d7828",
      "1552374196-c4e7ffc6e126", "1507003211169-0a1dd7228f2d",
    ],
  },
};

export function stockUrl(id: string, w = 800) {
  return unsplash(id, w, 85);
}

export function getStockImages(category: string | null | undefined) {
  const key = category && STOCK_LIBRARY[category] ? category : "hair";
  const lib = STOCK_LIBRARY[key].fallbackIds;
  return {
    hero: unsplash(STOCK_LIBRARY.hero.fallbackIds[0], 1600, 85),
    profile: unsplash(STOCK_LIBRARY.profile.fallbackIds[0], 400, 85),
    gallery: lib.slice(0, 6).map((id) => unsplash(id, 800, 85)),
  };
}

export function getAllCategories() {
  return Object.entries(STOCK_LIBRARY).map(([key, v]) => ({
    key,
    label: v.label,
    description: v.description,
    query: v.query,
    orientation: v.orientation,
  }));
}
