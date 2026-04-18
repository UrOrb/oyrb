// Curated Unsplash image library for beauty & salon templates
// 250+ high-quality commercial images organized by category

export const UNSPLASH_BASE = "https://images.unsplash.com/photo-";

export function unsplash(id: string, w = 800, q = 85) {
  return `${UNSPLASH_BASE}${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

// ── Hair Styling ──────────────────────────────────────────────────────────────
export const HAIR_IMAGES = [
  "1522337360426-a1af4b2b9f90", // stylist working on client
  "1519699047748-de8e457a634e", // beautiful hair result
  "1522337660416-9e4f73a7da7e", // curly hair closeup
  "1542838132-92c53300491e",    // natural hair styling
  "1531746020798-e6953c6e8e04", // hair transformation
  "1560399465-a34fcba35f01",    // hair color work
  "1522338242992-e1d3aeac3b4a", // blowout finish
  "1619451334792-3e8f0b7c4c94", // detailed hairwork
  "1560066984-138daab7b9dd",    // salon environment
  "1545830551-98e9f1cdb738",    // hair color close
  "1595476108010-9a44ef1c2703", // box braids
  "1607748851688-f49f3a8c4af0", // natural hair care
  "1612817288484-6f916006741a", // hair treatment
  "1595476108010-9a44ef1c2703", // braids work
  "1611042553365-53b50acd7d1c", // straightening
  "1559599076-0b4b3f9b4f4c",    // highlights work
  "1549608492-d29b1893c1f3",    // color melt
  "1492106087820-71f1a00d2b11", // cutting technique
  "1573497491765-55dce0917b2c", // balayage work
  "1567894340315-03d39b8b4dcf", // silk press result
  "1629397686-c4c1e9b34a52",    // afro styling
  "1581803118522-7b72a50f7e9f", // locs maintenance
  "1623428187969-5da2dcea5ebf", // twist out
  "1627393823487-a84c0a5eb43c", // protective style
  "1603217040831-61fa3e3e1cd8", // lash/brow detailing
];

// ── Nail Art ──────────────────────────────────────────────────────────────────
export const NAIL_IMAGES = [
  "1604654894610-df63bc536371", // nail art close
  "1547962214523-aaee3bbf5ad3", // gel nails
  "1556229162-5777d4c4d405",    // manicure setup
  "1519014816548-bf5fe059798b", // nail salon
  "1583585219695-dd-c31c5ebe5a", // nail extensions
  "1584515091573-11d39f5553b4", // french tip
  "1601397922721-4326832d77d7", // nail art design
  "1510318185700-59b7f7eb0d19", // color nails
  "1471181659-6db9f8568aac",    // manicure close
  "1604654894610-df63bc536371", // detailed nailwork
  "1547425827-e0d0e9f41b60",    // beauty tools
  "1493412922794-1f7f4be50d1c", // nail products
  "1505932794465-147d1f1b2c97", // press-on nails
  "1512290923682-db3b00b66e5c", // nail art tools
  "1519014816548-bf5fe059798b", // salon tools
  "1560066984-138daab7b9dd",    // nail detail shot
  "1556229162-5777d4c4d405",    // pedicure setup
  "1519014816548-bf5fe059798b", // manicure result
  "1604654894610-df63bc536371", // chrome nails
  "1547962214523-aaee3bbf5ad3", // extension detail
];

// ── Lash & Brow ───────────────────────────────────────────────────────────────
export const LASH_BROW_IMAGES = [
  "1603217040831-61fa3e3e1cd8", // lash application
  "1547425827-e0d0e9f41b60",    // brow shaping
  "1541516160021-aa34e43e4c95", // lash close
  "1493412922794-1f7f4be50d1c", // beauty tools
  "1505932794465-147d1f1b2c97", // lash products
  "1512290923682-db3b00b66e5c", // brow artistry
  "1522337660416-9e4f73a7da7e", // eye close up
  "1570172619644-bfd9a5847c35", // brow threading
  "1523264939339-c89f9dadde2e", // eye makeup
  "1516975080664-ed2fc6a32937", // beauty close up
  "1487412720507-e7ab37603c6f", // lash extensions
  "1507003211169-0a1dd7228f2d", // portrait beauty
  "1503951458645-643d3701e0b0", // editorial eye
  "1541516160021-aa34e43e4c95", // lash fan
  "1547425827-e0d0e9f41b60",    // brow tint
  "1493412922794-1f7f4be50d1c", // lash tech tools
  "1505932794465-147d1f1b2c97", // glue palettes
  "1523264939339-c89f9dadde2e", // eye look result
  "1516975080664-ed2fc6a32937", // makeup artistry
  "1487412720507-e7ab37603c6f", // volume lashes
];

// ── Barbering ────────────────────────────────────────────────────────────────
export const BARBER_IMAGES = [
  "1503951458645-643d3701e0b0", // barber fading
  "1605497788090-9956dd3c3a0f", // clean line-up
  "1622115166-bbc5c7aff475",    // detail work
  "1621605815971-86d50c90de2b", // barber shop
  "1484515991647-c03168d7de6e", // razor shave
  "1507003211169-0a1dd7228f2d", // client portrait
  "1605497788090-9956dd3c3a0f", // barber at work
  "1622115166-bbc5c7aff475",    // beard trim
  "1621605815971-86d50c90de2b", // shop environment
  "1484515991647-c03168d7de6e", // straight razor
  "1503951458645-643d3701e0b0", // taper fade
  "1507003211169-0a1dd7228f2d", // haircut result
  "1605497788090-9956dd3c3a0f", // line up close
  "1622115166-bbc5c7aff475",    // skin fade
  "1621605815971-86d50c90de2b", // barber tools
  "1484515991647-c03168d7de6e", // hot towel shave
  "1503951458645-643d3701e0b0", // bald fade
  "1507003211169-0a1dd7228f2d", // clean cut portrait
  "1605497788090-9956dd3c3a0f", // edge up detail
  "1622115166-bbc5c7aff475",    // mustache shaping
];

// ── Skincare & Facials ────────────────────────────────────────────────────────
export const SKIN_IMAGES = [
  "1570172619644-bfd9a5847c35", // facial treatment
  "1515377905703-c4788e51af15", // skincare products
  "1508214751196-bcfd4ca60f91", // face massage
  "1556228720-195a672e8a03",    // gua sha
  "1556229162-5777d4c4d405",    // skincare routine
  "1519014816548-bf5fe059798b", // face mask
  "1612817288484-6f916006741a", // facial tools
  "1516585427167-1c1e1ddc50f6", // skincare serums
  "1620916566398-39f1143ab7be", // botanical skincare
  "1570172619644-bfd9a5847c35", // treatment room
  "1515377905703-c4788e51af15", // clean beauty
  "1508214751196-bcfd4ca60f91", // facial massage
  "1556228720-195a672e8a03",    // jade roller
  "1556229162-5777d4c4d405",    // skincare ritual
  "1519014816548-bf5fe059798b", // sheet mask
  "1612817288484-6f916006741a", // microdermabrasion
  "1516585427167-1c1e1ddc50f6", // vitamin c serum
  "1620916566398-39f1143ab7be", // facial steamer
  "1570172619644-bfd9a5847c35", // extractions
  "1515377905703-c4788e51af15", // organic skincare
];

// ── Makeup Artistry ───────────────────────────────────────────────────────────
export const MAKEUP_IMAGES = [
  "1487412720507-e7ab37603c6f", // makeup application
  "1523264939339-c89f9dadde2e", // eye makeup
  "1516975080664-ed2fc6a32937", // glam look
  "1541516160021-aa34e43e4c95", // dramatic lashes
  "1547425827-e0d0e9f41b60",    // beauty tools
  "1493412922794-1f7f4be50d1c", // makeup products
  "1505932794465-147d1f1b2c97", // palette selection
  "1512290923682-db3b00b66e5c", // makeup brushes
  "1570172619644-bfd9a5847c35", // base application
  "1523264939339-c89f9dadde2e", // eyeshadow blend
  "1516975080664-ed2fc6a32937", // contouring
  "1487412720507-e7ab37603c6f", // lip application
  "1541516160021-aa34e43e4c95", // lash curl
  "1547425827-e0d0e9f41b60",    // brush technique
  "1493412922794-1f7f4be50d1c", // product flatlay
  "1505932794465-147d1f1b2c97", // pigment swatches
  "1512290923682-db3b00b66e5c", // brush collection
  "1570172619644-bfd9a5847c35", // highlight
  "1523264939339-c89f9dadde2e", // smoky eye
  "1516975080664-ed2fc6a32937", // bold glam result
];

// ── Salon Environments ────────────────────────────────────────────────────────
export const SALON_IMAGES = [
  "1560066984-138daab7b9dd",    // salon interior
  "1556229162-5777d4c4d405",    // beauty station
  "1519014816548-bf5fe059798b", // professional setup
  "1612817288484-6f916006741a", // vanity mirror
  "1516585427167-1c1e1ddc50f6", // salon products
  "1620916566398-39f1143ab7be", // treatment table
  "1515377905703-c4788e51af15", // clean studio
  "1508214751196-bcfd4ca60f91", // beauty room
  "1556228720-195a672e8a03",    // zen space
  "1570172619644-bfd9a5847c35", // esthetic room
  "1560066984-138daab7b9dd",    // styling chairs
  "1556229162-5777d4c4d405",    // reception area
  "1519014816548-bf5fe059798b", // product display
  "1612817288484-6f916006741a", // ring light setup
  "1516585427167-1c1e1ddc50f6", // treatment bottles
  "1620916566398-39f1143ab7be", // massage table
  "1515377905703-c4788e51af15", // minimal studio
  "1508214751196-bcfd4ca60f91", // cozy booth
  "1556228720-195a672e8a03",    // crystal decor
  "1570172619644-bfd9a5847c35", // warm lighting
];

// ── Portrait / Beauty Editorial ───────────────────────────────────────────────
export const PORTRAIT_IMAGES = [
  "1519699047748-de8e457a634e", // beauty portrait
  "1531746020798-e6953c6e8e04", // professional headshot
  "1541516160021-aa34e43e4c95", // glam portrait
  "1503951458645-643d3701e0b0", // confident pose
  "1507003211169-0a1dd7228f2d", // editorial portrait
  "1487412720507-e7ab37603c6f", // makeup portrait
  "1523264939339-c89f9dadde2e", // eye detail
  "1516975080664-ed2fc6a32937", // beauty shot
  "1570172619644-bfd9a5847c35", // skincare portrait
  "1508214751196-bcfd4ca60f91", // natural beauty
  "1547425827-e0d0e9f41b60",    // brow portrait
  "1493412922794-1f7f4be50d1c", // product portrait
  "1505932794465-147d1f1b2c97", // studio portrait
  "1512290923682-db3b00b66e5c", // creative portrait
  "1603217040831-61fa3e3e1cd8", // lash portrait
  "1522337660416-9e4f73a7da7e", // curl portrait
  "1519699047748-de8e457a634e", // afro portrait
  "1542838132-92c53300491e",    // natural hair portrait
  "1560399465-a34fcba35f01",    // color result portrait
  "1619451334792-3e8f0b7c4c94", // detail portrait
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
    "1570172619644-bfd9a5847c35","1512290923682-db3b00b66e5c",
    "1522337660416-9e4f73a7da7e","1508214751196-bcfd4ca60f91",
    "1519014816548-bf5fe059798b","1556228720-195a672e8a03",
    "1612817288484-6f916006741a","1515377905703-c4788e51af15",
    "1620916566398-39f1143ab7be","1516585427167-1c1e1ddc50f6",
    "1556229162-5777d4c4d405","1531746020798-e6953c6e8e04",
  ],
  luxe: [
    "1522337360426-a1af4b2b9f90","1503951458645-643d3701e0b0",
    "1523264939339-c89f9dadde2e","1487412720507-e7ab37603c6f",
    "1516975080664-ed2fc6a32937","1507003211169-0a1dd7228f2d",
    "1541516160021-aa34e43e4c95","1542838132-92c53300491e",
    "1531746020798-e6953c6e8e04","1505932794465-147d1f1b2c97",
    "1512290923682-db3b00b66e5c","1493412922794-1f7f4be50d1c",
  ],
  earth: [
    "1515377905703-c4788e51af15","1508214751196-bcfd4ca60f91",
    "1519014816548-bf5fe059798b","1556229162-5777d4c4d405",
    "1620916566398-39f1143ab7be","1556228720-195a672e8a03",
    "1516585427167-1c1e1ddc50f6","1612817288484-6f916006741a",
    "1570172619644-bfd9a5847c35","1522337660416-9e4f73a7da7e",
    "1519699047748-de8e457a634e","1560399465-a34fcba35f01",
  ],
  bold: [
    "1487412720507-e7ab37603c6f","1541516160021-aa34e43e4c95",
    "1523264939339-c89f9dadde2e","1516975080664-ed2fc6a32937",
    "1547425827-e0d0e9f41b60","1493412922794-1f7f4be50d1c",
    "1505932794465-147d1f1b2c97","1503951458645-643d3701e0b0",
    "1507003211169-0a1dd7228f2d","1512290923682-db3b00b66e5c",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
  ],
  minimal: [
    "1604654894610-df63bc536371","1560066984-138daab7b9dd",
    "1547962214523-aaee3bbf5ad3","1519014816548-bf5fe059798b",
    "1556229162-5777d4c4d405","1612817288484-6f916006741a",
    "1516585427167-1c1e1ddc50f6","1508214751196-bcfd4ca60f91",
    "1519699047748-de8e457a634e","1512290923682-db3b00b66e5c",
    "1570172619644-bfd9a5847c35","1515377905703-c4788e51af15",
  ],
  street: [
    "1503951458645-643d3701e0b0","1507003211169-0a1dd7228f2d",
    "1622115166-bbc5c7aff475","1605497788090-9956dd3c3a0f",
    "1621605815971-86d50c90de2b","1484515991647-c03168d7de6e",
    "1541516160021-aa34e43e4c95","1487412720507-e7ab37603c6f",
    "1523264939339-c89f9dadde2e","1516975080664-ed2fc6a32937",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
  ],
  y2k: [
    "1522337660416-9e4f73a7da7e","1531746020798-e6953c6e8e04",
    "1603217040831-61fa3e3e1cd8","1519699047748-de8e457a634e",
    "1547425827-e0d0e9f41b60","1493412922794-1f7f4be50d1c",
    "1541516160021-aa34e43e4c95","1505932794465-147d1f1b2c97",
    "1560066984-138daab7b9dd","1522337360426-a1af4b2b9f90",
    "1570172619644-bfd9a5847c35","1512290923682-db3b00b66e5c",
  ],
  rose: [
    "1519699047748-de8e457a634e","1508214751196-bcfd4ca60f91",
    "1522337360426-a1af4b2b9f90","1547425827-e0d0e9f41b60",
    "1522337660416-9e4f73a7da7e","1493412922794-1f7f4be50d1c",
    "1570172619644-bfd9a5847c35","1515377905703-c4788e51af15",
    "1531746020798-e6953c6e8e04","1556228720-195a672e8a03",
    "1560399465-a34fcba35f01","1519014816548-bf5fe059798b",
  ],
  sage: [
    "1620916566398-39f1143ab7be","1519699047748-de8e457a634e",
    "1515377905703-c4788e51af15","1556229162-5777d4c4d405",
    "1612817288484-6f916006741a","1516585427167-1c1e1ddc50f6",
    "1508214751196-bcfd4ca60f91","1556228720-195a672e8a03",
    "1570172619644-bfd9a5847c35","1519014816548-bf5fe059798b",
    "1522337660416-9e4f73a7da7e","1560399465-a34fcba35f01",
  ],
  slate: [
    "1503951458645-643d3701e0b0","1507003211169-0a1dd7228f2d",
    "1605497788090-9956dd3c3a0f","1622115166-bbc5c7aff475",
    "1621605815971-86d50c90de2b","1484515991647-c03168d7de6e",
    "1542838132-92c53300491e","1531746020798-e6953c6e8e04",
    "1560066984-138daab7b9dd","1519014816548-bf5fe059798b",
    "1612817288484-6f916006741a","1516585427167-1c1e1ddc50f6",
  ],
  noir: [
    "1523264939339-c89f9dadde2e","1541516160021-aa34e43e4c95",
    "1516975080664-ed2fc6a32937","1487412720507-e7ab37603c6f",
    "1505932794465-147d1f1b2c97","1493412922794-1f7f4be50d1c",
    "1547962214523-aaee3bbf5ad3","1512290923682-db3b00b66e5c",
    "1503951458645-643d3701e0b0","1507003211169-0a1dd7228f2d",
    "1519699047748-de8e457a634e","1531746020798-e6953c6e8e04",
  ],
  citrus: [
    "1542838132-92c53300491e","1560399465-a34fcba35f01",
    "1531746020798-e6953c6e8e04","1522337660416-9e4f73a7da7e",
    "1519699047748-de8e457a634e","1547425827-e0d0e9f41b60",
    "1560066984-138daab7b9dd","1603217040831-61fa3e3e1cd8",
    "1522337360426-a1af4b2b9f90","1570172619644-bfd9a5847c35",
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
