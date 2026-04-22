"use client";

import { useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import { sendAnnouncement, type AdminAudience } from "./actions";

const AUDIENCES: Array<{ id: AdminAudience; label: string }> = [
  { id: "all_pros",      label: "Every pro on the platform" },
  { id: "tier_starter",  label: "Starter tier only" },
  { id: "tier_studio",   label: "Studio tier only" },
  { id: "tier_scale",    label: "Scale tier only" },
  { id: "by_region",     label: "By state (pick one)" },
];

export function AnnouncementForm({ adminEmail }: { adminEmail: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AdminAudience>("all_pros");
  const [regionState, setRegionState] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const submit = (fd: FormData) => {
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set("audience", audience);
    fd.set("region_state", regionState);
    setMsg(null);
    start(async () => {
      const r = await sendAnnouncement(fd);
      if (!r.ok) setMsg({ type: "err", text: r.error });
      else setMsg({
        type: "ok",
        text: `Sent to ${r.sent} pros${r.suppressed > 0 ? ` · ${r.suppressed} suppressed (unsub)` : ""}.`,
      });
    });
  };

  return (
    <form action={submit} className="mt-6 space-y-5">
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
        <h2 className="text-sm font-semibold">Audience</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                audience === a.id
                  ? "border-[#0A0A0A] bg-[#FAFAF9]"
                  : "border-[#E7E5E4] bg-white hover:border-[#B8896B]"
              }`}
            >
              <input
                type="radio"
                name="audience_radio"
                checked={audience === a.id}
                onChange={() => setAudience(a.id)}
                className="h-3.5 w-3.5"
              />
              <span className="font-medium">{a.label}</span>
            </label>
          ))}
        </div>
        {audience === "by_region" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium">State (e.g. GA, CA)</label>
            <input
              value={regionState}
              onChange={(e) => setRegionState(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="GA"
              className="w-24 rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
        <h2 className="text-sm font-semibold">Subject + body</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Body</label>
            <textarea
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi {{name}},\n\n[Announcement goes here]`}
              className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-[#A3A3A3]">
              Use {"{{name}}"} to personalize with the business name. Platform unsubscribe link + mailing address auto-appended.
            </p>
          </div>
        </div>
      </section>

      {msg && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.type === "ok" && <Check size={14} className="mr-1 inline" />}
          {msg.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#A3A3A3]">
          Sending as admin <strong>{adminEmail}</strong>. All sends audit-logged.
        </p>
        <button
          type="submit"
          disabled={pending || !subject || !body}
          className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send size={14} />
          {pending ? "Sending…" : "Send announcement"}
        </button>
      </div>
    </form>
  );
}
