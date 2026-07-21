"use client";

import { useEffect, useRef, useState } from "react";

type ThemeId = "lavender" | "ocean" | "light";

const THEMES: { id: ThemeId; label: string; bg: string; accent: string }[] = [
  { id: "lavender", label: "Midnight Lavender", bg: "#0b0b12", accent: "#8b7df6" },
  { id: "ocean", label: "Deep Ocean", bg: "#0a1120", accent: "#22d3ee" },
  { id: "light", label: "Clean Light", bg: "#ffffff", accent: "#6f6ae6" },
];

const KEY = "attune-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("lavender");
  const [open, setOpen] = useState(false);
  const hydrated = useRef(false);

  // Sync the toggle's highlighted swatch with whatever the pre-paint script
  // already applied. Indirected through a helper so it stays a one-time read.
  function hydrateFromStorage() {
    const saved = (localStorage.getItem(KEY) as ThemeId) || "lavender";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    hydrateFromStorage();
  }, []);

  function pick(id: ThemeId) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex items-center gap-1.5 rounded-full border p-1.5"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow)", borderColor: "var(--line)" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      role="group"
      aria-label="Color theme"
    >
      <span
        className="hidden pl-1.5 text-[11px] font-medium sm:inline"
        style={{ color: "var(--fg-soft)", opacity: open ? 1 : 0, transition: "opacity .2s", width: open ? "auto" : 0 }}
      >
        Theme
      </span>
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            title={t.label}
            aria-label={t.label}
            aria-pressed={active}
            className="grid size-6 place-items-center rounded-full transition-transform hover:scale-110"
            style={{
              background: t.bg,
              border: `1px solid ${active ? t.accent : "color-mix(in oklab, var(--fg) 20%, transparent)"}`,
              boxShadow: active ? `0 0 0 2px ${t.accent}` : "none",
            }}
          >
            <span className="size-2.5 rounded-full" style={{ background: t.accent }} />
          </button>
        );
      })}
    </div>
  );
}
