import { createAdminClient } from "@/lib/supabase/server";
import { issueBookingToken } from "@/lib/booking-tokens";
import { sendBookingConfirmation, type HistoryItem } from "@/lib/email";
import { sendSms, tierAllowsSms } from "@/lib/sms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

function shortLink(token: string): string {
  // Short URL version for SMS — full URL over https is already ~60 chars.
  // We don't have a URL shortener yet; use the full link but keep it terse.
  return `${APP_URL}/b/${token.slice(0, 12)}`;
}

export type NotifyBookingArgs = {
  bookingId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  smsConsent?: boolean;
  serviceName: string;
  startAt: Date;
  priceLabel: string;
  siteUrl: string;
  businessTier?: string | null;
};

// Fetches prior (up to 3) confirmed bookings for this client+business pair
// and issues fresh magic-link tokens for each. Cost: ~3 extra inserts per
// confirmation email, which is fine given the low volume.
async function buildHistoryForClient(
  businessId: string,
  clientEmail: string,
  excludeBookingId: string,
): Promise<HistoryItem[]> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", clientEmail)
    .maybeSingle();
  if (!client?.id) return [];

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, start_at,
      services(name)
    `)
    .eq("client_id", client.id)
    .neq("id", excludeBookingId)
    .neq("status", "cancelled")
    .order("start_at", { ascending: false })
    .limit(3);

  const items: HistoryItem[] = [];
  for (const b of (bookings ?? []) as Array<{
    id: string;
    start_at: string;
    services: { name: string } | null;
  }>) {
    if (!b.services) continue;
    const token = await issueBookingToken({
      bookingId: b.id,
      clientEmail,
    });
    if (!token.ok) continue;
    items.push({
      token: token.token,
      serviceName: b.services.name,
      startAt: new Date(b.start_at),
    });
  }
  return items;
}

/**
 * Call this after a booking is inserted. Issues a magic-link token,
 * builds history, sends email + SMS (if consented and pro's tier permits).
 */
export async function notifyBookingConfirmed(args: NotifyBookingArgs): Promise<{ token: string | null }> {
  const tokenResult = await issueBookingToken({
    bookingId: args.bookingId,
    clientEmail: args.customerEmail,
  });

  const primaryToken = tokenResult.ok ? tokenResult.token : null;

  // Preferences token = same token reused, scoped in the path. We could
  // mint a separate one, but it's not load-bearing — the preferences page
  // accepts any valid (non-expired) booking token belonging to this email.
  const preferencesToken = primaryToken;

  const history = primaryToken
    ? await buildHistoryForClient(args.businessId, args.customerEmail, args.bookingId)
    : [];

  await sendBookingConfirmation({
    to: args.customerEmail,
    customerName: args.customerName,
    businessName: args.businessName,
    serviceName: args.serviceName,
    startAt: args.startAt,
    price: args.priceLabel,
    siteUrl: args.siteUrl,
    bookingToken: primaryToken ?? undefined,
    history,
    preferencesToken: preferencesToken ?? undefined,
  }).catch((err) => {
    console.error("Confirmation email failed:", err);
  });

  // SMS — only if phone, consented, and tier allows
  if (
    args.customerPhone &&
    args.smsConsent &&
    tierAllowsSms(args.businessTier ?? undefined)
  ) {
    const whenLabel = args.startAt.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const linkBit = primaryToken ? ` Details: ${shortLink(primaryToken)}` : "";
    const body = `${args.businessName}: Booking confirmed — ${args.serviceName} on ${whenLabel}.${linkBit} Reply STOP to opt out.`;
    await sendSms({ to: args.customerPhone, body }).catch((err) => {
      console.error("Confirmation SMS failed:", err);
    });
  }

  return { token: primaryToken };
}
