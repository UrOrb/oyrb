import { randomBytes } from "crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email";
import { formatCents } from "@/lib/types";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

/**
 * Generate a gift-card code in the form OYRB-XXXX-XXXX-XXXX. Uppercase
 * A-Z / 0-9 minus I/O/0/1 so codes read cleanly written on paper or
 * typed manually. 12 random chars → ~62 bits of entropy, plenty for a
 * small allowlist of pros.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars (drops I/O/0/1)
function chunk(raw: string, size: number): string {
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += size) out.push(raw.slice(i, i + size));
  return out.join("-");
}
export function generateGiftCardCode(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `OYRB-${chunk(out, 4)}`;
}

/**
 * Handles checkout.session.completed where metadata.booking_type="gift_card".
 * Idempotent via gift_cards.stripe_session_id (unique index).
 */
export async function handleGiftCardCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const m = session.metadata ?? {};
  const businessId = m.business_id;
  const proUserId = m.pro_user_id;
  if (!businessId || !proUserId) {
    console.error("gift_card webhook missing metadata:", session.id);
    return;
  }

  // Idempotency: short-circuit if the same session already produced a row.
  const { data: existing } = await supabase
    .from("gift_cards")
    .select("id, code")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  const amountCents = session.amount_total ?? Number(m.amount_cents ?? 0);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Generate code; retry if we somehow collide with an existing one.
  let code = generateGiftCardCode();
  for (let i = 0; i < 3; i++) {
    const { data: clash } = await supabase
      .from("gift_cards")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
    code = generateGiftCardCode();
  }

  const { data: inserted, error: insErr } = await supabase
    .from("gift_cards")
    .insert({
      code,
      pro_user_id: proUserId,
      business_id: businessId,
      amount_cents: amountCents,
      purchased_by_name: m.buyer_name || null,
      purchased_by_email: m.buyer_email,
      recipient_name: m.recipient_name || null,
      recipient_email: m.recipient_email || null,
      message: m.message || null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select("id, code, amount_cents")
    .maybeSingle();
  if (insErr || !inserted) {
    console.error("gift_card insert failed:", insErr);
    return;
  }

  // Load business for the email copy — we don't trust metadata for the name.
  const { data: biz } = await supabase
    .from("businesses")
    .select("business_name, slug, contact_email")
    .eq("id", businessId)
    .maybeSingle();
  const businessName = (biz?.business_name as string | undefined) ?? "your pro";
  const siteUrl = biz?.slug ? `${APP_URL}/s/${biz.slug}` : APP_URL;

  if (!resend) return;

  // 1. Buyer receipt + code. If the buyer is also the recipient this is
  //    the only email that goes out (no separate "gifted" note).
  if (m.buyer_email) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: m.buyer_email,
      subject: `Your ${formatCents(amountCents)} gift card for ${businessName}`,
      html: giftBuyerHtml({
        buyerName: m.buyer_name || "there",
        code: inserted.code as string,
        amountCents,
        businessName,
        siteUrl,
        recipientName: m.recipient_name || null,
      }),
    }).catch((e) => console.error("Gift card buyer email failed:", e));
  }

  // 2. If the buyer bought on someone else's behalf, email the recipient
  //    directly with the code + personal message.
  if (m.recipient_email && m.recipient_email !== m.buyer_email) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: m.recipient_email,
      subject: `${m.buyer_name || "Someone"} sent you a gift card to ${businessName}`,
      html: giftRecipientHtml({
        recipientName: m.recipient_name || "there",
        buyerName: m.buyer_name || "A friend",
        code: inserted.code as string,
        amountCents,
        businessName,
        siteUrl,
        message: m.message || null,
      }),
    }).catch((e) => console.error("Gift card recipient email failed:", e));
  }

  // 3. Notify the pro.
  const ownerEmail = await resolveOwnerEmail(supabase, proUserId, biz?.contact_email ?? null);
  if (ownerEmail) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `🎁 A gift card for ${formatCents(amountCents)} was just purchased`,
      html: giftProHtml({
        amountCents,
        buyerName: m.buyer_name || "Someone",
        buyerEmail: m.buyer_email || "",
        recipientName: m.recipient_name || null,
        recipientEmail: m.recipient_email || null,
        code: inserted.code as string,
      }),
    }).catch((e) => console.error("Gift card pro email failed:", e));
  }
}

async function resolveOwnerEmail(
  supabase: SupabaseClient,
  proUserId: string,
  fallback: string | null,
): Promise<string | null> {
  if (fallback) return fallback;
  const { data: auth } = await supabase.auth.admin.getUserById(proUserId);
  return auth?.user?.email ?? null;
}

function giftBuyerHtml(p: {
  buyerName: string;
  code: string;
  amountCents: number;
  businessName: string;
  siteUrl: string;
  recipientName: string | null;
}): string {
  const toLine = p.recipientName
    ? `Your gift card for <strong>${escape(p.recipientName)}</strong> is below — forward this email to them.`
    : `Your gift card is below. Use the code at checkout when you book.`;
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
      <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Gift card receipt</p>
      <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Thanks, ${escape(p.buyerName)}!</h1>
      <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 16px;">${toLine}</p>
      <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Amount</p>
        <p style="margin:4px 0 14px;font-size:28px;font-weight:600;">${formatCents(p.amountCents)}</p>
        <p style="margin:0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Code</p>
        <p style="margin:4px 0 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px;">${escape(p.code)}</p>
      </div>
      <a href="${p.siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Visit ${escape(p.businessName)}</a>
      <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">Keep this email as your receipt. Codes don't expire but are valid only at ${escape(p.businessName)}.</p>
    </div>
  `;
}

function giftRecipientHtml(p: {
  recipientName: string;
  buyerName: string;
  code: string;
  amountCents: number;
  businessName: string;
  siteUrl: string;
  message: string | null;
}): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
      <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">You received a gift</p>
      <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Hi ${escape(p.recipientName)} — a gift from ${escape(p.buyerName)}.</h1>
      ${p.message ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #B8896B;background:#FAFAF9;color:#525252;font-style:italic;">${escape(p.message)}</blockquote>` : ""}
      <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Gift card</p>
        <p style="margin:4px 0 14px;font-size:28px;font-weight:600;">${formatCents(p.amountCents)}</p>
        <p style="margin:0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Code</p>
        <p style="margin:4px 0 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px;">${escape(p.code)}</p>
      </div>
      <a href="${p.siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Book at ${escape(p.businessName)}</a>
      <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">Redeem your code during booking at ${escape(p.businessName)}. Codes don't expire.</p>
    </div>
  `;
}

function giftProHtml(p: {
  amountCents: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  code: string;
}): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
      <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Gift card sold</p>
      <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">A gift card for ${formatCents(p.amountCents)} was just purchased.</h1>
      <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Buyer</p>
        <p style="margin:0 0 10px;font-size:14px;font-weight:600;">${escape(p.buyerName)}${p.buyerEmail ? ` · ${escape(p.buyerEmail)}` : ""}</p>
        ${p.recipientName || p.recipientEmail ? `
          <p style="margin:10px 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Recipient</p>
          <p style="margin:0 0 10px;font-size:14px;font-weight:600;">${escape(p.recipientName || "—")}${p.recipientEmail ? ` · ${escape(p.recipientEmail)}` : ""}</p>
        ` : ""}
        <p style="margin:10px 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Code</p>
        <p style="margin:0;font-family:'SFMono-Regular',Consolas,monospace;font-size:14px;font-weight:700;letter-spacing:1.5px;">${escape(p.code)}</p>
      </div>
      <p style="color:#525252;font-size:14px;margin:0 0 16px;">Payout lands in your Stripe account on the usual schedule. In Phase 1 you manually track redemption — when the code is used, mark the booking as paid/partial accordingly.</p>
      <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
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
