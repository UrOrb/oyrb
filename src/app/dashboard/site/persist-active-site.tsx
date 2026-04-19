"use client";

import { useEffect } from "react";

/**
 * When the editor loads with a known siteId, persist it as the active site
 * so that server actions (which only see cookies, not URL params) operate
 * on the right business. Idempotent — fires once per mount per id.
 */
export function PersistActiveSite({ siteId }: { siteId: string }) {
  useEffect(() => {
    if (!siteId) return;
    fetch("/api/dashboard/active-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    }).catch(() => {});
  }, [siteId]);
  return null;
}
