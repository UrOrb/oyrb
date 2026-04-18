import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  studio: process.env.STRIPE_PRICE_STUDIO!,
  scale: process.env.STRIPE_PRICE_SCALE!,
} as const;

export type PriceTier = keyof typeof PRICE_IDS;
