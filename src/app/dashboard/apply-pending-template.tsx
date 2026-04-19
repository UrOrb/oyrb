"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reads an `oyrb_pending_template` entry saved by the signup flow when the
 * user came from "Use this template", applies it to their business, and
 * clears the entry. Runs once per dashboard mount after the business exists.
 */
export function ApplyPendingTemplate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem("oyrb_pending_template");
      } catch {
        return;
      }
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as { layout?: string | null; theme?: string | null };
        if (!parsed.layout && !parsed.theme) {
          localStorage.removeItem("oyrb_pending_template");
          return;
        }

        const res = await fetch("/api/dashboard/apply-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });

        if (res.ok) {
          localStorage.removeItem("oyrb_pending_template");
          if (!cancelled) router.refresh();
        }
      } catch {
        // Leave the entry in place — next dashboard load will retry.
      }
    }
    run();
    return () => { cancelled = true; };
  }, [router]);

  return null;
}
