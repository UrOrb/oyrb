import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Auto-ban detector. Runs on a schedule (every 15 min via Vercel Cron) and
 * scans `trial_signup_attempts` for the patterns from the spec:
 *
 *   1. Same phone used for 2+ trial signup attempts (any outcome).
 *   2. Same email used for 2+ trial signup attempts.
 *   3. 3+ attempts from one device fingerprint within 30 days.
 *      (Inactive in practice until the client lib is wired to populate
 *       device_fingerprint — column exists, detector is ready.)
 *
 * For every trigger fired, both the email AND the phone(s) seen in the
 * triggering attempts go on the ban list with the trigger reason and the
 * audit-log row IDs that caused it. Idempotent: identifiers already on the
 * ban list are skipped, so re-running this never double-bans.
 *
 * Every run writes a row to `trial_ban_runs` with stats — useful for
 * monitoring whether the schedule is actually firing in prod.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const startedAt = Date.now();
  const result = { scanned: 0, bansCreated: 0, error: undefined as string | undefined };

  try {
    // Pull every audit row from the last 90 days. The whole table will
    // typically stay small; switch to a windowed scan if it ever grows
    // past a few hundred thousand.
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: attempts, error } = await admin
      .from("trial_signup_attempts")
      .select("id, email, phone, device_fingerprint, attempted_at")
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: true });

    if (error) throw error;
    result.scanned = (attempts ?? []).length;

    // Pre-load every ban so we don't hit the DB inside the trigger loop.
    const [banEmails, banPhones] = await loadBannedSets(admin);

    // Group by email, phone, and device fingerprint.
    const byEmail = new Map<string, Attempt[]>();
    const byPhone = new Map<string, Attempt[]>();
    const byFingerprint = new Map<string, Attempt[]>();

    for (const a of (attempts ?? []) as Attempt[]) {
      const e = (a.email ?? "").toLowerCase().trim();
      const p = (a.phone ?? "").trim();
      const fp = (a.device_fingerprint ?? "").trim();
      if (e) push(byEmail, e, a);
      if (p) push(byPhone, p, a);
      if (fp) push(byFingerprint, fp, a);
    }

    const newBans: BanRow[] = [];

    // Trigger 1: same phone, 2+ attempts.
    for (const [phone, attempts] of byPhone) {
      if (attempts.length < 2 || banPhones.has(phone)) continue;
      const ids = attempts.map((a) => a.id);
      const emails = uniq(attempts.map((a) => (a.email ?? "").toLowerCase().trim()).filter(Boolean));
      newBans.push({
        email: null,
        phone,
        reason: "duplicate_phone",
        trigger_reason: "duplicate_phone",
        triggering_attempt_ids: ids,
      });
      banPhones.add(phone); // local guard so the same phone isn't queued twice in this run
      for (const e of emails) {
        if (banEmails.has(e)) continue;
        newBans.push({
          email: e,
          phone: null,
          reason: "duplicate_phone",
          trigger_reason: "duplicate_phone",
          triggering_attempt_ids: ids,
        });
        banEmails.add(e);
      }
    }

    // Trigger 2: same email, 2+ attempts.
    for (const [email, attempts] of byEmail) {
      if (attempts.length < 2 || banEmails.has(email)) continue;
      const ids = attempts.map((a) => a.id);
      const phones = uniq(attempts.map((a) => (a.phone ?? "").trim()).filter(Boolean));
      newBans.push({
        email,
        phone: null,
        reason: "duplicate_email",
        trigger_reason: "duplicate_email",
        triggering_attempt_ids: ids,
      });
      banEmails.add(email);
      for (const p of phones) {
        if (banPhones.has(p)) continue;
        newBans.push({
          email: null,
          phone: p,
          reason: "duplicate_email",
          trigger_reason: "duplicate_email",
          triggering_attempt_ids: ids,
        });
        banPhones.add(p);
      }
    }

    // Trigger 3: device fingerprint, 3+ attempts within 30 days.
    const now = Date.now();
    const THIRTY = 30 * 24 * 60 * 60 * 1000;
    for (const [fp, attempts] of byFingerprint) {
      const recent = attempts.filter(
        (a) => now - new Date(a.attempted_at).getTime() <= THIRTY
      );
      if (recent.length < 3) continue;
      const ids = recent.map((a) => a.id);
      const emails = uniq(recent.map((a) => (a.email ?? "").toLowerCase().trim()).filter(Boolean));
      const phones = uniq(recent.map((a) => (a.phone ?? "").trim()).filter(Boolean));
      for (const e of emails) {
        if (banEmails.has(e)) continue;
        newBans.push({
          email: e,
          phone: null,
          reason: `device_fingerprint_threshold:${fp.slice(0, 16)}`,
          trigger_reason: "device_fingerprint_threshold",
          triggering_attempt_ids: ids,
        });
        banEmails.add(e);
      }
      for (const p of phones) {
        if (banPhones.has(p)) continue;
        newBans.push({
          email: null,
          phone: p,
          reason: `device_fingerprint_threshold:${fp.slice(0, 16)}`,
          trigger_reason: "device_fingerprint_threshold",
          triggering_attempt_ids: ids,
        });
        banPhones.add(p);
      }
    }

    if (newBans.length > 0) {
      const { error: insertErr } = await admin.from("trial_ban_list").insert(newBans);
      if (insertErr) throw insertErr;
      result.bansCreated = newBans.length;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    console.error("trial-bans detector error:", err);
  }

  await admin.from("trial_ban_runs").insert({
    attempts_scanned: result.scanned,
    bans_created: result.bansCreated,
    duration_ms: Date.now() - startedAt,
    error: result.error ?? null,
  });

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    scanned: result.scanned,
    bans_created: result.bansCreated,
    error: result.error,
  });
}

// ── helpers ────────────────────────────────────────────────────────────

type Attempt = {
  id: string;
  email: string | null;
  phone: string | null;
  device_fingerprint: string | null;
  attempted_at: string;
};

type BanRow = {
  email: string | null;
  phone: string | null;
  reason: string;
  trigger_reason: string;
  triggering_attempt_ids: string[];
};

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v); else m.set(k, [v]);
}
function uniq<T>(xs: T[]): T[] { return Array.from(new Set(xs)); }

async function loadBannedSets(
  admin: ReturnType<typeof createAdminClient>
): Promise<[Set<string>, Set<string>]> {
  const { data: rows } = await admin
    .from("trial_ban_list")
    .select("email, phone");
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const r of (rows ?? []) as { email: string | null; phone: string | null }[]) {
    if (r.email) emails.add(r.email.toLowerCase().trim());
    if (r.phone) phones.add(r.phone.trim());
  }
  return [emails, phones];
}
