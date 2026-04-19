import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email";

const FROM = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

export async function POST(request: NextRequest) {
  let body: {
    slug?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    photos?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const name = (body.name ?? "").trim().slice(0, 100);
  const email = (body.email ?? "").trim().slice(0, 150);
  const phone = (body.phone ?? "").trim().slice(0, 30);
  const message = (body.message ?? "").trim().slice(0, 1200);
  const photos = Array.isArray(body.photos) ? body.photos.filter((x) => typeof x === "string").slice(0, 3) : [];

  if (!slug || !name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, business_name, contact_email, owner_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Insert into inquiries table
  const { error: insertError } = await supabase.from("inquiries").insert({
    business_id: biz.id,
    client_name: name,
    client_email: email,
    client_phone: phone || null,
    message,
    photos_json: photos,
  });

  if (insertError) {
    // If table doesn't exist yet (migration not applied), fail gracefully
    console.error("Inquiry insert error:", insertError);
    return NextResponse.json(
      { error: "Inquiry system not yet enabled. Please book directly or contact the business." },
      { status: 503 }
    );
  }

  // Look up owner's email via auth admin
  let toEmail = biz.contact_email ?? null;
  if (!toEmail) {
    const { data: ownerData } = await supabase.auth.admin.getUserById(biz.owner_id);
    toEmail = ownerData?.user?.email ?? null;
  }

  // Email the pro
  if (resend && toEmail) {
    const photoHtml = photos.length
      ? `<div style="margin:16px 0;"><p style="margin:0 0 6px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Attached photos</p>${photos
          .map((u) => `<img src="${u}" alt="" style="max-width:180px;max-height:180px;border-radius:8px;margin:4px;border:1px solid #E7E5E4;" />`)
          .join("")}</div>`
      : "";
    try {
      await resend.emails.send({
        from: FROM,
        to: toEmail,
        replyTo: email,
        subject: `New inquiry from ${name} — ${biz.business_name}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
            <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">New inquiry</p>
            <h1 style="font-size:22px;font-weight:600;margin:0 0 8px;">${name} has a question</h1>
            <p style="color:#525252;font-size:14px;margin:0 0 16px;">They sent you a pre-booking question. Reply to this email to respond — it goes straight to ${name}.</p>
            <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:10px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Message</p>
              <p style="margin:0;font-size:14px;white-space:pre-wrap;">${message.replace(/</g, "&lt;")}</p>
            </div>
            ${photoHtml}
            <p style="color:#737373;font-size:13px;margin:16px 0 0;"><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}${phone ? `<br><strong>Phone:</strong> ${phone}` : ""}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Inquiry email failed:", err);
      // Still return success since the DB row was created
    }
  }

  return NextResponse.json({ success: true });
}
