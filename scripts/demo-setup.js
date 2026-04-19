#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * demo-setup.js — first-time setup for the demo deployment.
 *
 *   1. Creates a Supabase auth user with DEMO_USER_EMAIL / DEMO_USER_PASSWORD
 *      if it doesn't already exist.
 *   2. Calls the deployed /api/admin/demo/reset endpoint to wipe + re-seed.
 *
 * Run once after deploying the demo for the first time, and any time you
 * rotate the demo password. Safe to re-run.
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://…supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   export DEMO_USER_EMAIL="demo@oyrb.space"
 *   export DEMO_USER_PASSWORD="..."             # >= 32 random chars
 *   export DEMO_ADMIN_TOKEN="..."               # same as on the deployment
 *   export DEMO_BASE_URL="https://demo.oyrb.space"
 *   node scripts/demo-setup.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@oyrb.space";
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD;
const DEMO_ADMIN_TOKEN = process.env.DEMO_ADMIN_TOKEN;
const DEMO_BASE_URL = process.env.DEMO_BASE_URL ?? "https://demo.oyrb.space";

for (const [k, v] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  DEMO_USER_PASSWORD,
  DEMO_ADMIN_TOKEN,
})) {
  if (!v) {
    console.error(`✗ ${k} is required`);
    process.exit(1);
  }
}

async function main() {
  console.log(`\nDemo setup → ${DEMO_BASE_URL}\n`);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Ensure the demo user exists.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) {
    console.error("✗ listUsers failed:", listErr.message);
    process.exit(1);
  }
  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === DEMO_USER_EMAIL.toLowerCase()
  );
  if (existing) {
    console.log(`✓ demo user already exists (${existing.id})`);
    // Ensure the password matches the env var, so auto-login keeps working
    // after a password rotation.
    await admin.auth.admin.updateUserById(existing.id, { password: DEMO_USER_PASSWORD });
    console.log(`✓ demo user password synced from env`);
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Jasmine Carter", is_demo: true },
    });
    if (error) {
      console.error("✗ createUser failed:", error.message);
      process.exit(1);
    }
    console.log(`✓ demo user created (${created.user.id})`);
  }

  // 2. Trigger the deployed reset endpoint so the seed runs using the live
  //    app's code path (guarantees it stays in sync with the seed shape).
  console.log(`\nTriggering initial seed via ${DEMO_BASE_URL}/api/admin/demo/reset …`);
  try {
    const res = await fetch(`${DEMO_BASE_URL}/api/admin/demo/reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DEMO_ADMIN_TOKEN}` },
    });
    const j = await res.json();
    if (!res.ok) {
      console.error("✗ reset failed:", j);
      process.exit(1);
    }
    console.log("✓ seed complete:", j);
  } catch (err) {
    console.error(
      "✗ couldn't reach reset endpoint. Is the demo deployed yet? Is the DNS pointed at it? Did you set DEMO_BASE_URL correctly?\n",
      err.message ?? err
    );
    process.exit(1);
  }

  console.log(`\nDone. Visit ${DEMO_BASE_URL} — you should land inside Jasmine Carter's dashboard.`);
}

main().catch((err) => {
  console.error("\n✗ demo setup failed:", err && err.message ? err.message : err);
  process.exit(1);
});
