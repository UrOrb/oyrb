"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // Sync from localStorage after hydration (the inline script in layout
    // already applied the attribute pre-paint, so there's no flash).
    const raf = requestAnimationFrame(() => {
      const stored = localStorage.getItem("staxk-theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    if (next === "system") {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem("staxk-theme");
    } else {
      document.documentElement.dataset.theme = next;
      localStorage.setItem("staxk-theme", next);
    }
  }

  // Cycle: system → dark → light → system
  const next: Theme =
    theme === "system" ? "dark" : theme === "dark" ? "light" : "system";

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      className="rounded-md border border-line bg-surface p-2 text-muted hover:text-fg"
    >
      {theme === "light" ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </button>
  );
}
