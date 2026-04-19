"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  slug: string;
  businessName: string;
  accent: string;
  btnBg: string;
  btnText: string;
}

export function ChatWidget({ slug, businessName, accent, btnBg, btnText }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: text, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error ?? "Something went wrong. Please try again." },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Connection issue — please try again." },
      ]);
    } finally {
      setPending(false);
    }
  };

  const suggestions = [
    "What services do you offer?",
    "What are your hours?",
    "How do I book?",
  ];

  return (
    <>
      {/* Floating trigger button — bottom-LEFT so it doesn't overlap booking widget */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          className="fixed bottom-5 left-5 z-[60] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl md:bottom-6 md:left-6"
          style={{ backgroundColor: btnBg, color: btnText }}
        >
          <MessageCircle size={16} />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Chat panel — bottom-left, compact, doesn't cover main content */}
      {open && (
        <div
          className="fixed bottom-5 left-5 z-[60] flex w-[calc(100vw-40px)] max-w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:bottom-6 md:left-6 md:w-[360px]"
          style={{
            height: "min(520px, calc(100vh - 120px))",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            style={{ backgroundColor: btnBg, color: btnText }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Sparkles size={14} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{businessName}</p>
                <p className="text-[11px] opacity-75">AI booking assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 transition-opacity hover:opacity-80"
              style={{ color: btnText }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-[#FAFAF9] px-3 py-4"
          >
            {messages.length === 0 && (
              <div className="mb-4 flex flex-col gap-3">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-[#0A0A0A] shadow-sm">
                  Hi! I&apos;m the virtual assistant for <strong>{businessName}</strong>. Ask me about services, pricing, hours, or how to book.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => send(), 0);
                      }}
                      className="rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#525252] hover:bg-[#F5F5F4]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2.5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm bg-white text-[#0A0A0A] shadow-sm"
                  }`}
                  style={m.role === "user" ? { backgroundColor: accent } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {pending && (
              <div className="mb-2.5 flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            className="flex shrink-0 items-center gap-2 border-t bg-white px-3 py-2.5"
            style={{ borderColor: "rgba(0,0,0,0.06)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question…"
              maxLength={600}
              disabled={pending}
              className="flex-1 rounded-full border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2 text-sm outline-none focus:border-[#A3A3A3] focus:bg-white disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || pending}
              aria-label="Send message"
              className="shrink-0 rounded-full p-2 transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: accent, color: "#fff" }}
            >
              <Send size={14} />
            </button>
          </div>

          <div className="shrink-0 bg-[#FAFAF9] px-3 pb-2 text-center text-[10px] text-[#A3A3A3]">
            Powered by OYRB AI · Answers may be imperfect
          </div>
        </div>
      )}
    </>
  );
}
