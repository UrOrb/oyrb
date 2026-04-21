import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/current-site";
import type { DailyBreakBlock } from "@/lib/booking-slots";
import { BookingRulesForm } from "./form";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function BookingRulesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Booking rules</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first.</p>
      </div>
    );
  }

  // Business has the 5 scheduling columns from migration 023. Defaults
  // were applied at migration time so existing pros have safe values.
  const b = business as unknown as {
    id: string;
    booking_interval_minutes: number;
    allow_last_minute_booking: boolean;
    last_minute_cutoff_hours: number;
    break_between_appointments_minutes: number;
    daily_break_blocks: DailyBreakBlock[] | null;
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">Booking rules</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Shape your schedule. These apply to new bookings only — existing
        appointments are never moved.
      </p>

      <BookingRulesForm
        businessId={b.id}
        initial={{
          intervalMinutes: b.booking_interval_minutes,
          allowLastMinute: b.allow_last_minute_booking,
          lastMinuteCutoffHours: b.last_minute_cutoff_hours,
          breakBetweenMinutes: b.break_between_appointments_minutes,
          dailyBreakBlocks: b.daily_break_blocks ?? [],
        }}
      />
    </div>
  );
}
