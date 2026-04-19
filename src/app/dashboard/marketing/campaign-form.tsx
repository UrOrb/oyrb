"use client";

import { useState, useTransition } from "react";
import { sendCampaign } from "./actions";
import { Send, Check } from "lucide-react";

const TEMPLATES = [
  {
    name: "Win-back (30 days)",
    segment: "winback_30",
    subject: "Miss you — here's 15% off your next visit",
    body: `Hey {{name}},

It's been a minute. I'd love to have you back in the chair.

Book your next appointment this week and I'll give you 15% off.

Hit reply or book directly through my site.

Talk soon,`,
  },
  {
    name: "Win-back (60 days)",
    segment: "winback_60",
    subject: "Still thinking about that fresh look?",
    body: `Hi {{name}},

It's been about two months since I've seen you. I've got some new availability opening up.

If you've been putting off booking, use the link to grab a spot — I'd love to see you.`,
  },
  {
    name: "New service announcement",
    segment: "all",
    subject: "New service I'm now offering",
    body: `Hi {{name}},

Quick update — I've added a new service to my menu:

[Service name here]

Check it out on my booking site and reserve a spot.`,
  },
];

type Props = { businessName: string; clientCount: number };

export function CampaignForm({ businessName, clientCount }: Props) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function useTemplate(t: typeof TEMPLATES[0]) {
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setSegment(t.segment);
  }

  const submit = (fd: FormData) => {
    fd.set("name", name);
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set("segment", segment);
    setResult(null);
    start(async () => {
      const r = await sendCampaign(fd);
      if (r?.error) setResult({ type: "err", text: r.error });
      else setResult({ type: "ok", text: `Sent to ${r.sent} clients.` });
    });
  };

  return (
    <form action={submit} className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#737373]">
          Start from a template (optional)
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              type="button"
              key={t.name}
              onClick={() => useTemplate(t)}
              className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-left text-xs hover:border-[#B8896B]"
            >
              <p className="font-semibold">{t.name}</p>
              <p className="mt-1 truncate text-[#737373]">{t.subject}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#E7E5E4] bg-white p-5 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium">Campaign name (internal)</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. March win-back"
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Who to send to</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          >
            <option value="all">All clients ({clientCount})</option>
            <option value="winback_30">Haven&apos;t booked in 30+ days</option>
            <option value="winback_60">Haven&apos;t booked in 60+ days</option>
            <option value="winback_90">Haven&apos;t booked in 90+ days</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Subject line</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject shown in inbox"
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Message body
            <span className="ml-2 text-[10px] font-normal text-[#A3A3A3]">
              Use {"{{name}}"} to personalize
            </span>
          </label>
          <textarea
            required
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hey {{name}}, it's been a minute..."
            className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {result && (
        <div className={`rounded-md border px-3 py-2 text-sm ${
          result.type === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {result.type === "ok" && <Check size={14} className="mr-1 inline" />}
          {result.text}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !subject || !body}
        className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        <Send size={14} />
        {pending ? "Sending…" : `Send from ${businessName}`}
      </button>
      <p className="text-[10px] text-[#A3A3A3]">
        Sends from bookings@oyrb.space. Clients can reply to your business email if you&apos;ve set it in Site settings.
      </p>
    </form>
  );
}
