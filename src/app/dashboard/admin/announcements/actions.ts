"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { resend } from "@/lib/email";
import { marketingUnsubUrl } from "@/lib/marketing-unsub";
import { revalidatePath } from "next/cache";

const FROM = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const DAILY_CAP_PLATFORM = 10_000;
const PHYSICAL_ADDRESS =
  process.env.OYRB_MAILING_ADDRESS ??
  "OYRB · 2455 Paces Ferry Rd SE, Atlanta, GA 30339, USA";

export type AdminAudience =
  | "all_pros"             // every pro on the platform
  | "tier_starter"
  | "tier_studio"
  | "tier_scale"
  | "by_region";           // future — needs pro address data

export type SendAnnouncementResult =
  | { ok: true; sent: number; suppressed: number }
  | { ok: false; error: string };

async function resolveRecipients(
  audience: AdminAudience,
  regionStateFilter: string | null,
): Promise<Array<{ email: string; name: string }>> {
  const admin = createAdminClient();
  // For pro audience: use auth.users + businesses join. Filter by
  // subscription tier or state when requested.
  let q = admin.from("businesses").select(`
    id, owner_id, contact_email, business_name, subscription_tier, state,
    accounts:account_subscriptions(tier)
  `);

  if (audience === "tier_starter") q = q.eq("subscription_tier", "starter");
  if (audience === "tier_studio")  q = q.eq("subscription_tier", "studio");
  if (audience === "tier_scale")   q = q.eq("subscription_tier", "scale");
  if (audience === "by_region" && regionStateFilter) {
    q = q.ilike("state", regionStateFilter.trim());
  }

  const { data } = await q;

  const out: Array<{ email: string; name: string }> = [];
  for (const b of (data ?? []) as Array<{
    owner_id: string;
    contact_email: string | null;
    business_name: string;
  }>) {
    let email = b.contact_email;
    if (!email) {
      const { data: auth } = await admin.auth.admin.getUserById(b.owner_id);
      email = auth?.user?.email ?? null;
    }
    if (email) out.push({ email, name: b.business_name });
  }
  // Dedupe by email — a pro with multiple businesses only gets one copy.
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = r.email.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function sendAnnouncement(formData: FormData): Promise<SendAnnouncementResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const audience = ((formData.get("audience") as string) ?? "all_pros") as AdminAudience;
  const regionState = (formData.get("region_state") as string)?.trim() || null;

  if (!subject || !body) return { ok: false, error: "Subject and body required." };

  const admin = createAdminClient();

  // Today's sent count across admin campaigns (separate cap from pro
  // campaigns). Pulled from email_campaigns where is_admin_send=true.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayAdmin } = await admin
    .from("email_campaigns")
    .select("recipient_count")
    .eq("is_admin_send", true)
    .gte("sent_at", today.toISOString());
  const sentToday = (todayAdmin ?? []).reduce(
    (s: number, c: { recipient_count: number | null }) => s + (c.recipient_count ?? 0),
    0,
  );
  if (sentToday >= DAILY_CAP_PLATFORM) {
    return {
      ok: false,
      error: `Platform daily cap of ${DAILY_CAP_PLATFORM} reached.`,
    };
  }

  const recipients = await resolveRecipients(audience, regionState);
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients match this audience." };
  }

  // Honor global unsubscribe from the communication_preferences table —
  // even platform-wide announcements respect opt-out.
  const emails = recipients.map((r) => r.email.toLowerCase().trim());
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
  const eligible = recipients.filter((r) => !blockedSet.has(r.email.toLowerCase().trim()));
  const suppressed = recipients.length - eligible.length;

  if (eligible.length === 0) {
    return {
      ok: false,
      error: `No recipients after suppression. ${suppressed} are platform-wide unsubscribed.`,
    };
  }

  if (sentToday + eligible.length > DAILY_CAP_PLATFORM) {
    return {
      ok: false,
      error: `Would exceed platform cap (${DAILY_CAP_PLATFORM}). ${DAILY_CAP_PLATFORM - sentToday} left today.`,
    };
  }

  if (!resend) return { ok: false, error: "Email service not configured." };

  const { data: campaignRow } = await admin
    .from("email_campaigns")
    .insert({
      business_id: null,
      pro_user_id: gate.user.id,
      name: `Admin: ${subject.slice(0, 80)}`,
      subject,
      body,
      segment: audience,
      recipient_count: 0,
      status: "draft",
      is_admin_send: true,
    })
    .select("id")
    .single();
  const campaignId = (campaignRow?.id as string | undefined) ?? null;

  let sent = 0;
  let failed = 0;
  for (const r of eligible) {
    const unsubUrl = marketingUnsubUrl(r.email);
    try {
      await resend.emails.send({
        from: FROM,
        to: r.email,
        subject,
        html: wrapAnnouncementHtml({
          subject,
          body: body.replace(/\{\{name\}\}/gi, r.name || "there"),
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
          pro_user_id: gate.user.id,
          recipient_email: r.email,
          subject_at_send: subject,
        });
      }
    } catch (err) {
      failed++;
      console.error("Admin announcement send failed:", r.email, err);
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

  revalidatePath("/dashboard/admin/announcements");
  return { ok: true, sent, suppressed };
}

function wrapAnnouncementHtml(p: {
  subject: string;
  body: string;
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
      <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">OYRB announcement</p>
      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${escape(p.subject)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#525252;">${html}</div>
      <p style="color:#A3A3A3;font-size:11px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;line-height:1.6;">
        You&rsquo;re receiving this because you&rsquo;re an OYRB pro.
        <br>
        <a href="${p.unsubUrl}" style="color:#A3A3A3;">Unsubscribe from OYRB announcements</a>
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
