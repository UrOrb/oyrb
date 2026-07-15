"use client";

// The killer mobile interaction (SPEC §2): swipe right to approve, left to
// skip, tap to edit. Buttons mirror every gesture (a11y rule) and are the
// primary affordance on desktop.
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, ExternalLink, Pencil, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { approveOutreach, skipOutreach } from "@/lib/actions";
import type { Outreach } from "@/lib/types";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 120;

export function ApprovalQueue({ items }: { items: Outreach[] }) {
  const [queue, dismiss] = useOptimistic(items, (state, id: string) =>
    state.filter((o) => o.id !== id),
  );
  const [, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");

  function decide(item: Outreach, verdict: "approve" | "skip") {
    startTransition(async () => {
      dismiss(item.id);
      setAnnouncement(
        verdict === "approve"
          ? `Approved ${item.channel} to ${item.contact?.full_name ?? "contact"}.`
          : `Skipped draft to ${item.contact?.full_name ?? "contact"}.`,
      );
      await (verdict === "approve" ? approveOutreach : skipOutreach)(item.id);
    });
  }

  const top = queue[0];

  return (
    <div className="mx-auto w-full max-w-md px-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {!top ? (
        <div className="mt-16 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-display text-xl">Queue clear.</p>
          <p className="mt-1 text-sm text-muted">
            Envoy will file new drafts here. Nothing ever sends without your
            tap.
          </p>
        </div>
      ) : (
        <>
          <p className="py-3 text-center font-mono text-xs text-muted">
            {queue.length} awaiting approval · swipe → approve · ← skip
          </p>
          <div className="relative" style={{ minHeight: 420 }}>
            {queue
              .slice(0, 3)
              .map((item, i) => (
                <SwipeCard
                  key={item.id}
                  item={item}
                  index={i}
                  onDecide={(v) => decide(item, v)}
                />
              ))
              .reverse()}
          </div>
        </>
      )}
    </div>
  );
}

function SwipeCard({
  item,
  index,
  onDecide,
}: {
  item: Outreach;
  index: number;
  onDecide: (verdict: "approve" | "skip") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const approveOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(item.body_md ?? "");
  const isTop = index === 0;

  return (
    <motion.article
      aria-label={`Draft ${item.channel} to ${item.contact?.full_name ?? "contact"}`}
      className={cn(
        "absolute inset-x-0 top-0 rounded-2xl border border-line bg-surface p-4 shadow-xl",
        !isTop && "pointer-events-none",
      )}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - index * 0.04,
        top: index * 10,
        zIndex: 10 - index,
      }}
      drag={isTop && !editing ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onDecide("approve");
        else if (info.offset.x < -SWIPE_THRESHOLD) onDecide("skip");
      }}
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: approveOpacity }}
        className="absolute right-4 top-4 rounded border border-signal px-2 py-0.5 font-mono text-xs text-signal"
      >
        APPROVE
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: skipOpacity }}
        className="absolute left-4 top-4 rounded border border-caution px-2 py-0.5 font-mono text-xs text-caution"
      >
        SKIP
      </motion.span>

      <header className="mb-3 pr-20">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {item.channel === "linkedin" ? "LinkedIn · draft-for-paste" : "Email"}
          {" · step "}
          {item.sequence_step}
          {item.path_type && ` · ${item.path_type === "warm" ? "🌉 warm" : "❄️ cold"}`}
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold leading-tight">
          {item.contact?.full_name}
          <span className="font-sans text-sm font-normal text-muted">
            {" — "}
            {item.contact?.title} · {item.job?.company?.name}
          </span>
        </h2>
        {item.subject && (
          <p className="mt-1 font-mono text-sm">Subject: {item.subject}</p>
        )}
      </header>

      {editing ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          aria-label="Edit draft body"
          className="w-full rounded-lg border border-line bg-bg p-3 text-sm leading-relaxed"
        />
      ) : (
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
          {body}
        </div>
      )}
      <p className="mt-2 font-mono text-[11px] text-caution">
        House rule: rewrite at least one line in your own words.
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDecide("skip")}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-caution hover:text-caution"
        >
          <X size={16} aria-hidden="true" /> Skip
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg"
        >
          <Pencil size={16} aria-hidden="true" /> {editing ? "Done" : "Edit"}
        </button>
        {item.channel === "linkedin" && item.contact?.linkedin_url ? (
          <a
            href={item.contact.linkedin_url}
            target="_blank"
            rel="noreferrer"
            onClick={() => navigator.clipboard?.writeText(body)}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-sm font-medium text-ink"
          >
            <ExternalLink size={16} aria-hidden="true" /> Copy &amp; open
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onDecide("approve")}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-sm font-medium text-ink"
          >
            <Check size={16} aria-hidden="true" /> Approve
          </button>
        )}
      </div>
    </motion.article>
  );
}
