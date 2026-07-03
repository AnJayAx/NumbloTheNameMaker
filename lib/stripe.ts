import Stripe from "stripe";

export type PaidTier = "tea" | "sugar";

let client: Stripe | null = null;

/** Server-only Stripe client. Returns null when the secret key isn't set. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

/** Stripe Price id for a paid tier (from env). */
export function priceForTier(tier: PaidTier): string | undefined {
  return (tier === "tea" ? process.env.STRIPE_PRICE_TEA : process.env.STRIPE_PRICE_SUGAR)?.trim();
}

/** Reverse-map a Price id back to a tier (for webhook events). */
export function tierForPrice(priceId: string | undefined | null): PaidTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_TEA?.trim()) return "tea";
  if (priceId === process.env.STRIPE_PRICE_SUGAR?.trim()) return "sugar";
  return null;
}
