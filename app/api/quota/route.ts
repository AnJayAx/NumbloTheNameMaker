import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { peekQuota, resolveSubject, setGuestCookie } from "@/lib/quota.server";
import { FREE_LIMITS } from "@/lib/limits";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();

  // Enforcement disabled (no service role): report as unenforced so the client
  // falls back to its own tier limit and never blocks.
  if (!admin) {
    return NextResponse.json({
      used: 0,
      limit: FREE_LIMITS.guest,
      remaining: FREE_LIMITS.guest,
      tier: "guest",
      enforced: false,
    });
  }

  try {
    const resolved = await resolveSubject(admin, request);
    const snapshot = await peekQuota(admin, resolved.subject, resolved.limit);
    const res = NextResponse.json({
      ...snapshot,
      tier: resolved.tier,
      renewsAt: resolved.renewsAt,
      status: resolved.status,
      enforced: true,
    });
    if (resolved.guestIsNew && resolved.guestId) setGuestCookie(res, resolved.guestId);
    return res;
  } catch {
    // Never let a quota read break the page — report unenforced.
    return NextResponse.json({
      used: 0,
      limit: FREE_LIMITS.guest,
      remaining: FREE_LIMITS.guest,
      tier: "guest",
      enforced: false,
    });
  }
}
