import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_EMAIL, DEMO_SEED } from "@/lib/demo";

/**
 * Wipe every row owned by the demo user and re-seed the pristine state.
 * Used by:
 *   · /api/cron/demo-reset  (nightly)
 *   · /api/admin/demo/reset (manual, token-protected)
 *   · scripts/demo-setup.js (first-time setup)
 *
 * Safe to re-run. Returns timing + counts for logging.
 */
export async function resetDemoData(): Promise<{
  user_id: string;
  tables_wiped: string[];
  duration_ms: number;
}> {
  const t0 = Date.now();
  const admin = createAdminClient();

  // 1. Find (or create) the demo user so we can wipe + reseed under its id.
  const userId = await findOrCreateDemoUser(admin);

  // 2. Wipe child data first (FK order: bookings/reviews/inquiries etc.
  //    cascade off businesses, but we delete explicitly so the order is
  //    obvious). Any new tables added later must be added here.
  const { data: bizRows } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);
  const bizIds = (bizRows ?? []).map((b: { id: string }) => b.id);
  const wiped: string[] = [];

  if (bizIds.length > 0) {
    for (const table of ["bookings", "services", "business_hours", "clients", "reviews", "inquiries", "waitlist"]) {
      const { error } = await admin.from(table).delete().in("business_id", bizIds);
      if (!error) wiped.push(table);
    }
  }

  // Row-level account data.
  for (const table of ["account_subscriptions", "trial_reminders_sent"]) {
    await admin.from(table).delete().eq("user_id", userId);
    wiped.push(table);
  }
  // trial_history + trial_signup_attempts are keyed on email / phone, not
  // user_id; strip by email so a demo trial can be "restarted".
  await admin.from("trial_history").delete().ilike("email", DEMO_EMAIL);
  await admin.from("trial_signup_attempts").delete().ilike("email", DEMO_EMAIL);
  wiped.push("trial_history", "trial_signup_attempts");

  // Now wipe businesses themselves.
  await admin.from("businesses").delete().eq("owner_id", userId);
  wiped.push("businesses");

  // 3. Re-seed.
  await seedDemoContent(admin, userId);

  return { user_id: userId, tables_wiped: wiped, duration_ms: Date.now() - t0 };
}

async function findOrCreateDemoUser(
  admin: ReturnType<typeof createAdminClient>
): Promise<string> {
  // Paginate auth users looking for the demo email. For a brand-new demo
  // deploy there are almost no users so the first page is sufficient.
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = users.find((u: { email?: string | null; id: string }) =>
    (u.email ?? "").toLowerCase() === DEMO_EMAIL.toLowerCase()
  );
  if (found) return found.id;

  const pw = process.env.DEMO_USER_PASSWORD;
  if (!pw) throw new Error("DEMO_USER_PASSWORD must be set before running the demo reset");
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: pw,
    email_confirm: true,
    user_metadata: { full_name: "Jasmine Carter", is_demo: true },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user.id;
}

async function seedDemoContent(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  // Business row
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .insert({
      owner_id: userId,
      ...DEMO_SEED.business,
    })
    .select("id")
    .single();
  if (bizErr || !biz) throw new Error(`seed businesses failed: ${bizErr?.message}`);
  const businessId = biz.id as string;

  // Services
  for (const s of DEMO_SEED.services) {
    await admin.from("services").insert({
      business_id: businessId,
      name: s.name,
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      deposit_cents: 0,
      description: s.description,
      active: true,
    });
  }

  // Hours
  await admin.from("business_hours").insert(
    DEMO_SEED.hours.map((h) => ({ ...h, business_id: businessId }))
  );

  // 5–6 upcoming bookings spread across the next 14 days
  const { data: svcRows } = await admin
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("business_id", businessId);
  const services = svcRows ?? [];
  const clientRows = [];
  for (const c of DEMO_SEED.sampleClients) {
    const { data: row } = await admin
      .from("clients")
      .insert({
        business_id: businessId,
        name: c.name,
        email: c.email,
        phone: c.phone,
      })
      .select("id, name, email, phone")
      .single();
    if (row) clientRows.push(row);
  }

  const now = new Date();
  for (let i = 0; i < Math.min(6, clientRows.length, services.length); i++) {
    const svc = services[i % services.length];
    const cli = clientRows[i];
    // Spread across next 14 days, skip Mon/Sun, morning/afternoon slots.
    const daysAhead = 1 + i * 2;
    const start = new Date(now);
    start.setDate(start.getDate() + daysAhead);
    start.setHours(10 + (i % 4) * 2, 0, 0, 0);
    // Bump off Sun/Mon
    if (start.getDay() === 0) start.setDate(start.getDate() + 2);
    if (start.getDay() === 1) start.setDate(start.getDate() + 1);
    const end = new Date(start.getTime() + svc.duration_minutes * 60 * 1000);

    await admin.from("bookings").insert({
      business_id: businessId,
      client_id: cli.id,
      service_id: svc.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed",
      deposit_paid: true,
    });
  }

  // Fake active Scale-tier account subscription so Add-New-Site + all plan
  // flows are explorable in the demo.
  await admin.from("account_subscriptions").upsert(
    {
      user_id: userId,
      tier: "scale",
      billing_cycle: "monthly",
      stripe_customer_id: "cus_demo",
      stripe_subscription_id: `sub_demo_${Date.now()}`,
      status: "active",
      addon_count: 0,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id" }
  );
}
