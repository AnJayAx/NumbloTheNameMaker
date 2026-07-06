import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { FREE_LIMITS, type AccountTier } from "@/lib/limits";
import { ensureProfile } from "@/lib/supabase/admin";

/** httpOnly cookie holding an anonymous guest id for best-effort guest limits. */
export const GUEST_COOKIE = "namblo_guest";

/** Persist a guest id on the response (httpOnly so client JS can't clear it easily). */
export function setGuestCookie(response: NextResponse, guestId: string): void {
  response.cookies.set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}

type Admin = SupabaseClient<Database>;

export interface ResolvedSubject {
  /** "user:<uuid>" or "guest:<uuid>" - the key usage is counted against. */
  subject: string;
  /** Effective tier (guest, or the logged-in user's plan). */
  tier: AccountTier;
  /** Daily free-generation limit for this subject. */
  limit: number;
  /** Next billing date (ISO) for a paid subscriber, else null. */
  renewsAt: string | null;
  /** Stripe subscription status, else null. */
  status: string | null;
  /** Present for guests; the route sets it as a cookie when `guestIsNew`. */
  guestId: string | null;
  /** True when a fresh guest id was minted and must be persisted via Set-Cookie. */
  guestIsNew: boolean;
}

/** Map a DB `profiles.plan` value to a tier (defaults to friend for any account). */
function planToTier(plan: unknown): AccountTier {
  return plan === "advanced" ? "advanced" : plan === "standard" ? "standard" : "friend";
}

export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
}

/** Read a single cookie value from a standard Request. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Determine who this request belongs to and their daily limit. Signed-in users
 * are identified by their verified JWT (subject + plan from the DB); everyone
 * else is a guest keyed on an httpOnly cookie.
 */
export async function resolveSubject(
  admin: Admin,
  request: Request,
): Promise<ResolvedSubject> {
  const token = bearerToken(request);
  if (token) {
    const { data, error } = await admin.auth.getUser(token);
    const user = error ? null : data.user;
    if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan, current_period_end, subscription_status")
        .eq("id", user.id)
        .maybeSingle();
      // A logged-in user with no profile row still resolves to the account
      // default tier here, but bill-time updates would no-op - so heal the row.
      if (!profile) await ensureProfile(admin, user);
      const tier = planToTier(profile?.plan);
      return {
        subject: `user:${user.id}`,
        tier,
        limit: FREE_LIMITS[tier],
        renewsAt: profile?.current_period_end ?? null,
        status: profile?.subscription_status ?? null,
        guestId: null,
        guestIsNew: false,
      };
    }
  }

  const existing = readCookie(request, GUEST_COOKIE);
  const guestId = existing ?? crypto.randomUUID();
  return {
    subject: `guest:${guestId}`,
    tier: "guest",
    limit: FREE_LIMITS.guest,
    renewsAt: null,
    status: null,
    guestId,
    guestIsNew: !existing,
  };
}

/** Atomically grant up to `units` generations without exceeding `limit`. */
export async function consumeQuota(
  admin: Admin,
  subject: string,
  limit: number,
  units: number,
): Promise<{ granted: number; snapshot: QuotaSnapshot }> {
  const { data, error } = await admin.rpc("consume_quota", {
    p_subject: subject,
    p_limit: limit,
    p_units: units,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : undefined;
  const used = row?.used ?? 0;
  const granted = row?.granted ?? 0;
  return {
    granted,
    snapshot: { used, limit, remaining: Math.max(0, limit - used) },
  };
}

/** Refund reserved units back to the subject's current-day counter. */
export async function releaseQuota(
  admin: Admin,
  subject: string,
  units: number,
): Promise<void> {
  if (units <= 0) return;
  await admin.rpc("release_quota", { p_subject: subject, p_units: units });
}

/** Read current usage without consuming any. */
export async function peekQuota(
  admin: Admin,
  subject: string,
  limit: number,
): Promise<QuotaSnapshot> {
  const nowUtcDay = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("usage_daily")
    .select("count")
    .eq("subject", subject)
    .eq("day", nowUtcDay)
    .maybeSingle();
  const used = data?.count ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
