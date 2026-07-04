import { NextResponse } from "next/server";
import { ensureProfile, getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/admin";
import { getStripe, priceForTier } from "@/lib/stripe";

export const runtime = "nodejs";

/** Start a Stripe Checkout session for a paid tier. Returns { url } to redirect to. */
export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  if (!stripe || !admin) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 501 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  // Guarantee the profile row exists before writing billing fields to it —
  // otherwise the customer-id update below and the webhook's plan update both
  // silently no-op, and the user would pay without ever getting the plan.
  await ensureProfile(admin, user);

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tier = body.tier;
  if (tier !== "tea" && tier !== "sugar") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  const price = priceForTier(tier);
  if (!price) {
    return NextResponse.json({ error: "That plan isn't available yet." }, { status: 400 });
  }

  // Reuse the user's Stripe customer, or create one and remember it.
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/subscription?checkout=success`,
    cancel_url: `${origin}/pricing`,
    metadata: { user_id: user.id, tier },
    subscription_data: { metadata: { user_id: user.id, tier } },
  });

  return NextResponse.json({ url: session.url });
}
