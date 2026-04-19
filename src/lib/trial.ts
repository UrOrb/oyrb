import { createAdminClient } from "@/lib/supabase/server";

export type TrialEligibility =
  | { ok: true; normalizedEmail: string; normalizedPhone: string }
  | { ok: false; reason: TrialBlockReason; message: string };

export type TrialBlockReason =
  | "email_already_used"
  | "phone_already_used"
  | "email_banned"
  | "phone_banned"
  | "phone_unverified"
  | "missing_input";

const FRIENDLY: Record<TrialBlockReason, string> = {
  email_already_used:
    "This email has already used its free trial. You can sign up for a paid plan to get started immediately.",
  phone_already_used:
    "This phone number has already been used for a free trial. You can sign up for a paid plan to get started immediately.",
  email_banned:
    "Free trials are not available for this account. You can sign up for a paid plan to get started immediately.",
  phone_banned:
    "Free trials are not available for this phone number. You can sign up for a paid plan to get started immediately.",
  phone_unverified:
    "Please verify your phone number to start your free trial.",
  missing_input:
    "Email and verified phone number are both required to start a free trial.",
};

/**
 * Lower-case + trim for emails. Phones must already be E.164 (the
 * Twilio Verify wrapper in lib/twilio-verify.ts canonicalizes before
 * issuing the verification code).
 */
function normEmail(email: string): string {
  return email.trim().toLowerCase();
}
function normPhone(phone: string): string {
  return phone.trim();
}

/**
 * Server-side trial eligibility gate. Run this immediately before
 * creating the Stripe subscription. Returns ok=true if the (email, phone)
 * pair is allowed to start a new trial.
 *
 * Always logs a row in trial_signup_attempts for audit, regardless of
 * outcome. Pass IP and device_fingerprint when available so support can
 * correlate later.
 */
export async function checkTrialEligibility(input: {
  email: string;
  phone: string;
  phoneVerified: boolean;
  ip?: string;
  deviceFingerprint?: string;
}): Promise<TrialEligibility> {
  const admin = createAdminClient();
  const email = normEmail(input.email);
  const phone = normPhone(input.phone);

  if (!email || !phone) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_other");
    return { ok: false, reason: "missing_input", message: FRIENDLY.missing_input };
  }
  if (!input.phoneVerified) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_phone_unverified");
    return { ok: false, reason: "phone_unverified", message: FRIENDLY.phone_unverified };
  }

  // Run all four checks in parallel.
  const [historyEmail, historyPhone, banEmail, banPhone] = await Promise.all([
    admin.from("trial_history").select("id").ilike("email", email).maybeSingle(),
    admin.from("trial_history").select("id").eq("phone", phone).maybeSingle(),
    admin.from("trial_ban_list").select("id").ilike("email", email).maybeSingle(),
    admin.from("trial_ban_list").select("id").eq("phone", phone).maybeSingle(),
  ]);

  // Order matters: ban list before "already used" so a banned-then-cleaned
  // email doesn't slip through.
  if (banEmail.data) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_email_banned");
    return { ok: false, reason: "email_banned", message: FRIENDLY.email_banned };
  }
  if (banPhone.data) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_phone_banned");
    return { ok: false, reason: "phone_banned", message: FRIENDLY.phone_banned };
  }
  if (historyEmail.data) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_email_already_used");
    return { ok: false, reason: "email_already_used", message: FRIENDLY.email_already_used };
  }
  if (historyPhone.data) {
    await logAttempt(admin, { email, phone, ip: input.ip, fp: input.deviceFingerprint }, "blocked_phone_already_used");
    return { ok: false, reason: "phone_already_used", message: FRIENDLY.phone_already_used };
  }

  return { ok: true, normalizedEmail: email, normalizedPhone: phone };
}

/**
 * Record a successful trial start. Called from the webhook once Stripe
 * confirms the trial subscription was created. The unique indexes on
 * email + phone enforce the no-second-trial rule at the DB layer too.
 */
export async function recordTrialStart(input: {
  userId: string;
  email: string;
  phone: string;
  tier: "starter" | "studio" | "scale";
  billingCycle: "monthly" | "annual";
  stripeSubscriptionId: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("trial_history").insert({
    user_id: input.userId,
    email: normEmail(input.email),
    phone: normPhone(input.phone),
    tier: input.tier,
    billing_cycle: input.billingCycle,
    stripe_subscription_id: input.stripeSubscriptionId,
  });
  await logAttempt(
    admin,
    { email: normEmail(input.email), phone: normPhone(input.phone) },
    "started"
  );
}

export type TrialAttemptOutcome =
  | "started"
  | "blocked_email_already_used"
  | "blocked_phone_already_used"
  | "blocked_email_banned"
  | "blocked_phone_banned"
  | "blocked_phone_unverified"
  | "blocked_payment_method_duplicate"
  | "blocked_other";

/** Public wrapper so the webhook can record outcomes the eligibility
 *  function never sees (e.g. payment-method-duplicate found post-checkout). */
export async function recordTrialAttempt(input: {
  email: string;
  phone: string;
  ip?: string;
  deviceFingerprint?: string;
  outcome: TrialAttemptOutcome;
  notes?: string;
}): Promise<void> {
  const admin = createAdminClient();
  await logAttempt(
    admin,
    {
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),
      ip: input.ip,
      fp: input.deviceFingerprint,
    },
    input.outcome,
    input.notes
  );
}

async function logAttempt(
  admin: ReturnType<typeof createAdminClient>,
  who: { email: string; phone: string; ip?: string; fp?: string },
  outcome: TrialAttemptOutcome,
  notes?: string
): Promise<void> {
  try {
    await admin.from("trial_signup_attempts").insert({
      email: who.email,
      phone: who.phone,
      ip: who.ip,
      device_fingerprint: who.fp,
      outcome,
      notes: notes ?? null,
    });
  } catch {
    // Audit failure shouldn't break the signup flow. Log to console only.
    console.warn("Failed to record trial signup attempt");
  }
}
