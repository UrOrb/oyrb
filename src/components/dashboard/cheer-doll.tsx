"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CHEER_EVENT, type CheerDetail } from "@/lib/cheer";

/**
 * Gigi — the cheer doll. Mounted once in the dashboard layout, she
 * springs up from the bottom-right corner with a speech bubble and a
 * burst of sparkles whenever any client component calls `cheer()`
 * (lib/cheer.ts). Auto-dismisses after a few seconds; a new cheer
 * while she's on screen replays the entrance with the new message.
 *
 * pointer-events-none on the whole overlay — she can never block a
 * button underneath her. Reduced-motion users get a gentle fade with
 * no bouncing or confetti.
 */

const PHRASES = [
  "YASSS, you did that! 💅",
  "Another one done — you're THAT girl ✨",
  "Okayyy boss! Keep it going 💖",
  "Slay. Task complete. 🔥",
  "Six figures loading… 📈",
  "Booked, busy, and unbothered 💸",
  "That's how it's DONE, bestie 🎀",
];

type Sparkle = {
  id: number;
  x: number; // % offset from doll center
  y: number;
  scale: number;
  rotate: number;
  delay: number;
  char: string;
};

const SPARKLE_CHARS = ["✦", "✧", "❤", "★", "✿"];

function makeSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 180,
    y: -40 - Math.random() * 140,
    scale: 0.6 + Math.random() * 0.9,
    rotate: (Math.random() - 0.5) * 240,
    delay: Math.random() * 0.35,
    char: SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)],
  }));
}

const VISIBLE_MS = 4600;

export function CheerDoll() {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<string>(PHRASES[0]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  // Re-keying the doll on every cheer replays the entrance animation
  // even when she's already on screen.
  const [burst, setBurst] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CheerDetail>).detail;
      setMessage(
        detail?.message ?? PHRASES[Math.floor(Math.random() * PHRASES.length)],
      );
      setSparkles(makeSparkles(14));
      setBurst((n) => n + 1);
      setShow(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShow(false), VISIBLE_MS);
    };
    window.addEventListener(CHEER_EVENT, handler);
    return () => {
      window.removeEventListener(CHEER_EVENT, handler);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-0 right-4 z-[70] sm:right-8"
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key={burst}
            initial={
              reduceMotion ? { opacity: 0 } : { y: 220, opacity: 0, rotate: 6 }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { y: 0, opacity: 1, rotate: 0 }
            }
            exit={reduceMotion ? { opacity: 0 } : { y: 240, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 260, damping: 18 }
            }
            className="relative flex flex-col items-center pb-1"
          >
            {/* Sparkle burst */}
            {!reduceMotion &&
              sparkles.map((s) => (
                <motion.span
                  key={s.id}
                  initial={{ x: 0, y: 20, scale: 0, opacity: 0 }}
                  animate={{
                    x: s.x,
                    y: s.y,
                    scale: s.scale,
                    rotate: s.rotate,
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 1.6, delay: s.delay, ease: "easeOut" }}
                  className="absolute bottom-16 left-1/2 select-none text-lg"
                  style={{ color: s.id % 3 === 0 ? "#E8707A" : "#B8896B" }}
                >
                  {s.char}
                </motion.span>
              ))}

            {/* Speech bubble */}
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 300, damping: 16 }}
              className="relative mb-2 max-w-[220px] rounded-2xl border border-[#E7E5E4] bg-white px-4 py-2.5 text-center shadow-lg"
            >
              <p className="text-[13px] font-semibold leading-snug text-[#0A0A0A]">
                {message}
              </p>
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[#E7E5E4] bg-white" />
            </motion.div>

            {/* The doll — gentle cheer bounce while visible */}
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : { y: [0, -10, 0], rotate: [0, -2, 0, 2, 0] }
              }
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <GigiSvg />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline SVG doll — big glossy hair, dramatic lashes, glossy lips,
 * crop top in the brand bronze (#B8896B), platform boots. Drawn by
 * hand so there's no image asset to load; ~2 KB gzipped.
 */
function GigiSvg() {
  return (
    <svg
      width="132"
      height="168"
      viewBox="0 0 132 168"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-xl"
    >
      {/* ── Back hair — big, voluminous ── */}
      <path
        d="M66 8C36 8 20 30 20 56c0 22 6 34 4 52-1.5 13 6 22 14 24l4-30h48l4 30c8-2 15.5-11 14-24-2-18 4-30 4-52C112 30 96 8 66 8Z"
        fill="#2E1A12"
      />
      <path
        d="M30 52c-2 16 2 26 1 40M102 52c2 16-2 26 1 40"
        stroke="#4A2C1C"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* ── Arms raised in a cheer ── */}
      <path d="M38 78C30 70 24 62 22 52" stroke="#C68863" strokeWidth="7" strokeLinecap="round" />
      <path d="M94 78c8-8 14-16 16-26" stroke="#C68863" strokeWidth="7" strokeLinecap="round" />
      {/* pompom hands */}
      <circle cx="21" cy="49" r="7" fill="#E8707A" />
      <circle cx="111" cy="49" r="7" fill="#E8707A" />
      <circle cx="18" cy="46" r="2.2" fill="#F7B8BE" />
      <circle cx="24" cy="51" r="2.2" fill="#F7B8BE" />
      <circle cx="108" cy="46" r="2.2" fill="#F7B8BE" />
      <circle cx="114" cy="51" r="2.2" fill="#F7B8BE" />

      {/* ── Face — oversized, Bratz proportions ── */}
      <ellipse cx="66" cy="52" rx="30" ry="32" fill="#C68863" />
      {/* ears */}
      <circle cx="36" cy="54" r="4" fill="#C68863" />
      <circle cx="96" cy="54" r="4" fill="#C68863" />
      {/* gold hoops */}
      <circle cx="36" cy="60" r="3.5" stroke="#D9A441" strokeWidth="1.8" />
      <circle cx="96" cy="60" r="3.5" stroke="#D9A441" strokeWidth="1.8" />

      {/* ── Front hair / part ── */}
      <path
        d="M66 12C44 12 32 28 33 44c8-10 14-12 20-20 2 8 8 12 13 13 5-1 11-5 13-13 6 8 12 10 20 20 1-16-11-32-33-32Z"
        fill="#3D2417"
      />
      <path d="M46 26c-4 4-7 9-8 14" stroke="#5C3A24" strokeWidth="2" strokeLinecap="round" />

      {/* ── Brows ── */}
      <path d="M46 42c4-3 9-3 12-1M74 41c3-2 8-2 12 1" stroke="#2E1A12" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── Eyes — huge, almond, lashes ── */}
      <ellipse cx="53" cy="53" rx="8.5" ry="10" fill="white" />
      <ellipse cx="79" cy="53" rx="8.5" ry="10" fill="white" />
      <circle cx="54" cy="54" r="5.5" fill="#6B4226" />
      <circle cx="80" cy="54" r="5.5" fill="#6B4226" />
      <circle cx="54" cy="54" r="2.6" fill="#1A0F08" />
      <circle cx="80" cy="54" r="2.6" fill="#1A0F08" />
      <circle cx="56" cy="51.5" r="1.7" fill="white" />
      <circle cx="82" cy="51.5" r="1.7" fill="white" />
      {/* eyeliner + lashes */}
      <path d="M45 49c2-4 6-6 8-6M62 49c-1-3-4-5-6-5" stroke="#1A0F08" strokeWidth="2" strokeLinecap="round" />
      <path d="M71 49c2-4 6-6 8-6M88 49c-1-3-4-5-6-5" stroke="#1A0F08" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 47l-4-3M47 44l-3-4M87 44l3-4M89 47l4-3" stroke="#1A0F08" strokeWidth="1.8" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="45" cy="63" rx="5" ry="3" fill="#E8707A" opacity="0.35" />
      <ellipse cx="87" cy="63" rx="5" ry="3" fill="#E8707A" opacity="0.35" />

      {/* ── Nose + glossy lips ── */}
      <path d="M66 60v4" stroke="#A96B4A" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M57 71c3-3 6-2 9-1 3-1 6-2 9 1-1 5-5 8-9 8s-8-3-9-8Z"
        fill="#D14D68"
      />
      <path d="M60 71c2-1 4-1 6 0 2-1 4-1 6 0" stroke="#8E2F44" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="62" cy="74" rx="2" ry="1" fill="white" opacity="0.55" />

      {/* ── Neck + body ── */}
      <rect x="61" y="82" width="10" height="8" fill="#B06F4E" />
      {/* crop top in brand bronze */}
      <path d="M50 90h32l-3 18H53l-3-18Z" fill="#B8896B" />
      <path d="M50 90c5-4 27-4 32 0" stroke="#9C6F52" strokeWidth="2" />
      {/* midriff */}
      <rect x="56" y="108" width="20" height="7" fill="#C68863" />
      {/* skirt */}
      <path d="M54 115h24l5 16H49l5-16Z" fill="#0A0A0A" />
      {/* belt sparkle */}
      <circle cx="66" cy="117" r="2.2" fill="#D9A441" />

      {/* ── Legs + platform boots (Bratz signature) ── */}
      <path d="M59 131v16M73 131v16" stroke="#C68863" strokeWidth="7" strokeLinecap="round" />
      <path d="M52 147h14v12c0 2-1.5 3-3.5 3H55c-2 0-3-1-3-3v-12Z" fill="#E8707A" />
      <path d="M66 147h14v12c0 2-1 3-3 3h-7.5c-2 0-3.5-1-3.5-3v-12Z" fill="#E8707A" />
      <rect x="52" y="159" width="14" height="5" rx="2" fill="#B85560" />
      <rect x="66" y="159" width="14" height="5" rx="2" fill="#B85560" />
    </svg>
  );
}
