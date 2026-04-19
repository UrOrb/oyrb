import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { verifySessionToken, CLIENT_SESSION_COOKIE } from "@/lib/client-auth";
import { MyBookingsList } from "./my-bookings-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My bookings",
};

export default async function MyBookingsPage() {
  const c = await cookies();
  const token = c.get(CLIENT_SESSION_COOKIE)?.value;
  const email = await verifySessionToken(token);
  if (!email) {
    redirect("/client-login");
  }

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("bookings")
    .select(`
      id, start_at, end_at, status, deposit_paid, series_id, series_interval_weeks,
      services(name, duration_minutes, price_cents, deposit_cents),
      businesses(business_name, slug, phone, contact_email, loyalty_enabled, loyalty_threshold, loyalty_reward_text),
      clients!inner(id, email, visit_count, loyalty_reward_available)
    `)
    .eq("clients.email", email)
    .order("start_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    deposit_paid: boolean;
    series_id: string | null;
    series_interval_weeks: number | null;
    services: { name: string; duration_minutes: number; price_cents: number; deposit_cents: number } | null;
    businesses: {
      business_name: string;
      slug: string;
      phone: string | null;
      contact_email: string | null;
      loyalty_enabled: boolean | null;
      loyalty_threshold: number | null;
      loyalty_reward_text: string | null;
    } | null;
    clients: {
      id: string;
      email: string;
      visit_count: number | null;
      loyalty_reward_available: boolean | null;
    } | null;
  };

  const bookings = (rows ?? []) as Row[];
  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.start_at) > now
  );
  const past = bookings.filter(
    (b) => b.status === "cancelled" || new Date(b.start_at) <= now
  );

  // Loyalty summary per business
  const loyaltyByBiz = new Map<string, { name: string; visits: number; threshold: number; reward: string; rewardAvailable: boolean; slug: string }>();
  for (const b of bookings) {
    if (!b.businesses?.loyalty_enabled || !b.clients) continue;
    const k = b.businesses.slug;
    if (!loyaltyByBiz.has(k)) {
      loyaltyByBiz.set(k, {
        name: b.businesses.business_name,
        slug: b.businesses.slug,
        visits: b.clients.visit_count ?? 0,
        threshold: b.businesses.loyalty_threshold ?? 6,
        reward: b.businesses.loyalty_reward_text ?? "Reward available",
        rewardAvailable: !!b.clients.loyalty_reward_available,
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#B8896B]">My bookings</p>
            <h1 className="font-display mt-2 text-3xl font-medium tracking-[-0.02em] md:text-4xl">
              Hey, {email.split("@")[0]}
            </h1>
          </div>
          <form action="/api/client-auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Loyalty progress cards */}
        {loyaltyByBiz.size > 0 && (
          <div className="mt-8 space-y-3">
            {Array.from(loyaltyByBiz.values()).map((l) => (
              <div
                key={l.slug}
                className={`rounded-lg border p-4 ${
                  l.rewardAvailable ? "border-[#B8896B] bg-[#FFF7ED]" : "border-[#E7E5E4] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Loyalty · {l.name}
                    </p>
                    <p className="mt-1 text-sm">
                      {l.rewardAvailable ? (
                        <>
                          🎉 <strong>{l.reward}</strong> — show this card at your next visit.
                        </>
                      ) : (
                        <>
                          {l.visits} / {l.threshold} visits · {l.threshold - l.visits} more for{" "}
                          <strong>{l.reward}</strong>
                        </>
                      )}
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F4]">
                      <div
                        className="h-full bg-[#B8896B]"
                        style={{
                          width: `${Math.min(100, (l.visits / l.threshold) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/s/${l.slug}`}
                    className="shrink-0 rounded-full bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white"
                  >
                    Rebook
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <MyBookingsList upcoming={upcoming} past={past} />

        {bookings.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-[#E7E5E4] bg-white p-10 text-center">
            <p className="text-sm text-[#525252]">
              No bookings yet. Find a pro and book your first appointment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
