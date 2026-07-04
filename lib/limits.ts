export type AccountTier = "guest" | "friend" | "tea" | "sugar";

/** DB `profiles.plan` values (logged-in tiers only — guests have no profile). */
export type PlanTier = "friend" | "tea" | "sugar";
export const PLAN_TIERS: PlanTier[] = ["friend", "tea", "sugar"];

export type ModelCost = "low" | "medium" | "high";

/**
 * Daily free-generation cap per tier — the single source of truth used by both
 * the client UI and the server-side quota enforcement.
 */
export const FREE_LIMITS: Record<AccountTier, number> = {
  guest: 10,
  friend: 30,
  tea: 100,
  sugar: 500,
};

/** Highest model cost a tier may run on the PLATFORM key (BYO key = always all). */
const MAX_COST: Record<AccountTier, ModelCost> = {
  guest: "low",
  friend: "medium",
  tea: "medium",
  sugar: "high",
};

const COST_RANK: Record<ModelCost, number> = { low: 0, medium: 1, high: 2 };

/** True if `tier` may run a model of `cost` on the platform key (or has own key). */
export function modelAllowed(tier: AccountTier, cost: ModelCost, hasOwnKey: boolean): boolean {
  if (hasOwnKey) return true;
  return COST_RANK[cost] <= COST_RANK[MAX_COST[tier]];
}

export interface TierMeta {
  /** Playful display name. */
  label: string;
  /** Compact label for tight spaces (settings cards). */
  short: string;
  /** Short price string for cards. */
  price: string;
  /** Monthly USD (0 for free tiers). */
  priceUsd: number;
  tagline: string;
  features: string[];
}

export const TIER_META: Record<AccountTier, TierMeta> = {
  guest: {
    label: "Free Loader",
    short: "Loader",
    price: "Free",
    priceUsd: 0,
    tagline: "No account needed",
    features: [
      "10 free names / day",
      "Live domain availability checks",
      "All naming styles",
      "Saved & history in this browser",
    ],
  },
  friend: {
    label: "Namblo's Friend",
    short: "Friend",
    price: "Free",
    priceUsd: 0,
    tagline: "Create an account",
    features: [
      "30 free names / day",
      "Choose provider & model",
      "Bring your own API key for unlimited use",
      "History & favourites synced to your account",
    ],
  },
  tea: {
    label: "Standard",
    short: "Standard",
    price: "$4.99/mo",
    priceUsd: 4.99,
    tagline: "For regular naming",
    features: [
      "100 names / day",
      "Priority generation",
      "Choose provider & model",
      "Everything in Namblo's Friend",
    ],
  },
  sugar: {
    label: "Advanced",
    short: "Advanced",
    price: "$49.99/mo",
    priceUsd: 49.99,
    tagline: "For heavy naming",
    features: [
      "500 names / day",
      "Premium models on us (Opus, GPT-5, Gemini Pro)",
      "Priority generation",
      "Everything in Standard",
    ],
  },
};
