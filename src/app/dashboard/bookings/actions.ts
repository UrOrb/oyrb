"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/current-site";
import { checkBookingOverlap } from "@/lib/booking-overlap";
import { notifyBookingConfirmed } from "@/lib/booking-notify";
import { formatCents } from "@/lib/types";

type ActionResult = { error: string } | { success: true };

export async function createManualBooking(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const business = await getCurrentBusiness();
  if (!business) return { error: "No business found" };

  const serviceId = ((formData.get("service_id") as string) ?? "").trim();
  const date = ((formData.get("date") as string) ?? "").trim();
  const time = ((formData.get("time") as string) ?? "").trim();
  const clientName = ((formData.get("client_name") as string) ?? "").trim();
  const clientEmailRaw = ((formData.get("client_email") as string) ?? "").trim();
  const clientPhone = ((formData.get("client_phone") as string) ?? "").trim() || null;
  const skipNotifications = formData.get("skip_notifications") === "on";

  if (!serviceId || !date || !time || !clientName) {
    return { error: "Service, date, time, and client name are required." };
  }

  const clientEmail = clientEmailRaw ? clientEmailRaw.toLowerCase() : null;

  const { data: businessRow } = await supabase
    .from("businesses")
    .select(
      "id, business_name, slug, contact_email, owner_id, subscription_tier, break_between_appointments_minutes",
    )
    .eq("id", business.id)
    .maybeSingle();
  if (!businessRow) return { error: "Business not found." };

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .eq("active", true)
    .maybeSingle();
  if (!service) return { error: "Service not found." };

  // Browser submits date + time in the user's local interpretation; treating
  // it as a naive ISO local string lets JS parse into a Date in the server's
  // resolved timezone. Cross-TZ correctness would need an explicit business
  // timezone — punted to a future phase.
  const startAt = new Date(`${date}T${time}`);
  if (isNaN(startAt.getTime())) return { error: "Invalid date or time." };

  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  // last_minute_cutoff_hours intentionally NOT enforced — pros need to log
  // walk-ins and same-day phone bookings.
  const breakMinutes =
    (businessRow as { break_between_appointments_minutes?: number })
      .break_between_appointments_minutes ?? 15;

  const result = await checkBookingOverlap(supabase, business.id, startAt, endAt, breakMinutes);
  if (!result.ok) {
    const c = result.conflict;
    const conflictTime = c.startAt.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const who = c.clientName ?? "another booking";
    return { error: `Time conflict — overlaps with ${who} at ${conflictTime}` };
  }

  // Upsert client by email when provided; otherwise create a phone-only
  // (or name-only) client row. Mirrors the public route's client handling.
  let clientId: string | null = null;
  if (clientEmail) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("business_id", business.id)
      .ilike("email", clientEmail)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
      await supabase
        .from("clients")
        .update({ name: clientName, phone: clientPhone })
        .eq("id", clientId);
    } else {
      const { data: created } = await supabase
        .from("clients")
        .insert({
          business_id: business.id,
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  } else {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        business_id: business.id,
        name: clientName,
        email: null,
        phone: clientPhone,
      })
      .select("id")
      .single();
    clientId = created?.id ?? null;
  }

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      business_id: business.id,
      client_id: clientId,
      service_id: service.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();
  if (bookingErr || !booking) {
    return { error: bookingErr?.message ?? "Failed to create booking" };
  }

  // Notifications: client confirmation only. The pro just typed this in
  // themselves, so an owner-notification email would be redundant.
  if (!skipNotifications && clientEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";
    const siteUrl = `${appUrl}/s/${businessRow.slug}`;
    const priceLabel = formatCents(service.price_cents);

    try {
      await notifyBookingConfirmed({
        bookingId: booking.id,
        businessId: business.id,
        businessName: businessRow.business_name as string,
        businessSlug: businessRow.slug as string,
        customerName: clientName,
        customerEmail: clientEmail,
        customerPhone: clientPhone,
        // SMS consent isn't captured on manual entry — pro hasn't surfaced
        // a checkbox to the client. Email-only confirmation by design.
        smsConsent: false,
        serviceName: service.name,
        startAt,
        priceLabel,
        siteUrl,
        businessTier: (businessRow as { subscription_tier?: string }).subscription_tier ?? null,
        referrerName: null,
      });
    } catch (err) {
      console.error("Manual booking notify failed:", err);
    }
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}
