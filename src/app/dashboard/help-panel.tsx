"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, HelpCircle, Loader2, RotateCcw } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Slide-in help chat panel mounted once in the dashboard layout. The
 * Sidebar Help button dispatches a `oyrb:help:toggle` CustomEvent on
 * window — we listen for it here. This avoids running a Context provider
 * just to share a single boolean across the whole dashboard tree.
 *
 * State lives in this component: open/closed, message thread, input
 * value, pending flag. Closing the panel does NOT clear the thread —
 * a pro who navigates between pages and re-opens the panel sees the
 * same conversation. Refreshing the page resets it (intentional —
 * conversations are short and not worth persisting).
 */

const HELP_TOGGLE_EVENT = "oyrb:help:toggle";

const SUGGESTIONS = [
  "How do I set up Stripe?",
  "Why is my deposit not working?",
  "When do I get a 1099-K?",
  "How do I refund a client?",
];

export function HelpPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Window-level toggle listener — paired with the Sidebar Help button.
  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener(HELP_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(HELP_TOGGLE_EVENT, handler);
  }, []);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus the input on open + auto-scroll on new messages.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch("/api/dashboard/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Connection issue — please try again.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {/* Backdrop — only visible on mobile where the panel takes the
          full width. On md+ screens the panel sits next to content. */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        role="dialog"
        aria-label="OYRB help"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-[#E7E5E4] bg-white shadow-xl transition-transform duration-200 ease-out md:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E7E5E4] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FBF4EC] text-[#B8896B]">
              <HelpCircle size={16} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">Help</p>
              <p className="mt-0.5 text-[11px] text-[#737373]">
                Powered by Claude · answers from OYRB&apos;s help docs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Only meaningful once a thread exists. Hidden in empty
                state so the header isn't cluttered with a button that
                would be a no-op. Clears the thread + any error in
                place; doesn't close the panel or reload. */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                  setInput("");
                  inputRef.current?.focus();
                }}
                title="New chat"
                aria-label="New chat"
                className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <EmptyState onPick={(q) => send(q)} />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} text={m.content} />
              ))}
              {pending && <ThinkingBubble />}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <form
          onSubmit={onSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about OYRB or Stripe…"
            maxLength={1000}
            className="flex-1 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0A0A0A] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </aside>
    </>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-start justify-start gap-4 pt-2">
      <div>
        <p className="font-display text-lg font-medium">Hey ✦</p>
        <p className="mt-2 text-sm leading-relaxed text-[#525252]">
          I&apos;m here to help with OYRB. Ask me anything about Stripe
          setup, payments, taxes, or how things work — I&apos;ll pull
          from the help docs and your account state to give you a
          straight answer.
        </p>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
          Try asking
        </p>
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-left text-xs text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0A0A0A] px-4 py-2 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[#FBF4EC] px-4 py-2 text-sm text-[#0A0A0A]">
        {text}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#FBF4EC] px-4 py-3">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#B8896B]"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

/** Imperatively open/close the panel from anywhere in the dashboard. */
export function dispatchHelpToggle() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HELP_TOGGLE_EVENT));
  }
}
