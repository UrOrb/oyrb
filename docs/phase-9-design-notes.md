# OYRB Pro Dashboard — Design Polish Brainstorm

**Drafted:** Saturday, May 9, 2026
**Status:** Design exploration — NOT a build spec yet. Pick what to actually ship.

---

## Framing — what luxury brands actually teach a dashboard

Halania asked for inspiration from Nike, Louis Vuitton, Fendi, Apple, Williams Sonoma. These are e-commerce/marketing experiences — their job is to make you *want* something. A SaaS pro dashboard is the opposite — its job is to make you efficient at running your business.

The translation isn't "copy their visual style." It's "what discipline do they share that a dashboard can borrow?"

**The shared pattern across all of them: they show fewer things, bigger.**

What each does well:

- **Apple** — generous whitespace, precise typography hierarchy, motion that responds to user input (not decorative), one clear primary action per screen
- **Louis Vuitton / Fendi** — rich photography of real product, restrained color palette (mostly black/cream/one accent), confident typographic moments
- **Nike** — bold numerical displays, performance metrics presented as moments of pride, action-oriented language
- **Williams Sonoma** — soft warm palette, generous photography, lifestyle context (showing the product in use), clear category navigation

---

## The 15 ideas

### 1. Dashboard "Today" hero section

Replace whatever's at the top of the dashboard today with a single hero strip showing:

- Greeting with pro's name + business name in display typeface ("Good morning, Halania — Life as a Lania Renee")
- Today's bookings count as a large numeric display (think Nike workout summary)
- One primary action button ("View today's schedule")

Rest of dashboard scrolls below. Nike-app pattern: lead with the most important number, big, with confidence.

**Why it works:** The first thing pros see should be the most important thing for their day. Right now most dashboards show too many medium-priority things at once. The hero pattern picks one thing and commits.

---

### 2. Stat cards — soft motion on data update

When numbers change (new booking, new client, completed appointment), the number animates from old → new value over ~600ms. Subtle but premium. Adds zero functional value but signals "the platform is alive."

Apple Watch ring animations are the reference — a small motion that rewards attention without distracting.

**Implementation note:** This needs a small JS counter animation library OR a custom React hook with `requestAnimationFrame`. Probably 30-50 LOC.

---

### 3. Photography in the Clients tab

Right now the clients list is text rows. Add an avatar circle to each client (initials on a soft background color seeded from their name — e.g., "SJ" on a warm peach for Sarah Johnson).

This is the Williams Sonoma move — visual texture in what would otherwise be dense text. Beauty pros think of clients as people, not rows. Avatars reflect that.

**Future enhancement:** pros can upload actual client photos (with consent). Phase 8+ work.

**Implementation note:** Color generation function should produce visually-distinct but harmonious colors. Hash the client name → pick from a curated palette of 8-10 warm tones (peach, cream, sage, dusty pink, etc.). NEVER fully random — that produces ugly combinations.

---

### 4. Booking calendar — week view as the primary, not month

Most beauty pros think in weeks ("what's my week looking like?"), not months. Make week view the default. Calendar block shows:

- Each appointment as a tile with service name, client name, time
- Color-coded by service type (using OYRB's brand palette, not random colors)
- Hover/tap reveals client preview card

Apple Calendar's weekly view is the reference — clean grid, real content in cells, restraint on borders.

**Why it works:** Beauty pros book appointments in week-blocks. The mental model is "what does my Tuesday look like?" not "what does May look like?" Match the mental model.

---

### 5. Color palette discipline

Right now I bet OYRB uses several colors across different states. Audit and reduce to:

- 1 primary action color (warm, OYRB-branded — looks like #B8896B from existing patterns)
- 1 success green
- 1 alert amber
- 1 warning red
- Neutrals only for everything else (the existing #0A0A0A / #525252 / #737373 / #A3A3A3 grayscale ramp)

Louis Vuitton famously uses ~3 colors. Restraint feels expensive.

**Action item:** Audit existing OYRB code for ad-hoc color uses. Find all uses of color values that don't fit the above palette. Replace with the canonical 5 (or with neutrals).

---

### 6. Typography moments

OYRB already uses a `font-display` for headings. Use it more intentionally — for **the one thing on each screen that matters most:**

- Dashboard: the greeting + today's number
- Clients page: the page title + the client name when viewing detail
- Bookings: the date you're viewing

Body text stays in default sans-serif. Display font appears 2-3 times per page max. Fendi's site does this — most text is restrained, but headlines have presence.

**Anti-pattern to avoid:** Display font on every section header. That dilutes the impact and makes the hierarchy feel monotone.

---

### 7. Empty states with personality

Instead of "No clients yet," empty states should say something brand-aligned:

- Clients tab empty: "Your client family starts here. Upload a list or wait for your first booking."
- Bookings empty: "Quiet day on the calendar. A good day to plan a campaign."
- Marketing tab empty: "No campaigns yet. Most pros find their first email gets the best engagement."
- Reviews tab empty: "Reviews will appear here as clients leave them. Tip: Ask after their best appointments."

This is the Williams Sonoma move — turning blank states into editorial moments. Costs nothing, feels considered.

**Implementation note:** Empty states should always include (a) a sentence that frames what *will* be here, (b) a soft prompt for the action that gets the pro past the empty state, (c) optional contextual tip.

---

### 8. Sidebar navigation refinement

If the sidebar currently shows all options as equal weight, restructure with subtle hierarchy:

- **Today** (most-used: Dashboard, Bookings, Clients) at top
- **Grow** (Marketing, Reviews, Referrals, Imports) middle
- **Manage** (Settings, Billing, Strike status) bottom

Section dividers with small uppercase labels (`text-xs uppercase tracking-wider text-[#A3A3A3]`).

Apple/Notion sidebar pattern. Helps pros scan to what they need by category.

**Why it works:** Beauty pros use Dashboard/Bookings/Clients 80% of the time. Marketing/Reviews 15%. Settings 5%. The sidebar should reflect that priority through visual hierarchy.

---

### 9. Drop-down menus — slow, controlled motion

Dropdowns currently probably appear instantly. Adding ~150ms ease-out transition (`transition: all 0.15s ease-out` + slight `translateY(-4px)` start state) makes them feel deliberate instead of jumpy.

This is one of those "you don't notice when it's there, but it feels worse when it's missing" details. Apple does this on every menu.

**Implementation note:** Apply this site-wide via Tailwind config or a single transition utility class. Not per-component overrides.

---

### 10. Loading states — skeleton screens, not spinners

When clients list is loading, show grayed-out placeholder rows in the same shape the real data will take. Same for bookings, marketing audience counts, etc.

Prevents layout shift, feels faster than spinners (even when total time is identical), looks more premium.

LinkedIn / Facebook / Apple News pattern.

**Implementation note:** Tailwind's `animate-pulse` utility on placeholder divs is sufficient. No third-party skeleton library needed. Build skeleton component once, reuse everywhere.

---

### 11. Charts and graphs — restraint

For business stats (visits per month, revenue trends, retention), use minimal chart styling:

- No gridlines
- No 3D
- One color (OYRB primary or a soft variant)
- Line charts > bar charts for trends; bar charts only for comparisons
- Numbers visible on hover

Stripe's dashboard is the reference — data-dense but never busy.

**Library suggestion:** Recharts (lightweight, customizable, already common in Next.js apps). Avoid Chart.js's default styles — too heavy.

---

### 12. Subtle border treatments

Replace harsh borders with softer alternatives:

- Cards: `rounded-lg` (already in OYRB) + `border border-[#E7E5E4]` (subtle warm-gray) + optional `shadow-sm` for elevation
- Inputs: `rounded-md` + softer focus ring (1-2px in primary color, no harsh outline)
- Buttons: clear hover state but minimal shadow

Apple iOS native UI — soft, deliberate, never sharp.

**Audit hint:** Search the codebase for `border-` uses. Anywhere using darker borders (`border-gray-300`, `border-black`, etc.) is a candidate for softening.

---

### 13. Interactive personality on the dashboard greeting

One small "delight" — the greeting on the dashboard rotates between 3-5 variations:

- "Good morning, Halania"
- "Welcome back, Halania"
- "Hey Halania, ready for today?"
- "Halania — let's make it a good one"

Time-of-day aware (morning/afternoon/evening). Tiny detail. Pro feels seen.

**Implementation note:** Don't overdo this. 3-5 variations is the right count. 20+ variations starts to feel random and untrustworthy.

---

### 14. Action buttons — confidence

Primary actions should have presence:

- `bg-[#0A0A0A] text-white` — confident, not washed out
- `font-medium` — slightly heavier than body text
- Adequate padding (`px-5 py-2.5` minimum)
- One primary action per screen, max two

Nike's CTA buttons are reference — they don't apologize for being buttons.

**Anti-pattern to avoid:** Multiple primary buttons per screen. Visual chaos. If you need multiple actions, demote secondary ones to outline buttons or text links.

---

### 15. Imagery on auth pages

When pros land on signup/login (separate from this brainstorm scope, but worth noting), one full-bleed lifestyle image of beauty pro work — hands at a styling station, soft lighting, real texture. Not stock photography that screams stock photography.

Williams Sonoma / Fendi pattern — image earns the screen, doesn't decorate it.

**Sourcing note:** Avoid Shutterstock-style stock. Better options: Pexels/Unsplash for free editorial shots, OR commission/DM beauty pros directly for permission to use their portfolio shots (with credit). The latter is more authentic AND builds community.

---

## Priority recommendation

If Halania ships nothing else, ship these four:

1. **#1 (Today hero section)** — changes the first thing pros see. Tonal shift for the entire platform.
2. **#5 (Color palette discipline)** — restraint feels expensive. Audit + reduce existing colors.
3. **#6 (Typography moments)** — `font-display` already exists. Use it more intentionally.
4. **#7 (Empty states with personality)** — costs nothing, feels considered, makes pre-launch states feel less empty.

These four cost the least to ship, give the most premium-feel ROI, and don't require new dependencies.

**My one-pick if Halania can only do one:** #1 (the Today hero section). Changes the dashboard's first impression, which is the moment that decides whether pros feel "this platform is for me."

---

## Anti-patterns — what to NOT do even if it's tempting

These would feel exciting at midnight but regret-able in daylight:

- **Carousels of any kind.** Carousels hide content behind a click. Beauty pros need information density, not slideshow.
- **Glassmorphism / frosted glass effects.** Trendy in 2021. Already dating poorly. Apple doesn't even use it heavily anymore.
- **Animations on scroll (parallax, fade-ins).** Slows down task completion. Dashboards are for getting work done, not for being entertained.
- **Dark mode as a default.** Beauty pros work in well-lit spaces with mirrors. Dark mode UI is harder to read in those environments.
- **Custom cursors.** Performance penalty + accessibility issue. Not worth the novelty.
- **Auto-playing video on dashboard.** Steals attention from work.
- **Confetti/celebratory animations on every action.** Cute once. Annoying after the third time.

If you find yourself adding any of these, you're designing for first-impression "wow" rather than long-term usability. Resist.

---

## What this isn't

- This isn't a redesign. It's polish on top of OYRB's existing structure.
- This isn't a sprint. Ship 1-2 of these per week, evaluate impact, iterate.
- This isn't lawyer-required. None of these change legal/consent UX (PR #53 already handles that).

---

## Next step

Pick which of the 15 to actually build. Send Claude Code a prompt for that specific one. Most are scoped at 30-200 LOC each — small PRs, easy to review.

If unsure where to start, ship #1 (Today hero) first.

🤎
