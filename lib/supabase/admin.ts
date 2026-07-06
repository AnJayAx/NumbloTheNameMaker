import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client for server-only use (API routes). Bypasses RLS,
 * so it must never be imported into client code. Returns `null` when the
 * service-role key isn't configured - callers should treat that as
 * "enforcement disabled" and fail open, so local/dev without the secret still
 * works.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}

/**
 * Best-effort: guarantee a signed-in user has a `profiles` row. The DB trigger
 * seeds one at sign-up, but users created before the trigger existed (early
 * OAuth sign-ins, admin-API users) can be missing it - and billing writes
 * (checkout + webhook) silently no-op without a row, so a paid plan can never
 * land. Keyed on the user id so it never overwrites an existing profile; safe
 * to call on every authenticated request.
 */
export async function ensureProfile(
  admin: SupabaseClient<Database>,
  user: { id: string },
): Promise<void> {
  const username = `user${user.id.replace(/-/g, "").slice(0, 12)}`;
  try {
    await admin
      .from("profiles")
      .upsert({ id: user.id, username }, { onConflict: "id", ignoreDuplicates: true });
  } catch {
    // Non-fatal: tier falls back to the account default and the caller proceeds.
  }
}

/** Extract a Bearer token from the Authorization header (empty string if none). */
export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/** Verify the request's Bearer token and return the Supabase user (or null). */
export async function getUserFromRequest(request: Request) {
  const admin = getSupabaseAdmin();
  const token = bearerToken(request);
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}
