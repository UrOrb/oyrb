/**
 * Cheer bus — fire the dashboard cheer doll (Gigi) after a completion
 * moment: service finished, site published, goal hit, etc.
 *
 * Same window-CustomEvent pattern as the Help panel (`oyrb:help:toggle`
 * in dashboard/help-panel.tsx): the doll is mounted once in the
 * dashboard layout and listens for this event, so any client component
 * can trigger a celebration without a Context provider.
 */
export const CHEER_EVENT = "oyrb:cheer";

export type CheerDetail = { message?: string };

/** Trigger the cheer doll. No-op on the server. Pass a message to
 * override the random hype phrase. */
export function cheer(message?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CheerDetail>(CHEER_EVENT, { detail: { message } }),
  );
}
