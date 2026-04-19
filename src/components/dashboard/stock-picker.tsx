"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Search } from "lucide-react";
import { STOCK_LIBRARY, stockUrl, getAllCategories } from "@/lib/stock-images";

type Photo = {
  id: string;
  url: string;
  thumb: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
  downloadLocation?: string;
};

type Props = {
  mode: "single" | "multi";
  defaultCategory?: string;
  selected?: string[];
  onPick: (urls: string[]) => void;
  onClose: () => void;
};

export function StockPicker({
  mode,
  defaultCategory = "hair",
  selected = [],
  onPick,
  onClose,
}: Props) {
  const [activeCat, setActiveCat] = useState(defaultCategory);
  const [picks, setPicks] = useState<string[]>(selected);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [customQuery, setCustomQuery] = useState("");

  const categories = getAllCategories();
  const currentCategory = STOCK_LIBRARY[activeCat];

  // Fetch from Unsplash API whenever category (or custom query) changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const query = customQuery.trim() || currentCategory?.query || "beauty";
      const orientation = currentCategory?.orientation || "squarish";
      try {
        const res = await fetch(
          `/api/stock-search?q=${encodeURIComponent(query)}&orientation=${orientation}`
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.fallback) {
          // API not configured — use curated fallback IDs
          const fallback = (currentCategory?.fallbackIds ?? []).map((id) => ({
            id,
            url: stockUrl(id, 1200),
            thumb: stockUrl(id, 400),
          }));
          setPhotos(fallback);
          setUsingFallback(true);
        } else {
          setPhotos(data.photos);
          setUsingFallback(false);
        }
      } catch {
        const fallback = (currentCategory?.fallbackIds ?? []).map((id) => ({
          id,
          url: stockUrl(id, 1200),
          thumb: stockUrl(id, 400),
        }));
        setPhotos(fallback);
        setUsingFallback(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeCat, customQuery, currentCategory]);

  function trackDownload(photo: Photo) {
    if (!photo.downloadLocation) return;
    fetch("/api/stock-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
    }).catch(() => {});
  }

  function toggle(photo: Photo) {
    if (mode === "single") {
      trackDownload(photo);
      onPick([photo.url]);
      onClose();
      return;
    }
    setPicks((prev) => {
      if (prev.includes(photo.url)) {
        return prev.filter((u) => u !== photo.url);
      }
      trackDownload(photo);
      return [...prev, photo.url];
    });
  }

  function confirm() {
    onPick(picks);
    onClose();
  }

  const aspectCls =
    currentCategory?.orientation === "landscape" ? "aspect-video" :
    currentCategory?.orientation === "portrait" ? "aspect-[3/4]" :
    "aspect-square";

  const gridCls =
    currentCategory?.orientation === "landscape"
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white md:h-[85vh] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] px-5 py-4">
          <div className="flex-1">
            <h2 className="font-display text-xl font-medium">Stock photo library</h2>
            <p className="mt-0.5 text-xs text-[#737373]">
              {mode === "single"
                ? "Click any photo to select it."
                : `${picks.length} selected — click to toggle. Confirm when done.`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-[#F5F5F4]">
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[#E7E5E4] px-5 py-2">
          {categories.map((c) => {
            const isActive = c.key === activeCat;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setActiveCat(c.key);
                  setCustomQuery("");
                }}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                    : "border-[#E7E5E4] text-[#525252] hover:bg-[#F5F5F4]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Description + search override */}
        <div className="border-b border-[#E7E5E4] bg-[#FAFAF9] px-5 py-3">
          <p className="mb-2 text-xs text-[#737373]">
            {currentCategory?.description}
          </p>
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#A3A3A3]" />
            <input
              type="text"
              placeholder={`Search "${currentCategory?.query}" — or type your own...`}
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-[#A3A3A3] focus:outline-none"
            />
            {customQuery && (
              <button
                onClick={() => setCustomQuery("")}
                className="text-xs text-[#737373] hover:text-[#0A0A0A]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#737373]" />
            </div>
          ) : photos.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#737373]">
              No photos found. Try a different search.
            </div>
          ) : (
            <>
              {usingFallback && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Limited library mode.</strong> Add an Unsplash API key to unlock unlimited search across millions of photos. Ask your admin or see setup docs.
                </div>
              )}
              <div className={`grid gap-3 ${gridCls}`}>
                {photos.map((p) => {
                  const isPicked = picks.includes(p.url);
                  return (
                    <div key={p.id} className="relative">
                      <button
                        onClick={() => toggle(p)}
                        className={`group relative block w-full ${aspectCls} overflow-hidden rounded-lg border border-[#E7E5E4] transition-all hover:-translate-y-0.5 hover:shadow-md`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.thumb}
                          alt={p.alt ?? ""}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {isPicked && (
                          <>
                            <div className="absolute inset-0 bg-[#0A0A0A]/40" />
                            <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                              <Check size={14} className="text-[#0A0A0A]" />
                            </div>
                          </>
                        )}
                      </button>
                      {p.photographer && (
                        <p className="mt-1 truncate text-[10px] text-[#A3A3A3]">
                          by{" "}
                          <a
                            href={`${p.photographerUrl}?utm_source=oyrb&utm_medium=referral`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.photographer}
                          </a>{" "}
                          on{" "}
                          <a
                            href="https://unsplash.com?utm_source=oyrb&utm_medium=referral"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Unsplash
                          </a>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer (multi-select only) */}
        {mode === "multi" && (
          <div className="flex items-center justify-between border-t border-[#E7E5E4] bg-[#FAFAF9] px-5 py-3">
            <p className="text-sm text-[#737373]">{picks.length} selected</p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F5F5F4]"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-80"
              >
                Add {picks.length > 0 ? `(${picks.length})` : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
