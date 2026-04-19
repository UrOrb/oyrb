"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

type Ban = {
  id: string;
  email: string | null;
  phone: string | null;
  reason: string;
  trigger_reason: string | null;
  triggering_attempt_ids: string[] | null;
  created_at: string;
};

// Pull a fingerprint hash out of the reason string. Detector + webhook
// store these as `<trigger>:<first-16-chars>`; show the truncated value
// rather than refetching the full hash from Stripe / FingerprintJS.
function fingerprintFromReason(reason: string): string | null {
  const idx = reason.indexOf(":");
  if (idx < 0) return null;
  const tail = reason.slice(idx + 1);
  return tail || null;
}

function triggerLabel(trigger: string | null): string {
  switch (trigger) {
    case "duplicate_phone":                       return "Phone reused";
    case "duplicate_email":                       return "Email reused";
    case "duplicate_payment_method_fingerprint":  return "Card reused";
    case "device_fingerprint_threshold":          return "Device reused";
    case "manual":                                return "Manual";
    default:                                      return trigger ?? "—";
  }
}

export function TrialBansAdmin({ initialBans }: { initialBans: Ban[] }) {
  const router = useRouter();
  const [bans, setBans] = useState<Ban[]>(initialBans);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftReason, setDraftReason] = useState("");

  function add() {
    setErr(null);
    start(async () => {
      const r = await fetch("/api/admin/trial-bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: draftEmail.trim() || undefined,
          phone: draftPhone.trim() || undefined,
          reason: draftReason.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error ?? "Couldn't add ban.");
        return;
      }
      setDraftEmail("");
      setDraftPhone("");
      setDraftReason("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Lift this ban? The email/phone will be eligible for trials again.")) return;
    setErr(null);
    start(async () => {
      const r = await fetch(`/api/admin/trial-bans/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.error ?? "Couldn't remove ban.");
        return;
      }
      setBans((xs) => xs.filter((b) => b.id !== id));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mt-6 rounded-md border border-[#E7E5E4] bg-white p-4">
        <p className="text-sm font-semibold">Add a manual ban</p>
        <p className="mt-0.5 text-xs text-[#737373]">
          Provide email and/or phone, plus a reason. Reason gets stored as
          <span className="font-mono"> manual:&lt;your text&gt;</span>.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="email"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs focus:border-[#B8896B] focus:outline-none"
          />
          <input
            type="tel"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            placeholder="+15555551234"
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs focus:border-[#B8896B] focus:outline-none"
          />
          <input
            type="text"
            value={draftReason}
            onChange={(e) => setDraftReason(e.target.value)}
            placeholder="reason (required)"
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs focus:border-[#B8896B] focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={add}
            disabled={pending || !draftReason.trim() || (!draftEmail.trim() && !draftPhone.trim())}
            className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            <Plus size={12} /> Add ban
          </button>
          {err && <span className="text-xs text-red-600">{err}</span>}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-[#E7E5E4]">
        <table className="w-full text-xs">
          <thead className="bg-[#FAFAF9] text-left text-[10px] uppercase tracking-wider text-[#A3A3A3]">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Fingerprint</th>
              <th className="px-3 py-2">Audit log</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {bans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-[#A3A3A3]">
                  No bans yet.
                </td>
              </tr>
            ) : (
              bans.map((b) => {
                const trig = b.trigger_reason ?? "";
                const fp = fingerprintFromReason(b.reason);
                const fpKind =
                  trig === "duplicate_payment_method_fingerprint"
                    ? "card"
                    : trig === "device_fingerprint_threshold"
                    ? "device"
                    : null;
                const auditIds = b.triggering_attempt_ids ?? [];
                return (
                  <tr key={b.id} className="border-t border-[#F0EFEC] align-top">
                    <td className="px-3 py-2 font-mono">{b.email ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{b.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-[#525252]">{triggerLabel(trig)}</td>
                    <td className="px-3 py-2 text-[#737373]">
                      {fp ? (
                        <>
                          {fpKind && (
                            <span className="mr-1 rounded bg-[#FAFAF9] px-1 py-0.5 text-[9px] uppercase tracking-wider">
                              {fpKind}
                            </span>
                          )}
                          <span className="font-mono">{fp.slice(0, 12)}…</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#A3A3A3]">
                      {auditIds.length > 0 ? (
                        <details>
                          <summary className="cursor-pointer text-[#525252] hover:underline">
                            {auditIds.length} row{auditIds.length === 1 ? "" : "s"}
                          </summary>
                          <ul className="mt-1 max-w-[220px] break-all font-mono text-[10px]">
                            {auditIds.map((id) => (
                              <li key={id}>{id}</li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#737373]">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => remove(b.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={11} /> Lift
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
