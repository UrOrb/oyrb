import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/email";
import { getFromAddress, EmailPurpose } from "@/lib/email-from";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getAccountSummary } from "@/lib/account";
import { deriveStatus, type ConnectStatus } from "@/lib/stripe-connect";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Pro-facing "Contact Support" submit endpoint. Auth-gated. Builds an
 * email to the right OYRB inbox alias based on `category`, with the pro's
 * email set as Reply-To so a hit-reply in Zoho lands directly in their
 * inbox. Optional screenshot is attached.
 *
 * PII boundary: mirrors the help-chat — only business-level facts go in
 * the body. No client names, booking ids, or customer details.
 */

const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Category = "booking" | "payment" | "account" | "feedback" | "other";

const CATEGORY_LABEL: Record<Category, string> = {
  booking: "Booking issue",
  payment: "Payment / Billing",
  account: "Account help",
  feedback: "Feedback / Suggestion",
  other: "Something else",
};

// Each category routes to the inbox alias matching that traffic type.
// "other" lands at support@ — the catch-all manned by the team.
const PURPOSE_BY_CATEGORY: Record<Category, EmailPurpose> = {
  booking: EmailPurpose.BOOKING,
  payment: EmailPurpose.PAYMENT,
  account: EmailPurpose.ACCOUNT,
  feedback: EmailPurpose.FEEDBACK,
  other: EmailPurpose.SUPPORT,
};

const STATUS_LABEL: Record<ConnectStatus, string> = {
  not_connected: "not connected",
  onboarding_incomplete: "onboarding incomplete",
  restricted: "restricted",
  ready: "ready",
};

function isCategory(v: unknown): v is Category {
  return (
    typeof v === "string" &&
    (v === "booking" || v === "payment" || v === "account" || v === "feedback" || v === "other")
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  // Auth gate.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Per-user hourly cap. Generous enough that a real frustrated user can
  // submit follow-ups, tight enough to neutralise an automated form-spam
  // loop targeting the contact endpoint.
  const limit = rateLimit(`support:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          "You've sent a lot of support messages in the last hour. If we haven't replied yet, sit tight — we'll be in touch.",
      },
      { status: 429 },
    );
  }

  if (!resend) {
    return NextResponse.json(
      { error: "Support email is not configured. Email us directly at support@oyrb.space." },
      { status: 503 },
    );
  }

  // Parse multipart — the form posts FormData so a binary screenshot
  // doesn't have to round-trip through base64.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const categoryRaw = form.get("category");
  const messageRaw = form.get("message");
  const screenshotRaw = form.get("screenshot");

  if (!isCategory(categoryRaw)) {
    return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  }
  const category: Category = categoryRaw;

  if (typeof messageRaw !== "string") {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const message = messageRaw.trim();
  if (message.length < MIN_MESSAGE) {
    return NextResponse.json(
      { error: `Add a few more details — at least ${MIN_MESSAGE} characters.` },
      { status: 400 },
    );
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Trim your message to ${MAX_MESSAGE} characters or fewer.` },
      { status: 400 },
    );
  }

  // Optional screenshot — image/* only, max 5 MB.
  let attachment: { filename: string; content: Buffer } | null = null;
  if (screenshotRaw && screenshotRaw instanceof File && screenshotRaw.size > 0) {
    if (!screenshotRaw.type.startsWith("image/")) {
      return NextResponse.json({ error: "Screenshot must be an image." }, { status: 400 });
    }
    if (screenshotRaw.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Screenshot is too large (max 5 MB)." },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await screenshotRaw.arrayBuffer());
    attachment = {
      filename: screenshotRaw.name || "screenshot.png",
      content: buf,
    };
  }

  // Pro context — business-level only. Mirrors what help-chat exposes:
  // business name, tier, Connect status. No client/booking PII.
  const business = await getCurrentBusiness();
  const summary = await getAccountSummary();
  let connectStatus: ConnectStatus | null = null;
  if (business) {
    connectStatus = deriveStatus({
      stripe_connect_account_id: business.stripe_connect_account_id,
      stripe_connect_details_submitted: business.stripe_connect_details_submitted,
      stripe_connect_charges_enabled: business.stripe_connect_charges_enabled,
      stripe_connect_requirements_currently_due:
        business.stripe_connect_requirements_currently_due,
    }).status;
  }

  const businessName = business?.business_name ?? "(no business set up yet)";
  const tier = summary?.subscription?.tier ?? null;
  const subStatus = summary?.subscription?.status ?? null;
  const proEmail = user.email ?? "(no email on file)";
  const userId = user.id;
  const categoryLabel = CATEGORY_LABEL[category];

  const subject = `[${categoryLabel}] support request from ${businessName}`;
  const recipient = getFromAddress(PURPOSE_BY_CATEGORY[category]);
  const fromAddress = getFromAddress(EmailPurpose.SUPPORT);

  const text = [
    `Category: ${categoryLabel}`,
    `Business: ${businessName}`,
    `Pro email: ${proEmail}`,
    `User ID: ${userId}`,
    `Subscription: ${tier ?? "(none)"}${subStatus ? ` (${subStatus})` : ""}`,
    `Stripe Connect: ${connectStatus ? STATUS_LABEL[connectStatus] : "(unknown)"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0A0A0A;">
      <p style="color:#B8896B;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;">Support request · ${escapeHtml(categoryLabel)}</p>
      <h1 style="font-size:18px;font-weight:600;margin:0 0 16px;">${escapeHtml(businessName)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E7E5E4;border-radius:8px;background:#FAFAF9;margin:0 0 20px;font-size:13px;">
        <tr><td style="padding:10px 14px;color:#737373;width:140px;">Pro email</td><td style="padding:10px 14px;"><a href="mailto:${escapeHtml(proEmail)}" style="color:#0A0A0A;">${escapeHtml(proEmail)}</a></td></tr>
        <tr><td style="padding:10px 14px;color:#737373;border-top:1px solid #F0EFEC;">User ID</td><td style="padding:10px 14px;border-top:1px solid #F0EFEC;font-family:monospace;font-size:12px;">${escapeHtml(userId)}</td></tr>
        <tr><td style="padding:10px 14px;color:#737373;border-top:1px solid #F0EFEC;">Subscription</td><td style="padding:10px 14px;border-top:1px solid #F0EFEC;">${escapeHtml(tier ?? "(none)")}${subStatus ? ` <span style="color:#737373;">(${escapeHtml(subStatus)})</span>` : ""}</td></tr>
        <tr><td style="padding:10px 14px;color:#737373;border-top:1px solid #F0EFEC;">Stripe Connect</td><td style="padding:10px 14px;border-top:1px solid #F0EFEC;">${escapeHtml(connectStatus ? STATUS_LABEL[connectStatus] : "(unknown)")}</td></tr>
      </table>
      <h2 style="font-size:13px;font-weight:600;color:#737373;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">Message</h2>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.55;border-left:3px solid #B8896B;padding:4px 0 4px 14px;color:#0A0A0A;">${escapeHtml(message)}</div>
      <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:14px;">Reply to this email to respond directly to the pro — Reply-To is set to their account email.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: recipient,
      replyTo: proEmail,
      subject,
      text,
      html,
      ...(attachment ? { attachments: [attachment] } : {}),
    });
  } catch (err) {
    console.error("Support form send failed:", err);
    return NextResponse.json(
      { error: "We couldn't send your message — try again, or email support@oyrb.space directly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
