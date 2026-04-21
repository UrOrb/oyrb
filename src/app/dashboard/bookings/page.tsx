import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCents } from "@/lib/types";
import { Calendar, Clock, Mail, Phone, MessageSquare } from "lucide-react";
import { CancelBookingButton } from "./cancel-button";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function BookingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Bookings</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to start receiving bookings.</p>
      </div>
    );
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(name, price_cents), clients(name, email, phone)")
    .eq("business_id", business.id)
    .order("start_at", { ascending: false })
    .limit(100);

  const list = bookings ?? [];
  const upcoming = list.filter((b: any) => new Date(b.start_at) >= new Date());
  const past = list.filter((b: any) => new Date(b.start_at) < new Date());

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Bookings</h1>
      <p className="mt-1 text-sm text-[#737373]">All appointments, newest first.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Upcoming ({upcoming.length})</h2>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              No upcoming bookings yet. Share your site link to start booking.
            </div>
          ) : (
            upcoming.map((b: any) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Past ({past.length})</h2>
          <div className="mt-3 space-y-2 opacity-80">
            {past.slice(0, 20).map((b: any) => <BookingRow key={b.id} b={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingRow({ b }: { b: any }) {
  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeLabel =
    start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
    " – " +
    end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#E7E5E4] bg-white p-4 md:flex-row md:items-center md:gap-6">
      <div className="flex-shrink-0 md:w-40">
        <p className="flex items-center gap-1.5 text-xs text-[#737373]">
          <Calendar size={11} /> {dateLabel}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-[#737373]">
          <Clock size={11} /> {timeLabel}
        </p>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{b.services?.name ?? "Service"}</p>
        <p className="text-xs text-[#737373]">
          {b.clients?.name ?? "Guest"}
          {b.services?.price_cents != null && ` · ${formatCents(b.services.price_cents)}`}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-[#525252]">
        {b.clients?.email && (
          <a href={`mailto:${b.clients.email}`} className="flex items-center gap-1 hover:text-[#B8896B]">
            <Mail size={11} /> {b.clients.email}
          </a>
        )}
        {b.clients?.phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${b.clients.phone}`}
              className="flex items-center gap-1 hover:text-[#B8896B]"
              aria-label={`Call ${b.clients.phone}`}
            >
              <Phone size={11} /> {b.clients.phone}
            </a>
            <a
              href={`sms:${b.clients.phone}`}
              className="flex items-center gap-1 text-[11px] text-[#737373] hover:text-[#B8896B]"
              aria-label={`Text ${b.clients.phone}`}
              title="Send text message"
            >
              <MessageSquare size={11} /> Text
            </a>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {b.paid_in_full_at && (
          <span
            className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
            title={`Paid ${b.paid_amount_cents ? formatCents(b.paid_amount_cents) : "in full"} on ${new Date(b.paid_in_full_at).toLocaleDateString()}`}
          >
            💳 Paid in full
          </span>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
            b.status === "confirmed" ? "bg-green-50 text-green-700" :
            b.status === "cancelled" ? "bg-red-50 text-red-700" :
            b.status === "completed" ? "bg-blue-50 text-blue-700" :
            "bg-amber-50 text-amber-700"
          }`}
        >
          {b.status}
        </span>
        {b.status === "confirmed" && new Date(b.start_at) > new Date() && (
          <CancelBookingButton bookingId={b.id} />
        )}
      </div>
    </div>
  );
}
