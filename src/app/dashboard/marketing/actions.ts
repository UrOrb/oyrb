"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resend } from "@/lib/email";
import { getCurrentBusiness } from "@/lib/current-site";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

type SendResult = { error?: string; success?: boolean; sent?: number };

export async function sendCampaign(formData: FormData): Promise<SendResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const biz = await getCurrentBusiness();
  if (!biz) return { error: "No business found" };

  const name = (formData.get("name") as string)?.trim() || "Untitled campaign";
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const segment = (formData.get("segment") as string) || "all";

  if (!subject || !body) return { error: "Subject and body required." };

  // Pick recipients based on segment
  const admin = createAdminClient();
  let daysAgo = 0;
  if (segment === "winback_30") daysAgo = 30;
  if (segment === "winback_60") daysAgo = 60;
  if (segment === "winback_90") daysAgo = 90;

  let query = admin
    .from("clients")
    .select("id, name, email")
    .eq("business_id", biz.id)
    .not("email", "is", null);

  if (daysAgo > 0) {
    // Find clients whose LATEST booking is older than N days ago, OR who have never booked
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    // Get clients with a booking more recent than cutoff — exclude them
    const { data: recentClients } = await admin
      .from("bookings")
      .select("client_id")
      .eq("business_id", biz.id)
      .gte("start_at", cutoff);
    const recentIds = new Set((recentClients ?? []).map((r: { client_id: string }) => r.client_id));
    const { data: allClients } = await query;
    const recipients = (allClients ?? []).filter((c: { id: string; email: string | null }) =>
      c.email && !recentIds.has(c.id)
    );
    return await fireEmails(biz.id, name, subject, body, segment, recipients as Array<{ id: string; name: string; email: string }>);
  }

  const { data: clients } = await query;
  const recipients = (clients ?? []).filter((c: { email: string | null }) => !!c.email) as Array<{ id: string; name: string; email: string }>;
  return await fireEmails(biz.id, name, subject, body, segment, recipients);
}

async function fireEmails(
  businessId: string,
  campaignName: string,
  subject: string,
  body: string,
  segment: string,
  recipients: Array<{ id: string; name: string; email: string }>
): Promise<SendResult> {
  if (recipients.length === 0) {
    return { error: "No recipients match this segment." };
  }

  if (!resend) {
    return { error: "Email service not configured." };
  }

  // Send in batches (Resend allows batch up to 100 at a time)
  const admin = createAdminClient();
  let sent = 0;

  for (const r of recipients) {
    const personalized = body.replace(/\{\{name\}\}/gi, r.name || "there");
    try {
      await resend.emails.send({
        from: FROM,
        to: r.email,
        subject,
        html: wrapHtml(subject, personalized),
      });
      sent++;
    } catch (err) {
      console.error("Marketing email failed:", r.email, err);
    }
  }

  // Record the campaign
  await admin.from("email_campaigns").insert({
    business_id: businessId,
    name: campaignName,
    subject,
    body,
    segment,
    recipient_count: sent,
  });

  revalidatePath("/dashboard/marketing");
  return { success: true, sent };
}

function wrapHtml(subject: string, body: string) {
  // Convert \n to <br>, escape simple HTML
  const html = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${subject}</h1>
      <div style="font-size:15px;line-height:1.6;color:#525252;">${html}</div>
      <p style="color:#A3A3A3;font-size:12px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">Sent via OYRB · <a href="mailto:support@oyrb.space" style="color:#A3A3A3;">unsubscribe</a></p>
    </div>
  `;
}
