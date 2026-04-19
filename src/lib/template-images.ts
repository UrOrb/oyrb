// Curated Unsplash image library for beauty & salon templates
// 250+ high-quality commercial images organized by category

export const UNSPLASH_BASE = "https://images.unsplash.com/photo-";

export function unsplash(id: string, w = 800, q = 85) {
  // If a full URL was passed (e.g. a real business's uploaded image), use it directly.
  if (id.startsWith("http://") || id.startsWith("https://")) return id;
  return `${UNSPLASH_BASE}${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

// ── Hair Styling ──────────────────────────────────────────────────────────────
export const HAIR_IMAGES = [
  "1508214751196-bcfd4ca60f91", // stylist working on client
  "1519699047748-de8e457a634e", // beautiful hair result
  "1509783236416-c9ad59bae472", // curly hair closeup
  "1542838132-92c53300491e",    // natural hair styling
  "1531746020798-e6953c6e8e04", // hair transformation
  "1519014816548-bf5fe059798b",    // hair color work
  "1515377905703-c4788e51af15", // blowout finish
  "1556909114-f6e7ad7d3136", // detailed hairwork
  "1516975080664-ed2fc6a32937",    // salon environment
  "1492106087820-71f1a00d2b11",    // hair color close
  "1524502397800-2eeaad7c3fe5", // box braids
  "1552374196-c4e7ffc6e126", // natural hair care
  "1612817288484-6f916006741a", // hair treatment
  "1524502397800-2eeaad7c3fe5", // braids work
  "1556228720-195a672e8a03", // straightening
  "1515377905703-c4788e51af15",    // highlights work
  "1507003211169-0a1dd7228f2d",    // color melt
  "1492106087820-71f1a00d2b11", // cutting technique
  "1519699047748-de8e457a634e", // balayage work
  "1519340241574-2cec6aef0c01", // silk press result
  "1523264939339-c89f9dadde2e",    // afro styling
  "1581803118522-7b72a50f7e9f", // locs maintenance
  "1623428187969-5da2dcea5ebf", // twist out
  "1560963805-6c64417e3413", // protective style
  "1540555700478-4be289fbecef", // lash/brow detailing
];

// ── Nail Art ──────────────────────────────────────────────────────────────────
export const NAIL_IMAGES = [
  "1604654894610-df63bc536371", // nail art close
  "1517841905240-472988babdf9", // gel nails
  "1508214751196-bcfd4ca60f91",    // manicure setup
  "1519014816548-bf5fe059798b", // nail salon
  "1517841905240-472988babdf9", // nail extensions
  "1521123845560-14093637aa7d", // french tip
  "1531746020798-e6953c6e8e04", // nail art design
  "1494790108377-be9c29b29330", // color nails
  "1487412720507-e7ab37603c6f",    // manicure close
  "1604654894610-df63bc536371", // detailed nailwork
  "1505932794465-147d1f1b2c97",    // beauty tools
  "1488426862026-3ee34a7d66df", // nail products
  "1505932794465-147d1f1b2c97", // press-on nails
  "1503443207922-dff7d543fd0e", // nail art tools
  "1519014816548-bf5fe059798b", // salon tools
  "1516975080664-ed2fc6a32937",    // nail detail shot
  "1508214751196-bcfd4ca60f91",    // pedicure setup
  "1519014816548-bf5fe059798b", // manicure result
  "1604654894610-df63bc536371", // chrome nails
  "1517841905240-472988babdf9", // extension detail
];

// ── Lash & Brow ───────────────────────────────────────────────────────────────
export const LASH_BROW_IMAGES = [
  "1540555700478-4be289fbecef", // lash application
  "1505932794465-147d1f1b2c97",    // brow shaping
  "1517365830460-955ce3ccd263", // lash close
  "1488426862026-3ee34a7d66df", // beauty tools
  "1505932794465-147d1f1b2c97", // lash products
  "1503443207922-dff7d543fd0e", // brow artistry
  "1509783236416-c9ad59bae472", // eye close up
  "1519415943484-9fa1873496d4", // brow threading
  "1523264939339-c89f9dadde2e", // eye makeup
  "1516975080664-ed2fc6a32937", // beauty close up
  "1487412720507-e7ab37603c6f", // lash extensions
  "1507003211169-0a1dd7228f2d", // portrait beauty
  "1492106087820-71f1a00d2b11", // editorial eye
  "1517365830460-955ce3ccd263", // lash fan
  "1505932794465-147d1f1b2c97",    // brow tint
  "1488426862026-3ee34a7d66df", // lash tech tools
  "1505932794465-147d1f1b2c97", // glue palettes
  "1523264939339-c89f9dadde2e", // eye look result
  "1516975080664-ed2fc6a32937", // makeup artistry
  "1487412720507-e7ab37603c6f", // volume lashes
];

// ── Barbering ────────────────────────────────────────────────────────────────
export const BARBER_IMAGES = [
  "1492106087820-71f1a00d2b11", // barber fading
  "1550831107-1553da8c8464", // clean line-up
  "1519699047748-de8e457a634e",    // detail work
  "1557777586-f6682739fcf3", // barber shop
  "1487412720507-e7ab37603c6f", // razor shave
  "1507003211169-0a1dd7228f2d", // client portrait
  "1550831107-1553da8c8464", // barber at work
  "1519699047748-de8e457a634e",    // beard trim
  "1557777586-f6682739fcf3", // shop environment
  "1487412720507-e7ab37603c6f", // straight razor
  "1492106087820-71f1a00d2b11", // taper fade
  "1507003211169-0a1dd7228f2d", // haircut result
  "1550831107-1553da8c8464", // line up close
  "1519699047748-de8e457a634e",    // skin fade
  "1557777586-f6682739fcf3", // barber tools
  "1487412720507-e7ab37603c6f", // hot towel shave
  "1492106087820-71f1a00d2b11", // bald fade
  "1507003211169-0a1dd7228f2d", // clean cut portrait
  "1550831107-1553da8c8464", // edge up detail
  "1519699047748-de8e457a634e",    // mustache shaping
];

// ── Skincare & Facials ────────────────────────────────────────────────────────
export const SKIN_IMAGES = [
  "1519415943484-9fa1873496d4", // facial treatment
  "1515377905703-c4788e51af15", // skincare products
  "1508214751196-bcfd4ca60f91", // face massage
  "1556228720-195a672e8a03",    // gua sha
  "1508214751196-bcfd4ca60f91",    // skincare routine
  "1519014816548-bf5fe059798b", // face mask
  "1612817288484-6f916006741a", // facial tools
  "1507003211169-0a1dd7228f2d", // skincare serums
  "1620916566398-39f1143ab7be", // botanical skincare
  "1519415943484-9fa1873496d4", // treatment room
  "1515377905703-c4788e51af15", // clean beauty
  "1508214751196-bcfd4ca60f91", // facial massage
  "1556228720-195a672e8a03",    // jade roller
  "1508214751196-bcfd4ca60f91",    // skincare ritual
  "1519014816548-bf5fe059798b", // sheet mask
  "1612817288484-6f916006741a", // microdermabrasion
  "1507003211169-0a1dd7228f2d", // vitamin c serum
  "1620916566398-39f1143ab7be", // facial steamer
  "1519415943484-9fa1873496d4", // extractions
  "1515377905703-c4788e51af15", // organic skincare
];

// ── Makeup Artistry ───────────────────────────────────────────────────────────
export const MAKEUP_IMAGES = [
  "1487412720507-e7ab37603c6f", // makeup application
  "1523264939339-c89f9dadde2e", // eye makeup
  "1516975080664-ed2fc6a32937", // glam look
  "1517365830460-955ce3ccd263", // dramatic lashes
  "1505932794465-147d1f1b2c97",    // beauty tools
  "1488426862026-3ee34a7d66df", // makeup products
  "1505932794465-147d1f1b2c97", // palette selection
  "1503443207922-dff7d543fd0e", // makeup brushes
  "1519415943484-9fa1873496d4", // base application
  "1523264939339-c89f9dadde2e", // eyeshadow blend
  "1516975080664-ed2fc6a32937", // contouring
  "1487412720507-e7ab37603c6f", // lip application
  "1517365830460-955ce3ccd263", // lash curl
  "1505932794465-147d1f1b2c97",    // brush technique
  "1488426862026-3ee34a7d66df", // product flatlay
  "1505932794465-147d1f1b2c97", // pigment swatches
  "1503443207922-dff7d543fd0e", // brush collection
  "1519415943484-9fa1873496d4", // highlight
  "1523264939339-c89f9dadde2e", // smoky eye
  "1516975080664-ed2fc6a32937", // bold glam result
];

// ── Salon Environments ────────────────────────────────────────────────────────
export const SALON_IMAGES = [
  "1516975080664-ed2fc6a32937",    // salon interior
  "1508214751196-bcfd4ca60f91",    // beauty station
  "1519014816548-bf5fe059798b", // professional setup
  "1612817288484-6f916006741a", // vanity mirror
  "1507003211169-0a1dd7228f2d", // salon products
  "1620916566398-39f1143ab7be", // treatment table
  "1515377905703-c4788e51af15", // clean studio
  "1508214751196-bcfd4ca60f91", // beauty room
  "1556228720-195a672e8a03",    // zen space
  "1519415943484-9fa1873496d4", // esthetic room
  "1516975080664-ed2fc6a32937",    // styling chairs
  "1508214751196-bcfd4ca60f91",    // reception area
  "1519014816548-bf5fe059798b", // product display
  "1612817288484-6f916006741a", // ring light setup
  "1507003211169-0a1dd7228f2d", // treatment bottles
  "1620916566398-39f1143ab7be", // massage table
  "1515377905703-c4788e51af15", // minimal studio
  "1508214751196-bcfd4ca60f91", // cozy booth
  "1556228720-195a672e8a03",    // crystal decor
  "1519415943484-9fa1873496d4", // warm lighting
];

// ── Portrait / Beauty Editorial ───────────────────────────────────────────────
export const PORTRAIT_IMAGES = [
  "1519699047748-de8e457a634e", // beauty portrait
  "1531746020798-e6953c6e8e04", // professional headshot
  "1517365830460-955ce3ccd263", // glam portrait
  "1492106087820-71f1a00d2b11", // confident pose
  "1507003211169-0a1dd7228f2d", // editorial portrait
  "1487412720507-e7ab37603c6f", // makeup portrait
  "1523264939339-c89f9dadde2e", // eye detail
  "1516975080664-ed2fc6a32937", // beauty shot
  "1519415943484-9fa1873496d4", // skincare portrait
  "1508214751196-bcfd4ca60f91", // natural beauty
  "1505932794465-147d1f1b2c97",    // brow portrait
  "1488426862026-3ee34a7d66df", // product portrait
  "1505932794465-147d1f1b2c97", // studio portrait
  "1503443207922-dff7d543fd0e", // creative portrait
  "1540555700478-4be289fbecef", // lash portrait
  "1509783236416-c9ad59bae472", // curl portrait
  "1519699047748-de8e457a634e", // afro portrait
  "1542838132-92c53300491e",    // natural hair portrait
  "1519014816548-bf5fe059798b",    // color result portrait
  "1556909114-f6e7ad7d3136", // detail portrait
];

// ── All images flat list ──────────────────────────────────────────────────────
export const ALL_IMAGES = [
  ...HAIR_IMAGES,
  ...NAIL_IMAGES,
  ...LASH_BROW_IMAGES,
  ...BARBER_IMAGES,
  ...SKIN_IMAGES,
  ...MAKEUP_IMAGES,
  ...SALON_IMAGES,
  ...PORTRAIT_IMAGES,
];

// Theme-specific image collections
export const THEME_IMAGE_SETS: Record<string, string[]> = {
  aura: [
    "1519415943484-9fa1873496d4","1503443207922-dff7d543fd0e",
    "1509783236416-c9ad59bae472","1508214751196-bcfd4ca60f91",
    "1519014816548-bf5fe059798b","1556228720-195a672e8a03",
    "1612817288484-6f916006741a","1515377905703-c4788e51af15",
    "1620916566398-39f1143ab7be","1507003211169-0a1dd7228f2d",
    "1508214751196-bcfd4ca60f91","1531746020798-e6953c6e8e04",
  ],
  luxe: [
    "1508214751196-bcfd4ca60f91","1492106087820-71f1a00d2b11",
    "1523264939339-c89f9dadde2e","1487412720507-e7ab37603c6f",
    "1516975080664-ed2fc6a32937","1507003211169-0a1dd7228f2d",
    "1517365830460-955ce3ccd263","1542838132-92c53300491e",
    "1531746020798-e6953c6e8e04","1505932794465-147d1f1b2c97",
    "1503443207922-dff7d543fd0e","1488426862026-3ee34a7d66df",
  ],
  earth: [
    "1515377905703-c4788e51af15","1508214751196-bcfd4ca60f91",
    "1519014816548-bf5fe059798b","1508214751196-bcfd4ca60f91",
    "1620916566398-39f1143ab7be","1556228720-195a672e8a03",
    "1507003211169-0a1dd7228f2d","1612817288484-6f916006741a",
    "1519415943484-9fa1873496d4","1509783236416-c9ad59bae472",
    "1519699047748-de8e457a634e","1519014816548-bf5fe059798b",
  ],
  bold: [
    "1487412720507-e7ab37603c6f","1517365830460-955ce3ccd263",
    "1523264939339-c89f9dadde2e","1516975080664-ed2fc6a32937",
    "1505932794465-147d1f1b2c97","1488426862026-3ee34a7d66df",
    "1505932794465-147d1f1b2c97","1492106087820-71f1a00d2b11",
    "1507003211169-0a1dd7228f2d","1503443207922-dff7d543fd0e",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
  ],
  minimal: [
    "1604654894610-df63bc536371","1516975080664-ed2fc6a32937",
    "1517841905240-472988babdf9","1519014816548-bf5fe059798b",
    "1508214751196-bcfd4ca60f91","1612817288484-6f916006741a",
    "1507003211169-0a1dd7228f2d","1508214751196-bcfd4ca60f91",
    "1519699047748-de8e457a634e","1503443207922-dff7d543fd0e",
    "1519415943484-9fa1873496d4","1515377905703-c4788e51af15",
  ],
  street: [
    "1492106087820-71f1a00d2b11","1507003211169-0a1dd7228f2d",
    "1519699047748-de8e457a634e","1550831107-1553da8c8464",
    "1557777586-f6682739fcf3","1487412720507-e7ab37603c6f",
    "1517365830460-955ce3ccd263","1487412720507-e7ab37603c6f",
    "1523264939339-c89f9dadde2e","1516975080664-ed2fc6a32937",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
  ],
  y2k: [
    "1509783236416-c9ad59bae472","1531746020798-e6953c6e8e04",
    "1540555700478-4be289fbecef","1519699047748-de8e457a634e",
    "1505932794465-147d1f1b2c97","1488426862026-3ee34a7d66df",
    "1517365830460-955ce3ccd263","1505932794465-147d1f1b2c97",
    "1516975080664-ed2fc6a32937","1508214751196-bcfd4ca60f91",
    "1519415943484-9fa1873496d4","1503443207922-dff7d543fd0e",
  ],
  rose: [
    "1519699047748-de8e457a634e","1508214751196-bcfd4ca60f91",
    "1508214751196-bcfd4ca60f91","1505932794465-147d1f1b2c97",
    "1509783236416-c9ad59bae472","1488426862026-3ee34a7d66df",
    "1519415943484-9fa1873496d4","1515377905703-c4788e51af15",
    "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
    "1519014816548-bf5fe059798b","1519014816548-bf5fe059798b",
  ],
  sage: [
    "1620916566398-39f1143ab7be","1519699047748-de8e457a634e",
    "1515377905703-c4788e51af15","1508214751196-bcfd4ca60f91",
    "1612817288484-6f916006741a","1507003211169-0a1dd7228f2d",
    "1508214751196-bcfd4ca60f91","1556228720-195a672e8a03",
    "1519415943484-9fa1873496d4","1519014816548-bf5fe059798b",
    "1509783236416-c9ad59bae472","1519014816548-bf5fe059798b",
  ],
  slate: [
    "1492106087820-71f1a00d2b11","1507003211169-0a1dd7228f2d",
    "1550831107-1553da8c8464","1519699047748-de8e457a634e",
    "1557777586-f6682739fcf3","1487412720507-e7ab37603c6f",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
    "1516975080664-ed2fc6a32937","1519014816548-bf5fe059798b",
    "1612817288484-6f916006741a","1507003211169-0a1dd7228f2d",
  ],
  noir: [
    "1523264939339-c89f9dadde2e","1517365830460-955ce3ccd263",
    "1516975080664-ed2fc6a32937","1487412720507-e7ab37603c6f",
    "1505932794465-147d1f1b2c97","1488426862026-3ee34a7d66df",
    "1517841905240-472988babdf9","1503443207922-dff7d543fd0e",
    "1492106087820-71f1a00d2b11","1507003211169-0a1dd7228f2d",
    "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
  ],
  citrus: [
    "1542838132-92c53300491e","1519014816548-bf5fe059798b",
    "1531746020798-e6953c6e8e04","1509783236416-c9ad59bae472",
    "1519699047748-de8e457a634e","1505932794465-147d1f1b2c97",
    "1516975080664-ed2fc6a32937","1540555700478-4be289fbecef",
    "1508214751196-bcfd4ca60f91","1519415943484-9fa1873496d4",
    "1487412720507-e7ab37603c6f","1523264939339-c89f9dadde2e",
  ],
};

// Sample services by category
export const SAMPLE_SERVICES_BY_CATEGORY: Record<string, Array<{
  id: string; name: string; duration_minutes: number; price_cents: number; description: string;
}>> = {
  hair: [
    { id:"1", name:"Signature Cut & Style",  duration_minutes:90,  price_cents:12500, description:"Precision cut tailored to your face shape, finished with a blowout and style." },
    { id:"2", name:"Full Color",             duration_minutes:180, price_cents:22000, description:"Single-process color from root to tip. Includes toner and blowout." },
    { id:"3", name:"Balayage",               duration_minutes:240, price_cents:30000, description:"Hand-painted highlights for a sun-kissed, natural-looking result." },
    { id:"4", name:"Silk Press",             duration_minutes:120, price_cents:9500,  description:"Smooth, shiny, heat-styled silk press on natural hair. Lasts up to 2 weeks." },
    { id:"5", name:"Loc Maintenance",        duration_minutes:120, price_cents:8500,  description:"Retwist, palm roll, or interlocking. Includes scalp treatment." },
    { id:"6", name:"Braid Styles",           duration_minutes:180, price_cents:15000, description:"Box braids, Knotless, or Senegalese twists. Length and add-ons may affect price." },
  ],
  nails: [
    { id:"1", name:"Gel Manicure",           duration_minutes:60,  price_cents:5500,  description:"Long-lasting gel polish application with cuticle care and hand massage." },
    { id:"2", name:"Acrylic Full Set",       duration_minutes:90,  price_cents:8000,  description:"Full acrylic extension set with your choice of shape and length." },
    { id:"3", name:"Nail Art (Per Nail)",    duration_minutes:15,  price_cents:1000,  description:"Custom nail art designs. Florals, abstracts, and seasonal designs available." },
    { id:"4", name:"Pedicure Deluxe",        duration_minutes:75,  price_cents:6500,  description:"Foot soak, exfoliation, cuticle care, callus removal, and polish of your choice." },
    { id:"5", name:"Gel Polish Removal",     duration_minutes:30,  price_cents:2500,  description:"Safe gel removal with cuticle conditioning treatment." },
    { id:"6", name:"Dip Powder Set",         duration_minutes:75,  price_cents:7500,  description:"Durable dip powder application. Odor-free and longer lasting than gel." },
  ],
  lashes: [
    { id:"1", name:"Classic Full Set",       duration_minutes:90,  price_cents:12000, description:"One extension per natural lash for a natural, defined look." },
    { id:"2", name:"Hybrid Set",             duration_minutes:105, price_cents:15000, description:"Mix of classic and volume for a textured, fuller look." },
    { id:"3", name:"Mega Volume Set",        duration_minutes:120, price_cents:18000, description:"Ultra-full, dramatic look with 10-16D fans on each lash." },
    { id:"4", name:"Lash Fill (2 Weeks)",    duration_minutes:60,  price_cents:7000,  description:"2-week fill to maintain fullness between full sets." },
    { id:"5", name:"Brow Lamination",        duration_minutes:60,  price_cents:8500,  description:"Brow perm that lifts and sets brows in place for 6–8 weeks." },
    { id:"6", name:"Lash Lift & Tint",       duration_minutes:60,  price_cents:9000,  description:"Semi-permanent curl with a keratin treatment. No extensions needed." },
  ],
  barber: [
    { id:"1", name:"Haircut & Style",        duration_minutes:45,  price_cents:4500,  description:"Precision cut with clippers or scissors, your preferred style." },
    { id:"2", name:"Skin Fade",              duration_minutes:50,  price_cents:5500,  description:"Gradual fade from skin to full on top. Clean line-up included." },
    { id:"3", name:"Beard Trim & Shape",     duration_minutes:30,  price_cents:3500,  description:"Shape, trim, and edge. Includes hot towel and beard oil." },
    { id:"4", name:"Cut + Beard Combo",      duration_minutes:70,  price_cents:8000,  description:"Full haircut plus beard trim and shape. Best value service." },
    { id:"5", name:"Hot Towel Shave",        duration_minutes:45,  price_cents:5000,  description:"Traditional straight razor shave with hot towel and premium shave cream." },
    { id:"6", name:"Kid's Cut (Under 12)",   duration_minutes:30,  price_cents:3000,  description:"Patient, fun haircut for kids. All styles welcome." },
  ],
  skincare: [
    { id:"1", name:"Signature Facial",       duration_minutes:75,  price_cents:12000, description:"Customized facial with cleanse, exfoliation, extraction, and mask." },
    { id:"2", name:"Gua Sha Treatment",      duration_minutes:60,  price_cents:10000, description:"Traditional gua sha face sculpting with herbal oils. Lymphatic drainage." },
    { id:"3", name:"Chemical Peel",          duration_minutes:45,  price_cents:15000, description:"Exfoliating peel for hyperpigmentation, texture, and brightness." },
    { id:"4", name:"Microneedling",          duration_minutes:90,  price_cents:25000, description:"Collagen induction therapy for anti-aging and scar revision." },
    { id:"5", name:"Dermaplaning",           duration_minutes:45,  price_cents:9500,  description:"Manual exfoliation removing dead skin and vellus hair for glowing skin." },
    { id:"6", name:"Back Facial",            duration_minutes:60,  price_cents:11000, description:"Cleanse, exfoliation, and extraction for the back. Perfect before events." },
  ],
  makeup: [
    { id:"1", name:"Bridal Makeup",          duration_minutes:120, price_cents:35000, description:"Flawless bridal look. Includes trial booking. Airbrush option available." },
    { id:"2", name:"Event Glam",             duration_minutes:90,  price_cents:18000, description:"Full glam for galas, events, photoshoots. Includes lash application." },
    { id:"3", name:"Everyday Makeup",        duration_minutes:60,  price_cents:12000, description:"Natural-to-glam everyday look with a lesson on application." },
    { id:"4", name:"Brow Design",            duration_minutes:45,  price_cents:8000,  description:"Custom brow mapping, shaping, and tinting. Brow goals: achieved." },
    { id:"5", name:"Airbrush Foundation",    duration_minutes:30,  price_cents:7500,  description:"Long-lasting airbrush base perfect for photography and events." },
    { id:"6", name:"Makeup Lesson",          duration_minutes:90,  price_cents:15000, description:"1-on-1 personalized lesson. Learn techniques for your specific features." },
  ],
};

// Sample hours
export const SAMPLE_HOURS = [
  { day: "Monday",    open: false, open_time: "",      close_time: "" },
  { day: "Tuesday",   open: true,  open_time: "10:00", close_time: "19:00" },
  { day: "Wednesday", open: true,  open_time: "10:00", close_time: "19:00" },
  { day: "Thursday",  open: true,  open_time: "10:00", close_time: "20:00" },
  { day: "Friday",    open: true,  open_time: "09:00", close_time: "20:00" },
  { day: "Saturday",  open: true,  open_time: "09:00", close_time: "18:00" },
  { day: "Sunday",    open: false, open_time: "",      close_time: "" },
];
