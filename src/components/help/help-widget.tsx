"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HELP_CATEGORIES, searchGuides } from "@/lib/help-content";
import type { HelpGuide, HelpCategory } from "@/lib/help-content";

type View =
  | { type: "home" }
  | { type: "category"; category: HelpCategory }
  | { type: "guide"; guide: HelpGuide & { categoryId: string; categoryLabel: string; categoryIcon: string }; from: View }
  | { type: "search"; query: string };

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ type: "home" });
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open && view.type === "home") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, view.type]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim().length > 1) {
      setView({ type: "search", query: q });
    } else if (!q.trim()) {
      setView({ type: "home" });
    }
  }, []);

  const searchResults = query.trim().length > 1 ? searchGuides(query) : [];

  function openGuide(guide: HelpGuide & { categoryId: string; categoryLabel: string; categoryIcon: string }) {
    setView({ type: "guide", guide, from: view });
  }

  function goBack() {
    if (view.type === "guide") {
      setView(view.from);
    } else {
      setView({ type: "home" });
      setQuery("");
    }
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) { setView({ type: "home" }); setQuery(""); } }}
        aria-label="Help"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #FF6EC7 0%, #D946EF 55%, #A855F7 100%)",
          boxShadow: "0 4px 24px rgba(217,70,239,0.55)",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6.03 2 2 5.58 2 10c0 2.09.9 4 2.36 5.42L3 20l4.91-1.3C9.15 19.54 10.06 19.7 11 19.7c4.97 0 9-3.58 9-8s-4.03-8-9-8z" fill="white"/>
            <circle cx="8" cy="10" r="1.1" fill="#D946EF"/>
            <circle cx="11" cy="10" r="1.1" fill="#D946EF"/>
            <circle cx="14" cy="10" r="1.1" fill="#D946EF"/>
          </svg>
        )}
      </button>

      {/* ── Help panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          style={{ maxHeight: "calc(100vh - 120px)", boxShadow: "0 8px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)" }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center gap-3 px-5 py-4"
            style={{ background: "linear-gradient(135deg, #FF6EC7 0%, #D946EF 55%, #A855F7 100%)" }}
          >
            {view.type !== "home" && (
              <button
                onClick={goBack}
                className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {view.type === "home" && "OYRB Help Center"}
                {view.type === "category" && view.category.label}
                {view.type === "guide" && view.guide.title}
                {view.type === "search" && `Results for "${query}"`}
              </p>
              <p className="text-xs text-white/70">
                {view.type === "home" && "How can we help you today?"}
                {view.type === "category" && `${view.category.guides.length} guides`}
                {view.type === "guide" && `${view.guide.categoryIcon} ${view.guide.categoryLabel}`}
                {view.type === "search" && `${searchResults.length} guide${searchResults.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
          </div>

          {/* Search bar (visible on home + search views) */}
          {(view.type === "home" || view.type === "search") && (
            <div className="shrink-0 border-b border-[#F0EEF8] px-4 py-3">
              <div className="flex items-center gap-2 rounded-xl bg-[#F8F6FF] px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#A78BFA]">
                  <circle cx="6" cy="6" r="4" stroke="#A78BFA" strokeWidth="1.6"/>
                  <path d="M9 9l3 3" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search guides, errors, steps..."
                  className="flex-1 bg-transparent text-sm text-[#1A1200] outline-none placeholder:text-[#B0A8D0]"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setView({ type: "home" }); }} className="text-[#B0A8D0] hover:text-[#6D56E8]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">

            {/* ── HOME ── */}
            {view.type === "home" && (
              <div className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">Browse by topic</p>
                <div className="grid grid-cols-2 gap-2">
                  {HELP_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setView({ type: "category", category: cat })}
                      className="flex flex-col items-start gap-2 rounded-xl border border-[#F0EEF8] bg-white p-3.5 text-left transition-all hover:border-[#E9D5FF] hover:shadow-sm"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-[#1A1200]">{cat.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#9B8EC4]">{cat.guides.length} guides</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick tips strip */}
                <div className="mt-4 rounded-xl bg-[#FDF8FF] p-4">
                  <p className="mb-2 text-xs font-semibold text-[#A78BFA]">Quick tips</p>
                  {[
                    { q: "How do I connect Stripe?", id: "payments-connect" },
                    { q: "How do I set my hours?", id: "hours-add" },
                    { q: "Why can't my client book?", id: "error-booking-fail" },
                  ].map((tip) => {
                    const guide = HELP_CATEGORIES.flatMap(c => c.guides.map(g => ({ ...g, categoryId: c.id, categoryLabel: c.label, categoryIcon: c.icon }))).find(g => g.id === tip.id);
                    if (!guide) return null;
                    return (
                      <button
                        key={tip.id}
                        onClick={() => openGuide(guide)}
                        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-[#F3E8FF]"
                      >
                        <span className="text-[#D946EF]">→</span>
                        <span className="text-sm text-[#4B3D6B]">{tip.q}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CATEGORY ── */}
            {view.type === "category" && (
              <div className="p-4">
                {view.category.guides.map((guide, i) => {
                  const fullGuide = { ...guide, categoryId: view.category.id, categoryLabel: view.category.label, categoryIcon: view.category.icon };
                  return (
                    <button
                      key={guide.id}
                      onClick={() => openGuide(fullGuide)}
                      className={`flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-[#FDF8FF] ${i < view.category.guides.length - 1 ? "border-b border-[#F5F0FF]" : ""}`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                        style={{ backgroundColor: `${view.category.color}18`, color: view.category.color }}
                      >
                        {view.category.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1A1200]">{guide.title}</p>
                        <p className="mt-0.5 text-xs text-[#9B8EC4]">{guide.summary}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#C4B5FD]">
                        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── SEARCH RESULTS ── */}
            {view.type === "search" && (
              <div className="p-4">
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-2xl">🔍</p>
                    <p className="mt-2 text-sm font-medium text-[#4B3D6B]">No results found</p>
                    <p className="mt-1 text-xs text-[#9B8EC4]">Try different words, or browse by topic above.</p>
                  </div>
                ) : (
                  searchResults.map((guide, i) => (
                    <button
                      key={guide.id}
                      onClick={() => openGuide(guide)}
                      className={`flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-[#FDF8FF] ${i < searchResults.length - 1 ? "border-b border-[#F5F0FF]" : ""}`}
                    >
                      <span className="text-xl">{guide.categoryIcon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1A1200]">{guide.title}</p>
                        <p className="mt-0.5 text-xs text-[#9B8EC4]">{guide.summary}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#C4B5FD]">
                        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ── GUIDE ── */}
            {view.type === "guide" && (
              <div className="px-5 py-4">
                <p className="mb-4 text-sm leading-relaxed text-[#6B5EA8]">{view.guide.summary}</p>

                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                  Step-by-step
                </p>
                <div className="flex flex-col gap-3">
                  {view.guide.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      {/* Step number bubble */}
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #D946EF, #A855F7)" }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-[#1A1200]">{step.text}</p>
                        {step.note && (
                          <div className="mt-1.5 flex gap-1.5 rounded-lg bg-[#FDF8FF] px-3 py-2">
                            <span className="mt-0.5 shrink-0 text-[#D946EF]">💡</span>
                            <p className="text-xs leading-relaxed text-[#6B5EA8]">{step.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Related guides */}
                {view.guide.relatedIds && view.guide.relatedIds.length > 0 && (
                  <div className="mt-6 border-t border-[#F5F0FF] pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">Related guides</p>
                    {view.guide.relatedIds.map((relId) => {
                      const related = HELP_CATEGORIES.flatMap(c => c.guides.map(g => ({ ...g, categoryId: c.id, categoryLabel: c.label, categoryIcon: c.icon }))).find(g => g.id === relId);
                      if (!related) return null;
                      return (
                        <button
                          key={relId}
                          onClick={() => openGuide(related)}
                          className="flex w-full items-center gap-2 rounded-lg py-2 px-1 text-left transition-colors hover:bg-[#FDF8FF]"
                        >
                          <span className="text-[#D946EF]">→</span>
                          <span className="text-sm text-[#4B3D6B]">{related.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#F5F0FF] px-5 py-3">
            <p className="text-center text-xs text-[#B0A8D0]">
              Still stuck?{" "}
              <a href="mailto:support@oyrb.co" className="font-medium text-[#D946EF] hover:underline">
                Email support@oyrb.co
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
