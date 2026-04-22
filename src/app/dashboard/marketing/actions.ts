"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resend } from "@/lib/email";
import { getCurrentBusiness } from "@/lib/current-site";
import { marketingUnsubUrl } from "@/lib/marketing-unsub";
import type { SupabaseClient } from "@supabase/supabase-js";

const FROM = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const DAILY_CAP_PER_PRO = 1000;
const PHYSICAL_ADDRESS =
  process.env.OYRB_MAILING_ADDRESS ??
  "OYRB · 2455 Paces Ferry Rd SE, Atlanta, GA 30339, USA";

export type Segment =
  | "all_opted_in"
  | "last_30"
  | "last_60"
  | "last_90"
  | "winback_30"
  | "winback_60"
  | "vip"
  | "manual"
  | "by_service";

type SendInput = {
  name: string;
  subject: string;
  body: string;
  segment: Segment;
  // When segment = manual | by_service, caller supplies explicit lists.
  clientIds?: string[];
  serviceId?: string | null;
};

type SendResult =
  | { ok: true; sent: number; suppressed: number; campaignId: string | null }
  | { ok: false; error: string };

// Eligibility gate the send action applies to EVERY candidate. Both
// conditions must be true:
//   · client.marketing_opt_in = true (this pro's per-client consent)
//   · communication_preferences.marketing_enabled != false AND
//     unsubscribed_at IS NULL (platform-wide consent)
async function filterEligible(
  admin: SupabaseClient,
  candidates: Array<{ id: string; email: string | null; name: string; marketing_opt_in?: boolean }>,
): Promise<{ eligible: Array<{ id: string; email: string; name: string }>; suppressed: number }> {
  const withOptIn = candidates.filter(
    (c): c is { id: string; email: string; name: string; marketing_opt_in: boolean } =>
      !!c.email && !!c.marketing_opt_in,
  );
  const emails = Array.from(new Set(withOptIn.map((c) => c.email.toLowerCase().trim())));
  if (emails.length === 0) {
    return { eligible: [], suppressed: candidates.length };
  }
  const { data: blocked } = await admin
    .from("communication_preferences")
    .select("email, marketing_enabled, unsubscribed_at")
    .in("email", emails);
  const blockedSet = new Set<string>(
    (blocked ?? [])
      .filter(
        (r: {
          email: string;
          marketing_enabled: boolean | null;
          unsubscribed_at: string | null;
        }) => r.marketing_enabled === false || !!r.unsubscribed_at,
      )
      .map((r: { email: string }) => r.email.toLowerCase().trim()),
  );
  const eligible = withOptIn.filter(
    (c) => !blockedSet.has(c.email.toLowerCase().trim()),
  );
  return {
    eligible,
    suppressed: candidates.length - eligible.length,
  };
}

async function resolveCandidates(
  admin: SupabaseClient,
  businessId: string,
  input: Pick<SendInput, "segment" | "clientIds" | "serviceId">,
): Promise<Array<{ id: string; email: string | null; name: string; marketing_opt_in?: boolean }>> {
  if (input.segment === "manual") {
    if (!input.clientIds || input.clientIds.length === 0) return [];
    const { data } = await admin
      .from("clients")
      .select("id, email, name, marketing_opt_in")
      .eq("business_id", businessId)
      .in("id", input.clientIds);
    return (data ?? []) as Array<{
      id: string;
      email: string | null;
      name: string;
      marketing_opt_in?: boolean;
    }>;
  }

  if (input.segment === "by_service") {
    if (!input.serviceId) return [];
    const { data: bookings } = await admin
      .from("bookings")
      .select("client_id")
      .eq("business_id", businessId)
      .eq("service_id", input.serviceId)
      .not("client_id", "is", null);
    const clientIds = Array.from(
      new Set((bookings ?? []).map((b: { client_id: string }) => b.client_id)),
    );
    if (clientIds.length === 0) return [];
    const { data } = await admin
      .from("clients")
      .select("id, email, name, marketing_opt_in")
      .eq("business_id", businessId)
      .in("id", clientIds);
    return (data ?? []) as Array<{
      id: string;
      email: string | null;
      name: string;
      marketing_opt_in?: boolean;
    }>;
  }

  if (input.segment === "vip") {
    const { data: allClients } = await admin
      .from("clients")
      .select("id, email, name, marketing_opt_in")
      .eq("business_id", businessId);
    const ids = (allClients ?? []).map((c: { id: string }) => c.id);
    if (ids.length === 0) return [];
    const { data: bookings } = await admin
      .from("bookings")
      .select("client_id, status, services(price_cents)")
      .in("client_id", ids)
      .neq("status", "cancelled");
    const totalByClient = new Map<string, number>();
    for (const b of (bookings ?? []) as Array<{
      client_id: string;
      services: { price_cents: number } | { price_cents: number }[] | null;
    }>) {
      const svc = Array.isArray(b.services) ? b.services[0] : b.services;
      totalByClient.set(
        b.client_id,
        (totalByClient.get(b.client_id) ?? 0) + (svc?.price_cents ?? 0),
      );
    }
    const ranked = (allClients ?? [])
      .map((c: { id: string }) => ({ c, total: totalByClient.get(c.id) ?? 0 }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    const takeCount = Math.max(1, Math.floor(ranked.length * 0.1));
    return ranked.slice(0, takeCount).map((r) => r.c) as Array<{
      id: string;
      email: string | null;
      name: string;
      marketing_opt_in?: boolean;
    }>;
  }

  // Time-based segments: last_N vs winback_N.
  const now = Date.now();
  let isWinback = false;
  let daysWindow = 0;
  if (input.segment === "last_30") { daysWindow = 30; isWinback = false; }
  if (input.segment === "last_60") { daysWindow = 60; isWinback = false; }
  if (input.segment === "last_90") { daysWindow = 90; isWinback = false; }
  if (input.segment === "winback_30") { daysWindow = 30; isWinback = true; }
  if (input.segment === "winback_60") { daysWindow = 60; isWinback = true; }

  const cutoff = new Date(now - daysWindow * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentBookings } = await admin
    .from("bookings")
    .select("client_id")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .gte("start_at", cutoff);
  const recentIds = new Set(
    (recentBookings ?? []).map((b: { client_id: string }) => b.client_id),
  );

  const { data: allClients } = await admin
    .from("clients")
    .select("id, email, name, marketing_opt_in")
    .eq("business_id", businessId);
  const pool = (allClients ?? []) as Array<{
    id: string;
    email: string | null;
    name: string;
    marketing_opt_in?: boolean;
  }>;

  if (input.segment === "all_opted_in") return pool;
  if (isWinback) return pool.filter((c) => !recentIds.has(c.id));
  return pool.filter((c) => recentIds.has(c.id));
}

export async function previewRecipientCount(input: {
  segment: Segment;
  clientIds?: string[];
  serviceId?: string | null;
}): Promise<{ eligible: number; total: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { eligible: 0, total: 0 };
  const biz = await getCurrentBusiness();
  if (!biz) return { eligible: 0, total: 0 };
  const admin = createAdminClient();
  const candidates = await resolveCandidates(admin, biz.id, input);
  const { eligible } = await filterEligible(admin, candidates);
  return { eligible: eligible.length, total: candidates.length };
}

export async function sendCampaign(formData: FormData): Promise<SendResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const biz = await getCurrentBusiness();
  if (!biz) return { ok: false, error: "No business found" };

  const name = (formData.get("name") as string)?.trim() || "Untitled campaign";
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const segment = ((formData.get("segment") as string) ?? "all_opted_in") as Segment;
  const clientIdsRaw = (formData.get("client_ids") as string) ?? "";
  const clientIds = clientIdsRaw ? clientIdsRaw.split(",").filter(Boolean) : undefined;
  const serviceId = (formData.get("service_id") as string) || null;

  if (!subject || !body) return { ok: false, error: "Subject and body required." };
  if (subject.length > 160) return { ok: false, error: "Subject is too long (160 char max)." };

  const admin = createAdminClient();

  // Daily rate limit per pro. Aggregated off the campaigns table.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayCampaigns } = await admin
    .from("email_campaigns")
    .select("recipient_count")
    .eq("pro_user_id", user.id)
    .gte("sent_at", today.toISOString());
  const sentToday = (todayCampaigns ?? []).reduce(
    (s: number, c: { recipient_count: number | null }) => s + (c.recipient_count ?? 0),
    0,
  );
  if (sentToday >= DAILY_CAP_PER_PRO) {
    return {
      ok: false,
      error: `Daily limit of ${DAILY_CAP_PER_PRO} marketing emails reached. Try again tomorrow.`,
    };
  }

  const candidates = await resolveCandidates(admin, biz.id, { segment, clientIds, serviceId });
  if (candidates.length === 0) {
    return { ok: false, error: "No recipients match this segment." };
  }

  const { eligible, suppressed } = await filterEligible(admin, candidates);
  if (eligible.length === 0) {
    return {
      ok: false,
      error: `No recipients match after opt-in checks. ${suppressed} suppressed — they either never opted in or have unsubscribed.`,
    };
  }
  if (sentToday + eligible.length > DAILY_CAP_PER_PRO) {
    return {
      ok: false,
      error: `Sending ${eligible.length} would exceed today's limit (${DAILY_CAP_PER_PRO}). ${DAILY_CAP_PER_PRO - sentToday} remaining today.`,
    };
  }

  if (!resend) return { ok: false, error: "Email service not configured." };

  // Audit row first (draft) so a partial failure is still visible.
  const { data: campaignRow } = await admin
    .from("email_campaigns")
    .insert({
      business_id: biz.id,
      pro_user_id: user.id,
      name,
      subject,
      body,
      segment,
      recipient_count: 0,
      status: "draft",
      is_admin_send: false,
    })
    .select("id")
    .single();
  const campaignId = (campaignRow?.id as string | undefined) ?? null;

  let sent = 0;
  let failed = 0;
  for (const r of eligible) {
    const personalized = body.replace(/\{\{name\}\}/gi, r.name || "there");
    const unsubUrl = marketingUnsubUrl(r.email);
    try {
      await resend.emails.send({
        from: FROM,
        to: r.email,
        subject,
        html: wrapMarketingHtml({
          subject,
          body: personalized,
          businessName: biz.business_name,
          unsubUrl,
          physicalAddress: PHYSICAL_ADDRESS,
        }),
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      sent++;
      if (campaignId) {
        await admin.from("marketing_send_log").insert({
          campaign_id: campaignId,
          pro_user_id: user.id,
          recipient_email: r.email,
          subject_at_send: subject,
        });
      }
    } catch (err) {
      failed++;
      console.error("Marketing email send failed:", r.email, err);
    }
  }

  if (campaignId) {
    await admin
      .from("email_campaigns")
      .update({
        recipient_count: sent,
        status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  revalidatePath("/dashboard/marketing");
  return { ok: true, sent, suppressed, campaignId };
}

function wrapMarketingHtml(p: {
  subject: string;
  body: string;
  businessName: string;
  unsubUrl: string;
  physicalAddress: string;
}): string {
  const html = p.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${escape(p.subject)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#525252;">${html}</div>
      <p style="color:#A3A3A3;font-size:11px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;line-height:1.6;">
        You're receiving this because you opted in to hear from ${escape(p.businessName)} via OYRB.
        <br>
        <a href="${p.unsubUrl}" style="color:#A3A3A3;">Unsubscribe from all marketing emails</a>
        · <a href="https://www.oyrb.space/privacy" style="color:#A3A3A3;">Privacy</a>
        <br>
        ${escape(p.physicalAddress)}
      </p>
    </div>
  `;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
