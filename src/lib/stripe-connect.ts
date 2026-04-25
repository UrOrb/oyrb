import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

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
