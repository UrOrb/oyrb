import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape a user-supplied string for use as a Postgres LIKE/ILIKE pattern.
 * `_` and `%` are wildcards — an unescaped `john_doe@gmail.com` matches
 * `johnadoe@gmail.com` too, which turns exact-match ilike lookups (used
 * for case-insensitivity, e.g. trial gates) into false positives.
 */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}
