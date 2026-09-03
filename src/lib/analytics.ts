"use client";

import { track } from "@vercel/analytics";

export type AnalyticsEventName =
  | "booking_confirmed_viewed";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: AnalyticsEventName, properties?: AnalyticsProperties): void {
  try {
    track(name, properties);
  } catch {
    // Analytics must never break booking/payment UX.
  }
}
