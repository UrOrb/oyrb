"use client";

import { useState, useTransition } from "react";
import { Loader2, X, Search, Mail, AlertCircle, Image as ImageIcon } from "lucide-react";
import { searchProsBySlug, requestReferral, inviteByEmail } from "./actions";
import { VouchModal } from "./vouch-modal";
import type { Specialty } from "@/lib/types";

const VOUCH_NOTE_MAX = 80;

const inputCls =
  "block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none";

type SearchResult = {
  id: string;
  business_name: string;
  slug: string;
  primary_specialty: Specialty | null;
  profile_image_url: string | null;
};

type Tab = "search" | "invite";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddTrustedProModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("search");

  // Search-tab state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  // Shared note + invite state
  const [vouchNote, setVouchNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Vouch confirmation modal layered on top of this one.
  const [vouchOpen, setVouchOpen] = useState(false);
  const [topLevelError, setTopLevelError] = useState<string | null>(null);

  function reset() {
    setTab("search");
    setQuery("");
    setResults([]);
    setPicked(null);
    setSearchedFor(null);
    setVouchNote("");
    setInviteEmail("");
    setVouchOpen(false);
    setTopLevelError(null);
  }

  function handleClose() {
    if (!vouchOpen) {
      reset();
      onClose();
    }
  }

  function runSearch() {
    const q = query.trim();
    if (!q) return;
    setTopLevelError(null);
    setPicked(null);
    setSearchedFor(q);
    startSearch(async () => {
      const result = await searchProsBySlug({ query: q });
      if ("error" in result) {
        setTopLevelError(result.error);
        setResults([]);
        return;
      }
      setResults(result.results);
    });
  }

  // Confirm handler called by VouchModal after checkbox is checked.
  async function handleConfirm() {
    if (tab === "search" && picked) {
      return await requestReferral({
        targetBusinessId: picked.id,
        vouchNote: vouchNote || null,
        acknowledged: true,
      });
    }
    if (tab === "invite") {
      return await inviteByEmail({
        email: inviteEmail.trim(),
        vouchNote: vouchNote || null,
        acknowledged: true,
      });
    }
    return { error: "Pick a pro or enter an email first." };
  }

  function canContinue() {
    if (tab === "search") return !!picked;
    if (tab === "invite") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());
    }
    return false;
  }

  if (!open) return null;

  const peerNameForVouch =
    tab === "search" ? picked?.business_name ?? "" : inviteEmail.trim() || "this pro";

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pro-title"
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4"
        onClick={handleClose}
      >
        <div
          className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-[#E7E5E4] px-6 py-4">
            <h2 id="add-pro-title" className="font-display text-lg font-medium tracking-tight">
              Add a Trusted Pro
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="rounded-md p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#E7E5E4] px-6">
            {(
              [
                { id: "search", label: "Search OYRB pros", Icon: Search },
                { id: "invite", label: "Invite by email", Icon: Mail },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-1 py-3 text-sm transition-colors ${
                    active
                      ? "border-[#0A0A0A] font-medium text-[#0A0A0A]"
                      : "border-transparent text-[#737373] hover:text-[#0A0A0A]"
                  } ${id === "invite" ? "ml-6" : ""}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 px-6 py-5">
            {tab === "search" ? (
              <>
                <div>
                  <label htmlFor="ptt-search" className="text-xs font-medium text-[#525252]">
                    Their site URL or slug
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="ptt-search"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          runSearch();
                        }
                      }}
                      placeholder="oyrb.space/s/their-slug or just their-slug"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={runSearch}
                      disabled={searchPending || !query.trim()}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                    >
                      {searchPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      Find
                    </button>
                  </div>
                </div>

                {searchedFor && !searchPending && results.length === 0 && (
                  <p className="rounded-md bg-[#FAFAF9] px-3 py-2 text-xs text-[#737373]">
                    No matches for &ldquo;{searchedFor}&rdquo;. Double-check the URL,
                    or use the Invite by email tab.
                  </p>
                )}

                {results.length > 0 && (
                  <div className="space-y-2">
                    {results.map((r) => {
                      const selected = picked?.id === r.id;
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setPicked(r)}
                          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "border-[#0A0A0A] bg-[#FAFAF9]"
                              : "border-[#E7E5E4] bg-white hover:bg-[#FAFAF9]"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5F5F4]">
                            {r.profile_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.profile_image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-[#A3A3A3]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#0A0A0A]">{r.business_name}</p>
                            <p className="truncate text-xs text-[#737373]">
                              /s/{r.slug}{" "}
                              {r.primary_specialty && <span className="text-[#B8896B]">· {r.primary_specialty}</span>}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {picked && (
                  <div>
                    <div className="flex items-end justify-between">
                      <label htmlFor="ptt-note" className="text-xs font-medium text-[#525252]">
                        Vouch note <span className="font-normal text-[#A3A3A3]">(optional, public)</span>
                      </label>
                      <span className="text-[11px] text-[#A3A3A3]">
                        {vouchNote.length}/{VOUCH_NOTE_MAX}
                      </span>
                    </div>
                    <input
                      id="ptt-note"
                      type="text"
                      value={vouchNote}
                      onChange={(e) => setVouchNote(e.target.value.slice(0, VOUCH_NOTE_MAX))}
                      placeholder={`"She does my color when I'm out."`}
                      className={`${inputCls} mt-1`}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="ptt-email" className="text-xs font-medium text-[#525252]">
                    Their email
                  </label>
                  <input
                    id="ptt-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="them@example.com"
                    className={`${inputCls} mt-1`}
                  />
                </div>
                <div>
                  <div className="flex items-end justify-between">
                    <label htmlFor="ptt-invite-note" className="text-xs font-medium text-[#525252]">
                      Vouch note <span className="font-normal text-[#A3A3A3]">(optional, shown in the invite)</span>
                    </label>
                    <span className="text-[11px] text-[#A3A3A3]">
                      {vouchNote.length}/{VOUCH_NOTE_MAX}
                    </span>
                  </div>
                  <input
                    id="ptt-invite-note"
                    type="text"
                    value={vouchNote}
                    onChange={(e) => setVouchNote(e.target.value.slice(0, VOUCH_NOTE_MAX))}
                    placeholder="Why you trust them"
                    className={`${inputCls} mt-1`}
                  />
                </div>
              </>
            )}

            {topLevelError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{topLevelError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E7E5E4] px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setVouchOpen(true)}
              disabled={!canContinue()}
              className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      <VouchModal
        open={vouchOpen}
        onClose={() => {
          setVouchOpen(false);
          // If the inner action succeeded, the wrapper already closed itself
          // by clearing pickedSearchValue etc.; we also bubble the close up.
        }}
        peerName={peerNameForVouch}
        mode="request"
        secondaryLabel="Back"
        onConfirm={async () => {
          const r = await handleConfirm();
          if ("success" in r) {
            // Success: close both modals.
            reset();
            onClose();
          }
          return r;
        }}
      />
    </>
  );
}
