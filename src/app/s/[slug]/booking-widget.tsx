"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Calendar, X, Clock, Check, ArrowLeft } from "lucide-react";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents?: number;
  description: string;
};

type Hour = {
  day: string;
  open: boolean;
  open_time: string;
  close_time: string;
};

// Per-pro booking rules forwarded from the page's server render. Kept
// narrow and optional so any caller that forgot to pass them falls
// back to the legacy 30-min / 2h cutoff / no-breaks behavior.
export type WidgetRules = {
  intervalMinutes: number;
  allowLastMinute: boolean;
  lastMinuteCutoffHours: number;
  dailyBreakBlocks: Array<{
    start: string;
    end: string;
    days: Array<"sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat">;
  }>;
};

type Props = {
  businessId: string;
  businessName: string;
  services: Service[];
  hours: Hour[];
  accent: string;
  btnBg: string;
  btnText: string;
  clientPolicies?: string;
  cancellationPolicy?: string;
  slotsOpenThisWeek?: number;
  slug?: string;
  phoneVerificationEnabled?: boolean;
  rules?: WidgetRules;
};

const MON_FIRST_DAY_IDX = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function fmtPrice(c: number) {
  return `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
}
function fmtDuration(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

// Generate 14 days of future date options filtering by hours availability
function upcomingDates(hours: Hour[]): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay(); // 0=Sun, 1=Mon…
    const mondayIdx = dow === 0 ? 6 : dow - 1;
    const dayName = MON_FIRST_DAY_IDX[mondayIdx];
    const h = hours.find((x) => x.day === dayName);
    if (h?.open && h.open_time && h.close_time) out.push(d);
    if (out.length >= 14) break;
  }
  return out;
}

// Slot generator for the booking widget. Applies the subset of the pro's
// booking rules that don't require knowledge of existing bookings:
//   · interval alignment (15/30/45/60/120)
//   · last-minute cutoff (and full last-minute-off mode)
//   · daily break blocks (lunch, etc.)
// The break-between-appointments rule is enforced server-side at booking
// creation, where the existing-booking list is authoritative.
const DOW_CODES = ["sun","mon","tue","wed","thu","fri","sat"] as const;

function timeSlotsFor(
  day: Date,
  hours: Hour[],
  durationMin: number,
  rules?: WidgetRules,
): string[] {
  const dow = day.getDay();
  const mondayIdx = dow === 0 ? 6 : dow - 1;
  const dayName = MON_FIRST_DAY_IDX[mondayIdx];
  const h = hours.find((x) => x.day === dayName);
  if (!h?.open) return [];

  const intervalMin = rules?.intervalMinutes ?? 30;
  const allowLM = rules?.allowLastMinute ?? true;
  const cutoffMs = (rules?.lastMinuteCutoffHours ?? 2) * 60 * 60_000;

  const [openH, openM] = h.open_time.split(":").map(Number);
  const [closeH, closeM] = h.close_time.split(":").map(Number);
  const slots: string[] = [];

  const start = new Date(day);
  start.setHours(openH, openM, 0, 0);
  const end = new Date(day);
  end.setHours(closeH, closeM, 0, 0);

  const now = new Date();
  const floor = new Date(now.getTime() + cutoffMs);

  const dowCode = DOW_CODES[dow];
  const blocks = (rules?.dailyBreakBlocks ?? []).filter((b) => b.days.includes(dowCode));

  while (start.getTime() + durationMin * 60_000 <= end.getTime()) {
    const slotStart = new Date(start);
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);

    const passesCutoff = allowLM
      ? slotStart >= floor
      : slotStart.getTime() - now.getTime() >= cutoffMs;
    const passesFuture = slotStart > now;

    const hitsBlock = blocks.some((b) => {
      const [sH, sM] = b.start.split(":").map(Number);
      const [eH, eM] = b.end.split(":").map(Number);
      const bs = new Date(day); bs.setHours(sH, sM, 0, 0);
      const be = new Date(day); be.setHours(eH, eM, 0, 0);
      return slotStart < be && slotEnd > bs;
    });

    if (passesFuture && passesCutoff && !hitsBlock) {
      slots.push(
        `${slotStart.getHours().toString().padStart(2, "0")}:${slotStart.getMinutes().toString().padStart(2, "0")}`
      );
    }
    start.setMinutes(start.getMinutes() + intervalMin);
  }
  return slots;
}

function formatTimeDisplay(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function BookingWidget({
  businessId,
  businessName,
  services,
  hours,
  accent,
  btnBg,
  btnText,
  clientPolicies,
  cancellationPolicy,
  slotsOpenThisWeek,
  slug,
  phoneVerificationEnabled,
  rules,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"service" | "time" | "info" | "confirm" | "done">("service");
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [ackPolicies, setAckPolicies] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);
  const [ackAuthorize, setAckAuthorize] = useState(false);
  const [ackAge, setAckAge] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  // Marketing consent is separate from SMS reminders — explicit opt-in
  // per CAN-SPAM. Starts UNCHECKED.
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [tipPct, setTipPct] = useState<number>(0);
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [seriesWeeks, setSeriesWeeks] = useState<number>(0); // 0 = no series
  const [seriesOccurrences, setSeriesOccurrences] = useState<number>(4);
  const [phoneVerified, setPhoneVerified] = useState<string | null>(null); // phone that was verified
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sendVerify = async () => {
    if (!phone) return;
    setVerifyBusy(true);
    setVerifyMsg(null);
    try {
      const res = await fetch("/api/public/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) setVerifyMsg(data.error ?? "Couldn't send code");
      else {
        setVerifyCodeSent(true);
        setVerifyMsg("Code sent — check your texts");
      }
    } catch {
      setVerifyMsg("Connection issue");
    } finally {
      setVerifyBusy(false);
    }
  };

  const checkVerify = async () => {
    if (!phone || !verifyCode) return;
    setVerifyBusy(true);
    setVerifyMsg(null);
    try {
      const res = await fetch("/api/public/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) setVerifyMsg(data.error ?? "Invalid code");
      else {
        setPhoneVerified(phone);
        setVerifyMsg(null);
        setVerifyCodeSent(false);
        setVerifyCode("");
      }
    } catch {
      setVerifyMsg("Connection issue");
    } finally {
      setVerifyBusy(false);
    }
  };

  const needsVerification = !!phoneVerificationEnabled && !!phone && phoneVerified !== phone;

  const handlePhotoUpload = async (file: File) => {
    if (!slug) return;
    setUploadingPhoto(true);
    setPhotoUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const res = await fetch("/api/public/bookings/upload-photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhotoUploadError(data.error ?? `Upload failed (HTTP ${res.status}). Try a smaller photo.`);
      } else if (data.url) {
        setReferencePhotos((prev) => [...prev, data.url]);
      } else {
        setPhotoUploadError("Upload succeeded but no URL was returned. Please retry.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPhotoUploadError(`Couldn't reach the server (${msg}). Check your connection and retry.`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const tipCents = service ? Math.round((service.price_cents * tipPct) / 100) : 0;

  const dates = useMemo(() => upcomingDates(hours), [hours]);
  const slots = useMemo(
    () => (service && date ? timeSlotsFor(date, hours, service.duration_minutes, rules) : []),
    [service, date, hours]
  );

  function reset() {
    setStep("service");
    setService(null);
    setDate(null);
    setTime(null);
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setAckPolicies(false);
    setAckTerms(false);
    setAckAuthorize(false);
    setAckAge(false);
    setIsMinor(false);
    setGuardianName("");
    setSmsConsent(false);
    setMarketingOptIn(false);
    setTipPct(0);
    setReferencePhotos([]);
    setPhotoUploadError(null);
    setSeriesWeeks(0);
    setSeriesOccurrences(4);
    setPhoneVerified(null);
    setVerifyCodeSent(false);
    setVerifyCode("");
    setVerifyMsg(null);
    setError(null);
  }

  // Expose a global opener so template-level "Book" buttons can trigger the modal
  useEffect(() => {
    (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking = () => {
      reset();
      setOpen(true);
    };
    return () => {
      delete (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking;
    };
  }, []);

  // Open the widget whenever the URL hash is "#book" — templates render plain
  // <a href="#book"> links (server-rendered), this hook turns them into actions.
  useEffect(() => {
    function openIfBookHash() {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#book") {
        reset();
        setOpen(true);
        // Clear the hash so re-clicking the same link fires a new hashchange
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    openIfBookHash();
    window.addEventListener("hashchange", openIfBookHash);
    return () => window.removeEventListener("hashchange", openIfBookHash);
  }, []);

  function submit() {
    if (!service || !date || !time) return;
    if (!ackPolicies || !ackTerms || !ackAuthorize) {
      setError("Please check all three acknowledgments to confirm your booking.");
      return;
    }
    if (!ackAge) {
      setError("Please confirm your age to continue.");
      return;
    }
    if (isMinor && guardianName.trim().length < 2) {
      setError("Please enter the name of your parent or guardian.");
      return;
    }
    setError(null);
    const [h, m] = time.split(":").map(Number);
    const startAt = new Date(date);
    startAt.setHours(h, m, 0, 0);

    const hasDeposit = (service.deposit_cents ?? 0) > 0;
    const endpoint = hasDeposit
      ? "/api/public/bookings/deposit-checkout"
      : "/api/public/bookings";

    const combinedNotes = referencePhotos.length > 0
      ? `${notes ? notes + "\n\n" : ""}— Reference photos —\n${referencePhotos.join("\n")}`
      : notes;

    start(async () => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: service.id,
          start_at: startAt.toISOString(),
          name,
          email,
          phone,
          notes: combinedNotes,
          sms_consent: smsConsent && !!phone,
          marketing_opt_in: marketingOptIn,
          tip_cents: tipCents,
          series_interval_weeks: seriesWeeks > 0 ? seriesWeeks : null,
          series_occurrences: seriesWeeks > 0 ? seriesOccurrences : null,
          age_confirmed: ackAge,
          age_is_minor: isMinor,
          guardian_name: isMinor ? guardianName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (hasDeposit && data.url) {
        // Redirect to Stripe Checkout for deposit payment
        window.location.href = data.url;
        return;
      }
      setStep("done");
    });
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => {
          setOpen(true);
          reset();
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform hover:scale-105 md:bottom-8 md:right-8"
        style={{ backgroundColor: btnBg, color: btnText }}
      >
        <Calendar size={16} /> Book appointment
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white md:h-auto md:max-h-[90vh] md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E7E5E4] p-5">
              <div className="flex items-center gap-3">
                {step !== "service" && step !== "done" && (
                  <button
                    onClick={() =>
                      setStep(
                        step === "time" ? "service" :
                        step === "info" ? "time" :
                        "info"
                      )
                    }
                    className="rounded-md p-1 hover:bg-[#F5F5F4]"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#737373]">Book with</p>
                  <p className="font-semibold">{businessName}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-[#F5F5F4]">
                <X size={16} />
              </button>
            </div>

            {/* Progress */}
            {step !== "done" && (
              <div className="flex border-b border-[#E7E5E4] px-5 text-xs">
                {[
                  { id: "service", label: "Service" },
                  { id: "time", label: "Time" },
                  { id: "info", label: "Info" },
                  { id: "confirm", label: "Confirm" },
                ].map((s, i) => {
                  const stepOrder = ["service", "time", "info", "confirm"];
                  const currentIdx = stepOrder.indexOf(step);
                  const myIdx = stepOrder.indexOf(s.id);
                  const active = step === s.id;
                  const done = myIdx < currentIdx;
                  return (
                    <div key={s.id} className="flex-1 py-3">
                      <div
                        className="mb-1 h-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: active || done ? accent : "#E7E5E4",
                        }}
                      />
                      <p className={active ? "font-semibold" : "text-[#737373]"}>
                        {i + 1}. {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {step === "service" && (
                <>
                  {/* Availability indicator */}
                  {slotsOpenThisWeek !== undefined && slotsOpenThisWeek > 0 && (
                    <div
                      className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                      style={{
                        backgroundColor:
                          slotsOpenThisWeek <= 3
                            ? "#FEF3C7"
                            : slotsOpenThisWeek <= 8
                            ? "#FEF9C3"
                            : "#ECFDF5",
                        color:
                          slotsOpenThisWeek <= 3
                            ? "#92400E"
                            : slotsOpenThisWeek <= 8
                            ? "#854D0E"
                            : "#166534",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            slotsOpenThisWeek <= 3
                              ? "#F59E0B"
                              : slotsOpenThisWeek <= 8
                              ? "#EAB308"
                              : "#10B981",
                        }}
                      />
                      <span className="font-medium">
                        {slotsOpenThisWeek <= 3
                          ? `Only ${slotsOpenThisWeek} opening${slotsOpenThisWeek === 1 ? "" : "s"} left this week — book soon`
                          : slotsOpenThisWeek <= 8
                          ? `${slotsOpenThisWeek} openings left this week`
                          : `${slotsOpenThisWeek}+ openings this week`}
                      </span>
                    </div>
                  )}
                  {slotsOpenThisWeek === 0 && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      <span className="font-medium">Fully booked this week — next week available below</span>
                    </div>
                  )}

                  {services.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[#737373]">
                      No services available yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {services.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setService(s);
                            setStep("time");
                          }}
                          className="block w-full rounded-lg border border-[#E7E5E4] p-4 text-left transition-colors hover:border-[#B8896B]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{s.name}</p>
                              {s.description && (
                                <p className="mt-1 text-xs text-[#737373] line-clamp-2">
                                  {s.description}
                                </p>
                              )}
                              <p className="mt-2 flex items-center gap-1 text-xs text-[#525252]">
                                <Clock size={11} /> {fmtDuration(s.duration_minutes)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold">{fmtPrice(s.price_cents)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {step === "time" && service && (
                <>
                  <p className="text-xs uppercase tracking-wide text-[#737373]">Pick a date</p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {dates.length === 0 && (
                      <p className="col-span-4 text-sm text-[#737373]">
                        No available days in the next 3 weeks.
                      </p>
                    )}
                    {dates.map((d) => {
                      const isSel = date?.toDateString() === d.toDateString();
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => {
                            setDate(d);
                            setTime(null);
                          }}
                          className="rounded-md border p-2 text-center text-xs"
                          style={{
                            borderColor: isSel ? accent : "#E7E5E4",
                            backgroundColor: isSel ? `${accent}15` : undefined,
                          }}
                        >
                          <p className="font-medium">
                            {d.toLocaleDateString("en-US", { weekday: "short" })}
                          </p>
                          <p className="mt-0.5 text-base font-semibold">{d.getDate()}</p>
                          <p className="text-[10px] text-[#737373]">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {date && (
                    <>
                      <p className="mt-6 text-xs uppercase tracking-wide text-[#737373]">
                        Available times
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {slots.length === 0 && (
                          <p className="col-span-3 text-sm text-[#737373]">
                            No available times.
                          </p>
                        )}
                        {slots.map((t) => {
                          const isSel = time === t;
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                setTime(t);
                                setStep("info");
                              }}
                              className="rounded-md border py-2 text-xs font-medium"
                              style={{
                                borderColor: isSel ? accent : "#E7E5E4",
                                backgroundColor: isSel ? `${accent}15` : undefined,
                              }}
                            >
                              {formatTimeDisplay(t)}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}

              {step === "info" && service && date && time && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-[#FAFAF9] p-3 text-xs">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-[#737373]">
                      {date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      · {formatTimeDisplay(time)} · {fmtPrice(service.price_cents)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium">Your name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Phone{" "}
                      {phoneVerificationEnabled && (
                        <span className="text-[10px] font-normal text-[#737373]">
                          (we&apos;ll text you a code to verify)
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        // Reset verification if phone changes
                        if (phoneVerified && phoneVerified !== e.target.value) {
                          setPhoneVerified(null);
                          setVerifyCodeSent(false);
                          setVerifyCode("");
                        }
                      }}
                      placeholder="(555) 123-4567"
                      className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                    />

                    {phoneVerificationEnabled && phone && (
                      <div className="mt-2">
                        {phoneVerified === phone ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <Check size={12} /> Phone verified
                          </div>
                        ) : !verifyCodeSent ? (
                          <button
                            type="button"
                            onClick={sendVerify}
                            disabled={verifyBusy}
                            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
                          >
                            {verifyBusy ? "Sending…" : "Send verification code"}
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={verifyCode}
                              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit code"
                              className="w-40 rounded-md border border-[#E7E5E4] px-3 py-1.5 font-mono text-sm tracking-widest"
                              maxLength={6}
                            />
                            <button
                              type="button"
                              onClick={checkVerify}
                              disabled={verifyBusy || verifyCode.length !== 6}
                              className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-50"
                            >
                              {verifyBusy ? "Verifying…" : "Verify"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyCodeSent(false);
                                setVerifyCode("");
                                setVerifyMsg(null);
                              }}
                              className="text-xs text-[#737373] underline hover:text-[#0A0A0A]"
                            >
                              Resend
                            </button>
                          </div>
                        )}
                        {verifyMsg && (
                          <p className={`mt-2 text-xs ${phoneVerified ? "text-green-700" : "text-[#737373]"}`}>
                            {verifyMsg}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Anything the pro should know (allergies, inspiration, specific requests)…"
                      className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Reference photos (optional)
                    </label>
                    <p className="mb-2 text-xs text-[#737373]">
                      Upload photos of the look you want, or a current concern (nails, hair, skin).
                      Helps your pro prep. Up to 10MB each — JPG, PNG, WebP, or HEIC (iPhone).
                    </p>
                    {referencePhotos.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {referencePhotos.map((url, i) => (
                          <div key={url} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Reference ${i + 1}`}
                              className="h-16 w-16 rounded-md border border-[#E7E5E4] object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReferencePhotos((p) => p.filter((x) => x !== url))
                              }
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A] text-white hover:bg-red-600"
                              aria-label="Remove photo"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium hover:bg-[#F5F5F4]">
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        disabled={uploadingPhoto || referencePhotos.length >= 5}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                          e.target.value = "";
                        }}
                      />
                      {uploadingPhoto
                        ? "Uploading…"
                        : referencePhotos.length >= 5
                        ? "5 photo limit reached"
                        : referencePhotos.length === 0
                        ? "+ Add a photo"
                        : `+ Add another (${referencePhotos.length}/5)`}
                    </label>
                    {photoUploadError && (
                      <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                        {photoUploadError}
                      </p>
                    )}
                  </div>
                  <button
                    disabled={!name || !email || uploadingPhoto || needsVerification}
                    onClick={() => setStep("confirm")}
                    className="mt-2 w-full rounded-md py-3 text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: btnBg, color: btnText }}
                  >
                    Continue to review
                  </button>
                </div>
              )}

              {step === "confirm" && service && date && time && (
                <div className="space-y-4">
                  {/* Booking summary */}
                  <div className="rounded-lg bg-[#FAFAF9] p-4 text-sm">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#737373]">
                      Your booking
                    </p>
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 text-[#525252]">
                      {date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      · {formatTimeDisplay(time)}
                    </p>
                    <p className="mt-1 text-[#525252]">
                      {fmtPrice(service.price_cents)}
                      {service.deposit_cents && service.deposit_cents > 0 && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          {fmtPrice(service.deposit_cents)} deposit due now · rest due at appointment
                        </span>
                      )}
                    </p>
                    <div className="mt-3 border-t border-[#E7E5E4] pt-3 text-xs text-[#525252]">
                      <p><strong>Name:</strong> {name}</p>
                      <p><strong>Email:</strong> {email}</p>
                      {phone && <p><strong>Phone:</strong> {phone}</p>}
                    </div>
                  </div>

                  {/* Tip selector — only when there's a deposit to charge */}
                  {service.deposit_cents && service.deposit_cents > 0 && (
                    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#737373]">
                        Add a tip? (optional)
                      </p>
                      <p className="mb-3 text-xs text-[#737373]">
                        Go ahead and tip now, or save it for after your appointment.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[0, 15, 18, 20, 25].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTipPct(p)}
                            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                              tipPct === p
                                ? "text-white"
                                : "border border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#F5F5F4]"
                            }`}
                            style={tipPct === p ? { backgroundColor: accent } : {}}
                          >
                            {p === 0 ? "No tip" : `${p}%`}
                          </button>
                        ))}
                      </div>
                      {tipCents > 0 && (
                        <p className="mt-3 text-xs text-[#525252]">
                          Tip: <strong>{fmtPrice(tipCents)}</strong> · Total today:{" "}
                          <strong>{fmtPrice((service.deposit_cents ?? 0) + tipCents)}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recurring series selector */}
                  <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
                    <label className="flex items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={seriesWeeks > 0}
                        onChange={(e) => setSeriesWeeks(e.target.checked ? 4 : 0)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <div>
                        <span className="font-semibold">Book this as a recurring series</span>
                        <p className="mt-0.5 text-xs text-[#737373]">
                          Lock in your regular appointments. Cancel any one anytime.
                        </p>
                      </div>
                    </label>

                    {seriesWeeks > 0 && (
                      <div className="mt-4 space-y-3 border-t border-[#E7E5E4] pt-4">
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#737373]">
                            Every
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[2, 3, 4, 6].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setSeriesWeeks(w)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                                  seriesWeeks === w
                                    ? "text-white"
                                    : "border border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#F5F5F4]"
                                }`}
                                style={seriesWeeks === w ? { backgroundColor: accent } : {}}
                              >
                                {w} weeks
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#737373]">
                            Number of visits
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[2, 3, 4, 6, 8, 12].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setSeriesOccurrences(n)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                                  seriesOccurrences === n
                                    ? "text-white"
                                    : "border border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#F5F5F4]"
                                }`}
                                style={seriesOccurrences === n ? { backgroundColor: accent } : {}}
                              >
                                {n} visits
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[#525252]">
                          {seriesOccurrences} appointments, every {seriesWeeks} weeks. Only the first requires a deposit today — the rest are locked in at the same time slot and you can cancel any individual one later.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Business policies */}
                  {(clientPolicies || cancellationPolicy) && (
                    <div className="rounded-lg border border-[#E7E5E4] p-4 text-xs">
                      <p className="mb-2 font-semibold uppercase tracking-wide text-[#737373]">
                        {businessName}&apos;s policies
                      </p>
                      {cancellationPolicy && (
                        <div className="mb-3">
                          <p className="mb-1 text-xs font-semibold text-[#0A0A0A]">Cancellation & no-show</p>
                          <p className="whitespace-pre-wrap text-[#525252]">{cancellationPolicy}</p>
                        </div>
                      )}
                      {clientPolicies && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-[#0A0A0A]">House rules</p>
                          <p className="whitespace-pre-wrap text-[#525252]">{clientPolicies}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Age gate — legally required before booking */}
                  <div className="space-y-3 rounded-lg border border-[#E7E5E4] bg-white p-4">
                    <label className="flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={ackAge}
                        onChange={(e) => setAckAge(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        <strong>I confirm I am 18 or older.</strong>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={isMinor}
                        onChange={(e) => setIsMinor(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        I&apos;m under 18 — a parent or guardian has consented to this booking.
                      </span>
                    </label>
                    {isMinor && (
                      <div className="pl-7">
                        <label className="mb-1 block text-xs font-medium text-[#525252]">
                          Parent / guardian name
                        </label>
                        <input
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          className="w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
                          placeholder="Full name of consenting adult"
                        />
                      </div>
                    )}
                  </div>

                  {/* Three acknowledgment checkboxes */}
                  <div className="space-y-3 rounded-lg border border-[#E7E5E4] bg-white p-4">
                    <label className="flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={ackPolicies}
                        onChange={(e) => setAckPolicies(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        I have read and agree to <strong>{businessName}&apos;s</strong> cancellation, no-show, and house policies above.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={ackTerms}
                        onChange={(e) => setAckTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        I agree to the OYRB{" "}
                        <a href="/terms" target="_blank" className="font-medium underline" style={{ color: accent }}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" target="_blank" className="font-medium underline" style={{ color: accent }}>
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={ackAuthorize}
                        onChange={(e) => setAckAuthorize(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        I authorize this booking and understand that clicking &quot;Confirm&quot; below is my final, binding agreement to this appointment and any applicable deposit. I will not dispute this charge after confirmation except as permitted by law.
                      </span>
                    </label>
                    {phone && (
                      <label className="flex items-start gap-3 border-t border-[#E7E5E4] pt-3 text-xs">
                        <input
                          type="checkbox"
                          checked={smsConsent}
                          onChange={(e) => setSmsConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span className="text-[#525252]">
                          <strong>Optional:</strong> Text me appointment reminders and last-minute slot alerts at {phone}. Msg &amp; data rates may apply. Reply STOP to opt out.
                        </span>
                      </label>
                    )}
                    {/* Marketing opt-in — separate from SMS + transactional.
                        Unchecked by default; checkbox text names the pro so
                        the client knows who's sending. */}
                    <label className="flex items-start gap-3 border-t border-[#E7E5E4] pt-3 text-xs">
                      <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="text-[#525252]">
                        <strong>Optional:</strong> Send me occasional offers and updates from {businessName}. You can unsubscribe in one click from any email.
                      </span>
                    </label>
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    disabled={
                      pending ||
                      !ackPolicies ||
                      !ackTerms ||
                      !ackAuthorize ||
                      !ackAge ||
                      (isMinor && guardianName.trim().length < 2)
                    }
                    onClick={submit}
                    className="w-full rounded-md py-3 text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: btnBg, color: btnText }}
                  >
                    {pending
                      ? (service && service.deposit_cents && service.deposit_cents > 0
                          ? "Redirecting to payment…"
                          : "Booking…")
                      : (service && service.deposit_cents && service.deposit_cents > 0
                          ? `Pay ${fmtPrice(service.deposit_cents)} deposit & confirm`
                          : "Confirm booking")}
                  </button>
                </div>
              )}

              {step === "done" && (
                <div className="flex flex-col items-center py-10 text-center">
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${accent}25` }}
                  >
                    <Check size={28} style={{ color: accent }} />
                  </div>
                  <h3 className="font-display text-xl font-medium">Booking confirmed ✦</h3>
                  <p className="mt-2 max-w-sm text-sm text-[#737373]">
                    A confirmation email is on its way. {businessName} will see your booking right away.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-6 rounded-md border border-[#E7E5E4] px-5 py-2 text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
