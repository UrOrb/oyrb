/**
 * Master kill-switch for every flow that takes money from a salon's clients
 * (deposits, pay-in-full, gift cards). When false, every checkout API refuses
 * with 503 and every UI surface hides the payment controls.
 *
 * Will stay `false` until Stripe Connect is fully wired up and onboarded
 * pros can collect funds into their own Stripe accounts.
 */
export function clientPaymentsEnabled(): boolean {
  return process.env.CLIENT_PAYMENTS_ENABLED === "true";
}

export const CLIENT_PAYMENTS_DISABLED_MESSAGE =
  "Online client payments are temporarily paused while we upgrade. Please contact the salon directly to book.";
