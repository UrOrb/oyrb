import { createClient, createAdminClient } from "@/lib/supabase/server";

// Schema-imposed assumption: the bookings table stores `deposit_paid` as a
// boolean but no per-booking deposit amount. For the "deposits_received"
// count type we infer the deposit as a flat % of the service price. When a
// real per-booking deposit amount column lands, swap this constant for a
// read on that column.
const ASSUMED_DEPOSIT_RATE = 0.3;

export type CountType =
  | "confirmed_bookings"
  | "completed_appointments"
  | "deposits_received";

export type GoalSettings = {
  monthly_goal_amount: number;
  count_type: CountType;
  custom_title: string | null;
  show_on_dashboard: boolean;
};

export type GoalSnapshot = {
  /** dollars */
  goalAmount: number;
  /** dollars — capped at goalAmount * 10 for sanity */
  earnedAmount: number;
  /** 0-100 + overage — NOT capped; UI decides how to display */
  percent: number;
  /** first-of-next-month UTC */
  resetsAt: string;
  /** user-facing count type */
  countType: CountType;
  /** number of sites aggregated (useful for the "combined across N sites" note) */
  siteCount: number;
  /** custom title override */
  customTitle: string | null;
  /** whether the user has opted out of showing the meter */
  showOnDashboard: boolean;
  /** true if the user has never set a goal yet — dashboard renders the
   *  first-run "set your goal" prompt instead of the meter */
  isFirstRun: boolean;
};

/** First day of the current calendar month, in UTC, as ISO date. */
function currentMonthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function nextMonthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
}

/**
 * Upserts initial goal settings for a user (idempotent). Safe to call from
 * the dashboard loader to materialize a default row on first visit.
 */
export async function ensureGoalSettings(userId: string): Promise<GoalSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_goal_settings")
    .select("monthly_goal_amount, count_type, custom_title, show_on_dashboard")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) {
    return {
      monthly_goal_amount: Number(data.monthly_goal_amount),
      count_type: data.count_type as CountType,
      custom_title: data.custom_title,
      show_on_dashboard: data.show_on_dashboard,
    };
  }
  await supabase.from("user_goal_settings").insert({
    user_id: userId,
    monthly_goal_amount: 0,
    count_type: "confirmed_bookings",
    show_on_dashboard: true,
  });
  return {
    monthly_goal_amount: 0,
    count_type: "confirmed_bookings",
    custom_title: null,
    show_on_dashboard: true,
  };
}

/**
 * Computes the user's current-month earned amount (dollars) based on their
 * selected count_type. Joins bookings → services to pull price_cents and
 * aggregates across every business the user owns.
 *
 * Status semantics:
 *   · confirmed_bookings    → status in ('confirmed', 'completed')
 *   · completed_appointments → status = 'completed'
 *   · deposits_received     → deposit_paid = true AND status != 'cancelled';
 *                             counts ASSUMED_DEPOSIT_RATE × service price
 */
export async function computeCurrentMonthEarnings(
  userId: string,
  countType: CountType,
): Promise<number> {
  const supabase = await createClient();
  const monthStart = currentMonthStartUtc().toISOString();
  const monthEnd = nextMonthStartUtc().toISOString();

  // Join via services to get price_cents; filter by user's businesses via
  // RLS — the user only sees rows where businesses.owner_id = auth.uid().
  // `!inner` on services so rows without a service_id are excluded.
  let q = supabase
    .from("bookings")
    .select("status, deposit_paid, services!inner(price_cents)")
    .gte("start_at", monthStart)
    .lt("start_at", monthEnd);

  if (countType === "completed_appointments") {
    q = q.eq("status", "completed");
  } else if (countType === "deposits_received") {
    q = q.eq("deposit_paid", true).in("status", ["pending", "confirmed", "completed"]);
  } else {
    // confirmed_bookings (default)
    q = q.in("status", ["confirmed", "completed"]);
  }

  const { data, error } = await q;
  if (error || !data) return 0;

  type Row = { status: string; deposit_paid: boolean | null; services: { price_cents: number } | { price_cents: number }[] | null };
  let cents = 0;
  for (const row of data as Row[]) {
    const svc = Array.isArray(row.services) ? row.services[0] : row.services;
    const price = svc?.price_cents ?? 0;
    if (countType === "deposits_received") {
      cents += Math.round(price * ASSUMED_DEPOSIT_RATE);
    } else {
      cents += price;
    }
  }
  return cents / 100;
}

/** How many businesses does this user own (for the "combined across X sites" note). */
async function countUserSites(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  return count ?? 0;
}

/** Everything the dashboard needs to render the goal meter in one call. */
export async function getGoalSnapshot(userId: string): Promise<GoalSnapshot> {
  const settings = await ensureGoalSettings(userId);
  const isFirstRun = settings.monthly_goal_amount === 0;
  const [earned, siteCount] = await Promise.all([
    isFirstRun ? Promise.resolve(0) : computeCurrentMonthEarnings(userId, settings.count_type),
    countUserSites(userId),
  ]);
  const goal = settings.monthly_goal_amount;
  const percent = goal > 0 ? (earned / goal) * 100 : 0;
  return {
    goalAmount: goal,
    earnedAmount: earned,
    percent,
    resetsAt: nextMonthStartUtc().toISOString(),
    countType: settings.count_type,
    siteCount,
    customTitle: settings.custom_title,
    showOnDashboard: settings.show_on_dashboard,
    isFirstRun,
  };
}

/**
 * Invoked by the monthly-reset cron on the 1st of each month. Captures the
 * previous month's goal + earned and inserts into goal_history. Uses the
 * service-role admin client so RLS doesn't block cross-user writes.
 */
export async function snapshotAllUsersForPreviousMonth(): Promise<{
  captured: number;
  skipped: number;
}> {
  const admin = createAdminClient();

  // Previous month range (UTC)
  const now = new Date();
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0),
  );
  const prevMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
  const monthDate = prevMonthStart.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: settings } = await admin
    .from("user_goal_settings")
    .select("user_id, monthly_goal_amount, count_type");

  if (!settings || settings.length === 0) return { captured: 0, skipped: 0 };

  let captured = 0;
  let skipped = 0;
  for (const s of settings) {
    // Aggregate the user's previous-month earnings using the same logic as
    // computeCurrentMonthEarnings but against the previous month window.
    let q = admin
      .from("bookings")
      .select("status, deposit_paid, business_id, services!inner(price_cents), businesses!inner(owner_id)")
      .gte("start_at", prevMonthStart.toISOString())
      .lt("start_at", prevMonthEnd.toISOString())
      .eq("businesses.owner_id", s.user_id);

    if (s.count_type === "completed_appointments") {
      q = q.eq("status", "completed");
    } else if (s.count_type === "deposits_received") {
      q = q.eq("deposit_paid", true).in("status", ["pending", "confirmed", "completed"]);
    } else {
      q = q.in("status", ["confirmed", "completed"]);
    }

    const { data: rows, error } = await q;
    if (error) { skipped++; continue; }

    type Row = { services: { price_cents: number } | { price_cents: number }[] | null; deposit_paid: boolean | null };
    let cents = 0;
    for (const r of (rows ?? []) as Row[]) {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services;
      const price = svc?.price_cents ?? 0;
      if (s.count_type === "deposits_received") cents += Math.round(price * ASSUMED_DEPOSIT_RATE);
      else cents += price;
    }

    const earned = cents / 100;
    const { error: insErr } = await admin.from("goal_history").upsert(
      {
        user_id: s.user_id,
        month: monthDate,
        goal_amount: s.monthly_goal_amount,
        earned_amount: earned,
        count_type: s.count_type,
      },
      { onConflict: "user_id,month" },
    );
    if (insErr) { skipped++; continue; }
    captured++;
  }

  return { captured, skipped };
}

/** Fetches the user's goal history (most recent first). */
export async function getGoalHistory(userId: string, limit = 12) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goal_history")
    .select("month, goal_amount, earned_amount, percent_hit, count_type")
    .eq("user_id", userId)
    .order("month", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    month: r.month as string,
    goalAmount: Number(r.goal_amount),
    earnedAmount: Number(r.earned_amount),
    percentHit: Number(r.percent_hit),
    countType: r.count_type as CountType,
  }));
}
