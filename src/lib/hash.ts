/**
 * djb2 — deterministic hash for short strings.
 *
 * Used by:
 *   - src/lib/greetings.ts            picks a daily greeting variation
 *   - src/components/ui/client-avatar.tsx  picks an avatar color
 *
 * Stable across deploys, OS, and JS engines (pure JS, no
 * Math.random / Date / platform-specific behavior). Same input
 * always produces the same output — clients keep their avatar
 * color forever, greetings stay consistent within a day.
 *
 * Extracted from greetings.ts at the N=2 callers threshold. Don't
 * inline back into either consumer; keeping the algorithm in one
 * place means a future tweak (better distribution, different seed
 * scheme, etc.) ripples to both without drift.
 */

export function djb2(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick an index into a fixed-length array deterministically from a
 * seed string. Wraps djb2 with a modulo so callers don't have to
 * remember the Math.abs + % dance.
 */
export function pickIndex(seed: string, modulo: number): number {
  return djb2(seed) % modulo;
}
