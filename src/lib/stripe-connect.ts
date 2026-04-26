import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Connect (Standard) helpers.
 *
 * Standard accounts are fully owned by the pro — they sign in to
 * dashboard.stripe.com with their own Stripe email/password and manage
 * payouts, refunds, taxes, disputes themselves. OYRB only stores a
 * pointer to the acct_… plus a few status flags so the dashboard can
 * gate features without round-tripping to Stripe on every request.
 */

export type ConnectStatus =
  | "not_connected"
  | "onboarding_incomplete"
  | "ready"
  | "restricted";

export type ConnectStatusInfo = {
  status: ConnectStatus;
  /** Items Stripe is currently waiting on (currently_due). May be empty. */
  requirementsCurrentlyDue: string[];
};

export function deriveStatus(row: {
  stripe_connect_account_id: string | null;
  stripe_connect_details_submitted: boolean;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_requirements_currently_due: string[] | null;
}): ConnectStatusInfo {
  const due = row.stripe_connect_requirements_currently_due ?? [];
  if (!row.stripe_connect_account_id) {
    return { status: "not_connected", requirementsCurrentlyDue: due };
  }
  if (!row.stripe_connect_details_submitted) {
    return { status: "onboarding_incomplete", requirementsCurrentlyDue: due };
  }
  if (!row.stripe_connect_charges_enabled) {
    return { status: "restricted", requirementsCurrentlyDue: due };
  }
  return { status: "ready", requirementsCurrentlyDue: due };
}

/**
 * Pull the current state of a Connected account from Stripe and write the
 * relevant fields back to the businesses row. Used by the return URL,
 * disconnect, and the (Phase 4) account.updated webhook handler.
 */
export async function refreshAccountStatus(params: {
  businessId: string;
  accountId: string;
}): Promise<Stripe.Account> {
  const account = await stripe.accounts.retrieve(params.accountId);

  const supabase = createAdminClient();
  await supabase
    .from("businesses")
    .update({
      stripe_connect_charges_enabled: !!account.charges_enabled,
      stripe_connect_payouts_enabled: !!account.payouts_enabled,
      stripe_connect_details_submitted: !!account.details_submitted,
      // We mark our local "onboarding_complete" the first time
      // details_submitted flips true. After that we keep it true even if
      // Stripe later raises new requirements (account stays "set up";
      // it's just temporarily restricted).
      ...(account.details_submitted
        ? { stripe_connect_onboarding_complete: true }
        : {}),
      stripe_connect_requirements_currently_due:
        account.requirements?.currently_due ?? [],
    })
    .eq("id", params.businessId);

  return account;
}

/** Stripe Standard has no programmatic magic login link — pros sign in to
    their own Stripe dashboard. We just send them to the canonical URL. */
export const STRIPE_STANDARD_DASHBOARD_URL = "https://dashboard.stripe.com/";

/**
 * Synchronous gate for UI surfaces that already have a business row in hand
 * (dashboard pages, storefront SSR). Returns true iff the pro can actually
 * accept online payments right now. Equivalent to `deriveStatus(...).status
 * === "ready"`, but cheaper to read at call sites.
 *
 * Use this instead of `loadConnectAccountForCheckout` when you don't need
 * the account_id and don't want a second DB roundtrip.
 */
export function connectReady(row: {
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_onboarding_complete: boolean;
}): boolean {
  return (
    !!row.stripe_connect_account_id &&
    row.stripe_connect_onboarding_complete &&
    row.stripe_connect_charges_enabled
  );
}

/**
 * Pre-flight check used by every public client-payment route (deposits,
 * pay-in-full, gift cards) before opening a Checkout Session on the pro's
 * connected account. A pro can only collect money once Stripe has approved
 * the account AND we've recorded that approval locally.
 *
 * Returns either { ok: true, accountId } or { ok: false, response } where
 * `response` is a ready-to-return NextResponse-shaped JSON body with a
 * 503 status and a stable `code` the client UI can branch on.
 */
export type ConnectGate =
  | { ok: true; accountId: string }
  | {
      ok: false;
      status: 503;
      body: { error: string; code: ConnectGateCode };
    };

export type ConnectGateCode =
  | "connect_not_connected"
  | "connect_onboarding_incomplete"
  | "connect_restricted";

/** Single consistent message the public-facing UI can show verbatim. */
const CONNECT_NOT_READY_MESSAGE =
  "This business hasn't finished setting up online payments yet. Please contact them directly to book.";

export async function loadConnectAccountForCheckout(
  supabase: SupabaseClient,
  businessId: string
): Promise<ConnectGate> {
  const { data: row } = await supabase
    .from("businesses")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_onboarding_complete, stripe_connect_details_submitted, stripe_connect_requirements_currently_due"
    )
    .eq("id", businessId)
    .maybeSingle();

  const accountId = row?.stripe_connect_account_id ?? null;
  if (!accountId) {
    return {
      ok: false,
      status: 503,
      body: { error: CONNECT_NOT_READY_MESSAGE, code: "connect_not_connected" },
    };
  }
  if (!row?.stripe_connect_onboarding_complete) {
    return {
      ok: false,
      status: 503,
      body: {
        error: CONNECT_NOT_READY_MESSAGE,
        code: "connect_onboarding_incomplete",
      },
    };
  }
  if (!row?.stripe_connect_charges_enabled) {
    return {
      ok: false,
      status: 503,
      body: { error: CONNECT_NOT_READY_MESSAGE, code: "connect_restricted" },
    };
  }
  return { ok: true, accountId };
}
