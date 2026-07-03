import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client for server-only use (API routes). Bypasses RLS,
 * so it must never be imported into client code. Returns `null` when the
 * service-role key isn't configured — callers should treat that as
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
