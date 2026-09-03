"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/current-site";
import { checkBookingOverlap, isBookingConflictDbError } from "@/lib/booking-overlap";
import type { DailyBreakBlock } from "@/lib/booking-slots";
import { notifyBookingConfirmed } from "@/lib/booking-notify";
import { formatCents } from "@/lib/types";
import { fillEmptyClientFields } from "@/lib/clients/fill-empty";
import { normalizeToE164 } from "@/lib/sms";
import { zonedDateTimeToUtc } from "@/lib/timezone";

/**
 * Returned by createManualBooking when the booking saved successfully
 * but the pro typed name/phone values that conflicted with the
 * existing client's curated record. The form surfaces this as an
 * inline notice ("This client's phone is on file as X — edit them
 * directly to change it") with a link to the client edit page.
 *
 * Phone is the only field this notice was specifically requested for
 * (consent implications), but we surface name and notes too since
 * detecting the case is free here.
 */
export type SuppressedClientFields = {
  client_id: string;
  fields: {
    name?: { existing: string };
    phone?: { existing: string };
    notes?: { existing: string };
  };
};

type ActionResult =
  | { error: string }
  | { success: true; suppressed?: SuppressedClientFields };

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
      "id, business_name, slug, contact_email, owner_id, subscription_tier, timezone, break_between_appointments_minutes, daily_break_blocks",
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

  const providerTimezone = (businessRow as { timezone?: string | null }).timezone ?? "America/New_York";
  const startAt = zonedDateTimeToUtc(date, time, providerTimezone);
  if (isNaN(startAt.getTime())) return { error: "Invalid date or time." };

  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  // last_minute_cutoff_hours intentionally NOT enforced — pros need to log
  // walk-ins and same-day phone bookings.
  const businessRules = businessRow as {
    break_between_appointments_minutes?: number;
    daily_break_blocks?: DailyBreakBlock[] | null;
  };
  const breakMinutes = businessRules.break_between_appointments_minutes ?? 15;
  const dailyBreakBlocks = businessRules.daily_break_blocks ?? [];

  const result = await checkBookingOverlap(
    supabase,
    business.id,
    startAt,
    endAt,
    breakMinutes,
    null,
    dailyBreakBlocks,
  );
  if (!result.ok) {
    const c = result.conflict;
    if (c.kind === "booking") {
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
    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return {
      error: `That time falls in your configured break (${fmt(c.startAt)} – ${fmt(c.endAt)}).`,
    };
  }

  // Upsert client by email when provided; otherwise create a
  // phone-only (or name-only) client row. Mirrors the public route's
  // fill-empty-only handling — see src/lib/clients/fill-empty.ts.
  // The pro intentionally types client info here, but the booking
  // flow is no longer the place to mutate an existing client record;
  // changes happen on /dashboard/clients/[id] instead. We surface a
  // notice via `suppressed` so the form can link the pro there.
  let clientId: string | null = null;
  let suppressed: SuppressedClientFields | undefined;
  if (clientEmail) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id, name, phone, notes")
      .eq("business_id", business.id)
      .ilike("email", clientEmail)
      .maybeSingle();
    if (existing) {
      clientId = (existing as { id: string }).id;
      // Normalize the pro's typed phone before comparing — they might
      // type "404-555-1234" against an existing "+14045551234" and
      // we don't want a cosmetic difference to flip suppression on.
      const normalizedPhone = clientPhone ? normalizeToE164(clientPhone) ?? clientPhone : null;
      const existingFields = existing as {
        id: string;
        name: string | null;
        phone: string | null;
        notes: string | null;
      };
      const { patch, suppressed: suppressedFields } = fillEmptyClientFields(
        {
          name: existingFields.name,
          phone: existingFields.phone ? normalizeToE164(existingFields.phone) ?? existingFields.phone : null,
          notes: existingFields.notes,
        },
        { name: clientName, phone: normalizedPhone },
      );
      if (Object.keys(patch).length > 0) {
        await supabase
          .from("clients")
          .update(patch)
          .eq("id", clientId);
      }
      const suppressedKeys = Object.keys(suppressedFields) as Array<"name" | "phone" | "notes">;
      if (suppressedKeys.length > 0) {
        suppressed = {
          client_id: clientId,
          fields: Object.fromEntries(
            suppressedKeys.map((k) => [
              k,
              { existing: suppressedFields[k]!.existing },
            ]),
          ) as SuppressedClientFields["fields"],
        };
      }
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
      // Phase 4.5 — pro is manually entering this booking from the
      // dashboard. Drives the Booking Origin card on Where They Come
      // From.
      booking_source: "manual",
    })
    .select("id")
    .single();
  if (bookingErr || !booking) {
    if (isBookingConflictDbError(bookingErr)) {
      return { error: "That time conflicts with an existing booking or required break. Please pick another." };
    }
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
  return suppressed ? { success: true, suppressed } : { success: true };
}
