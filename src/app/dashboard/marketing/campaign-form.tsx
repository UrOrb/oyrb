"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import { previewRecipientCount, sendCampaign, type Segment } from "./actions";

const TEMPLATES = [
  {
    name: "Win-back (30 days)",
    segment: "winback_30" as Segment,
    subject: "Miss you — here's 15% off your next visit",
    body: `Hey {{name}},

It's been a minute. I'd love to have you back in the chair.

Book your next appointment this week and I'll give you 15% off.`,
  },
  {
    name: "Win-back (60+ days)",
    segment: "winback_60" as Segment,
    subject: "Still thinking about that fresh look?",
    body: `Hi {{name}},

It's been about two months. Some fresh availability opening up — I'd love to see you.`,
  },
  {
    name: "New service announcement",
    segment: "all_opted_in" as Segment,
    subject: "New service I'm now offering",
    body: `Hi {{name}},

Quick update — I've added a new service to my menu:

[Service name here]

Check it out on my booking site and reserve a spot.`,
  },
  {
    name: "VIP appreciation",
    segment: "vip" as Segment,
    subject: "A thank-you for my top clients",
    body: `Hi {{name}},

You're one of my most loyal clients and I'm grateful. Here's something special just for you:

[Offer here — e.g. complimentary add-on at your next visit]`,
  },
];

const SEGMENTS: Array<{ id: Segment; label: string; hint: string }> = [
  { id: "all_opted_in", label: "All opted-in clients",    hint: "Every client who's opted in." },
  { id: "last_30",      label: "Visited in last 30 days",  hint: "Booked within the last month." },
  { id: "last_60",      label: "Visited in last 60 days",  hint: "Booked within the last two months." },
  { id: "last_90",      label: "Visited in last 90 days",  hint: "Booked within the last quarter." },
  { id: "winback_30",   label: "Win-back: 30+ days quiet", hint: "Haven't booked in 30+ days." },
  { id: "winback_60",   label: "Win-back: 60+ days quiet", hint: "Haven't booked in 60+ days." },
  { id: "vip",          label: "VIPs (top 10% spend)",     hint: "Top 10% of clients by total spend." },
];

type ClientLite = { id: string; name: string; email: string | null; marketing_opt_in: boolean };

type Props = {
  businessName: string;
  allClients: ClientLite[];
};

export function CampaignForm({ businessName, allClients }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all_opted_in");
  const [manualSelection, setManualSelection] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ eligible: number; total: number } | null>(null);
  const [previewing, startPreview] = useTransition();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    startPreview(async () => {
      const r = await previewRecipientCount({
        segment,
        clientIds: segment === "manual" ? Array.from(manualSelection) : undefined,
      });
      setPreview(r);
    });
  }, [segment, manualSelection]);

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setSegment(t.segment);
  }

  function toggleManual(id: string) {
    setManualSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const submit = (fd: FormData) => {
    fd.set("name", name);
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set("segment", segment);
    if (segment === "manual") {
      fd.set("client_ids", Array.from(manualSelection).join(","));
    }
    setResult(null);
    start(async () => {
      const r = await sendCampaign(fd);
      if (!r.ok) setResult({ type: "err", text: r.error });
      else {
        const suppressedNote =
          r.suppressed > 0 ? ` · ${r.suppressed} suppressed (opt-in/unsub)` : "";
        setResult({
          type: "ok",
          text: `Sent to ${r.sent} clients.${suppressedNote}`,
        });
      }
    });
  };

  const recipientLabel =
    previewing ? "Counting…" :
    preview ? `${preview.eligible} opted-in recipient${preview.eligible === 1 ? "" : "s"}` :
    "—";

  return (
    <form action={submit} className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        <StepPill active={step === 1} num={1}>Recipients</StepPill>
        <span>→</span>
        <StepPill active={step === 2} num={2}>Compose</StepPill>
        <span>→</span>
        <StepPill active={step === 3} num={3}>Confirm</StepPill>
      </div>

      {step === 1 && (
        <>
          <Card title="Pick recipients" hint="Filters stack with the marketing opt-in check.">
            <div className="grid gap-2 sm:grid-cols-2">
              {SEGMENTS.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-xs ${
                    segment === s.id
                      ? "border-[#0A0A0A] bg-[#FAFAF9]"
                      : "border-[#E7E5E4] bg-white hover:border-[#B8896B]"
                  }`}
                >
                  <input
                    type="radio"
                    name="segment_radio"
                    checked={segment === s.id}
                    onChange={() => setSegment(s.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <span>
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block text-[#737373]">{s.hint}</span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-xs ${
                  segment === "manual"
                    ? "border-[#0A0A0A] bg-[#FAFAF9]"
                    : "border-[#E7E5E4] bg-white hover:border-[#B8896B]"
                }`}
              >
                <input
                  type="radio"
                  name="segment_radio"
                  checked={segment === "manual"}
                  onChange={() => setSegment("manual")}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span>
                  <span className="block font-semibold">Manual selection</span>
                  <span className="block text-[#737373]">Pick individuals from your client list.</span>
                </span>
              </label>
            </div>

            {segment === "manual" && (
              <div className="mt-4 max-h-64 overflow-auto rounded-md border border-[#E7E5E4] bg-white">
                {allClients.length === 0 ? (
                  <p className="p-4 text-xs text-[#737373]">No clients yet.</p>
                ) : (
                  <ul className="divide-y divide-[#E7E5E4]">
                    {allClients.map((c) => (
                      <li key={c.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={manualSelection.has(c.id)}
                            onChange={() => toggleManual(c.id)}
                            disabled={!c.marketing_opt_in}
                            className="h-3.5 w-3.5"
                          />
                          <span className="flex-1">
                            <span className="font-medium">{c.name}</span>
                            {c.email && <span className="ml-2 text-[#737373]">{c.email}</span>}
                          </span>
                        </label>
                        {!c.marketing_opt_in && (
                          <span className="text-[10px] text-[#A3A3A3]">Not opted in</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-4 rounded-md bg-[#FAFAF9] px-4 py-3 text-sm">
              <p className="font-medium">This email will be sent to:</p>
              <p className="mt-1 text-lg font-semibold text-[#0A0A0A]">{recipientLabel}</p>
              {preview && preview.total > preview.eligible && (
                <p className="mt-1 text-[11px] text-[#737373]">
                  {preview.total - preview.eligible} client(s) in this segment aren&apos;t opted in
                  (or have unsubscribed) and will be skipped.
                </p>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!preview || preview.eligible === 0}
              className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Next → compose
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card
            title="Compose your email"
            hint="Use {{name}} to personalize. Unsubscribe link + mailing address are appended automatically."
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                  Start from a template (optional)
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button
                      type="button"
                      key={t.name}
                      onClick={() => applyTemplate(t)}
                      className="rounded-md border border-[#E7E5E4] bg-white p-2.5 text-left text-xs hover:border-[#B8896B]"
                    >
                      <p className="font-semibold">{t.name}</p>
                      <p className="mt-0.5 truncate text-[#737373]">{t.subject}</p>
                    </button>
                  ))}
                </div>
              </div>

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
                <label className="mb-1 block text-xs font-medium">Subject line</label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={160}
                  placeholder="Subject shown in inbox"
                  className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[10px] text-[#A3A3A3]">{subject.length}/160</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Message body</label>
                <textarea
                  required
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hey {{name}}, it's been a minute…"
                  className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </Card>

          <Card title="Preview" hint="What recipients will see. Your business name is shown at the bottom.">
            <div className="rounded-md border border-[#E7E5E4] bg-white p-5 text-sm">
              <p className="text-base font-semibold">{subject || "(subject line)"}</p>
              <div
                className="mt-3 whitespace-pre-wrap text-[#525252]"
                style={{ fontSize: 15, lineHeight: 1.6 }}
              >
                {body || "(body goes here)"}
              </div>
              <p className="mt-5 border-t border-[#E7E5E4] pt-3 text-[11px] text-[#A3A3A3]">
                You&apos;re receiving this because you opted in to hear from {businessName} via OYRB.
                <br />
                <span className="underline">Unsubscribe from all marketing emails</span> · <span className="underline">Privacy</span>
                <br />
                <em>(mailing address appended at send time)</em>
              </p>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9]"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!subject || !body || !name}
              className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Next → confirm
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card
            title="Ready to send?"
            hint="Double-check the recipient count and the subject line."
          >
            <div className="rounded-md bg-[#FAFAF9] px-4 py-3">
              <p className="text-xs text-[#737373]">Sending to</p>
              <p className="mt-1 text-2xl font-semibold text-[#0A0A0A]">{recipientLabel}</p>
              <p className="mt-3 text-xs text-[#737373]">Subject</p>
              <p className="mt-1 text-sm font-semibold">{subject}</p>
            </div>
            {preview && preview.eligible >= 500 && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                You&apos;re sending to {preview.eligible}+ recipients. Daily cap is 1,000 marketing
                emails per pro. Confirm this is right before clicking send.
              </p>
            )}
          </Card>

          {result && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                result.type === "ok"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {result.type === "ok" && <Check size={14} className="mr-1 inline" />}
              {result.text}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9]"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={pending || !preview || preview.eligible === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} />
              {pending ? "Sending…" : `Send to ${preview?.eligible ?? 0} clients`}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-[#737373]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StepPill({ active, num, children }: { active: boolean; num: number; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
        active ? "bg-[#0A0A0A] text-white" : "bg-[#FAFAF9] text-[#737373]"
      }`}
    >
      {num}. {children}
    </span>
  );
}
