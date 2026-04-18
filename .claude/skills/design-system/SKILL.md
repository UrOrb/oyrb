# Design System — GlamStack

**Save this file to `.claude/skills/design-system/SKILL.md` in your project root so Claude Code can read it as a skill.**

---

## Core aesthetic
Minimalist, modern, editorial. Tech-brand precision meets high-end beauty sensibility. Our customers are beauty professionals with taste — the product needs to look like something Glossier or Rhode would ship, not like typical SaaS software.

Visual references to study and pull from:
- **Linear** — restraint, clarity, monochrome palette
- **Stripe** — depth and polish without noise
- **Vercel** — generous whitespace, monochrome + one accent
- **Arc Browser** — warmth, subtle motion, personality
- **Glossier** — editorial beauty, soft neutrals
- **Rhode** — minimal luxe, cream tones
- **Aesop** — serif typography, understatement

## Typography
- **UI / body:** Inter, Geist, or SF Pro. Weights 400, 500, 600 only. Never 700+.
- **Display / headers:** a refined serif for emotional moments (hero headlines, section titles on marketing pages). Good options: Fraunces, Instrument Serif, New Spirit, Editorial New.
- Never mix more than 2 font families in the whole app.
- Tracking: `-0.02em` on display/hero headers; default on body.
- Line height: 1.5 body, 1.1–1.2 display headers.
- Font sizes should feel editorial on marketing pages (hero can be 72–96px on desktop) and restrained in the app (14–16px body, 20–24px section headers max).

## Color
- **Background:** near-white, warm — `#FAFAF9` or `#FFFFFF`. Never pure cold gray.
- **Ink (text):** near-black — `#0A0A0A` or `#171717`. Never pure black, never lower contrast than #525252 for body text.
- **Surfaces:** warm grays — `#F5F5F4`, `#E7E5E4`, `#D6D3D1` (Tailwind `stone` scale is the default choice).
- **Accent:** ONE accent color for the entire product. Suggested: warm bronze `#B8896B`, soft clay `#C7937C`, or muted blush `#D4A5A5`. Pick one and commit.
- **Semantic:** success `#15803D`, warning `#B45309`, error `#B91C1C`. Muted, never neon.

Do NOT use Tailwind's default blues/indigos/purples as primary anywhere. They scream "generic SaaS."

## Spacing
- Consistent 4px base rhythm (Tailwind spacing scale is fine).
- Marketing sections: 96–160px vertical padding on desktop, 64–96px mobile.
- App sections: 24–48px padding.
- Container max-width: 1200px for marketing, 1440px or fluid for app dashboard.
- Generous negative space around headers — let them breathe.

## Components (shadcn/ui defaults to override)
- **Buttons:**
  - Primary: solid ink background (`#0A0A0A`), white text, `rounded-md` (6px), no shadow, subtle hover state (darken or slight scale)
  - Secondary: 1px border, transparent bg
  - Ghost: text-only with hover bg
  - Avoid `rounded-full` except for pill-shaped tags
- **Inputs:** 1px border, `rounded-md`, focus ring is a subtle 1–2px outline in the accent color, not the default blue
- **Cards:** use EITHER a 1px border OR a very soft shadow (`shadow-sm`) — never both. Prefer border.
- **Modals/sheets:** backdrop at 40–60% opacity, white card, subtle entrance animation
- **No gradients** unless intentional and refined (e.g., a subtle warm gradient on a hero background).

## Motion
- Duration: 150–250ms
- Easing: `ease-out` for enters, `ease-in-out` for state changes
- Use motion for state feedback, not decoration
- Framer Motion OK but use sparingly — 90% of transitions can be Tailwind `transition-all`

## Imagery & icons
- **Icons:** Lucide (comes with shadcn). 16–20px in UI, 1.5–2px stroke.
- **Photography:** editorial beauty photography preferred over stock illustrations. If using placeholders for Phase 1, use solid colored blocks or blurred gradients, not cartoon SaaS illustrations.
- **Avatars:** 1px border `rounded-full`, fallback is initials on a warm gray bg.

## Marketing page layout rules
- Hero: asymmetric, left-aligned text with supporting visual on the right is preferred over centered-everything
- Pricing: 3 cards side-by-side on desktop, with one (middle tier) visually emphasized via a subtle border in accent color and a "Most popular" label
- Features: mix of text + visual, never a 3x3 grid of icons with headings — too generic
- CTAs: two per section max, usually one primary + one ghost

## Dashboard layout rules
- Left nav: 240px wide, ink text on warm white bg, minimal iconography
- Top bar: thin, subtle border-bottom, breadcrumbs + user menu only
- Empty states: a short line of serif text + one CTA, no illustrations

## Anti-patterns — NEVER do these
- Emojis in UI (acceptable in toast copy only if user-provided)
- Drop shadows on everything
- Rainbow palettes or neon gradients
- Stock "SaaS hero illustrations" of people with laptops
- Centered-everything marketing layouts
- Tailwind default blue (`blue-500`) as accent
- More than 2 font families
- Rounded-full buttons (use `rounded-md` or `rounded-lg`)
- "Get started for free!" exclamation-mark energy — keep copy calm and confident
- 4+ column feature grids with icons

## Copy tone
- Calm, confident, concise
- Second person ("your studio," not "our users")
- No hype words ("revolutionary," "AI-powered," "game-changing")
- Beauty-industry-fluent — this is for pros, speak like one
- Headers can be aspirational and editorial ("A booking site that looks like your brand"), body copy is practical

## Before Claude Code ships any UI
For every page or component, ask:
1. Is the typography editorial or default-SaaS? (must be editorial)
2. Is there enough whitespace? (usually needs more)
3. Am I using more than one accent color? (should be zero or one)
4. Would this look at home next to the Glossier or Rhode websites? (if no, redo)
