import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPrice } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** Read `current_period_end` defensively — top-level on older API versions,
 *  on the subscription item from 2025-03-31.basil onward. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const ts = top ?? item;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

/** Stripe subscription webhook → keep `profiles.plan` in sync. */
export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !admin || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  const patchProfile = async (
    match: { userId?: string; customerId?: string },
    patch: ProfileUpdate,
  ) => {
    if (match.userId) {
      await admin.from("profiles").update(patch).eq("id", match.userId);
    } else if (match.customerId) {
      await admin.from("profiles").update(patch).eq("stripe_customer_id", match.customerId);
    }
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const tier = s.metadata?.tier;
      if (s.metadata?.user_id && (tier === "tea" || tier === "sugar")) {
        await patchProfile(
          { userId: s.metadata.user_id },
          {
            plan: tier,
            stripe_customer_id: typeof s.customer === "string" ? s.customer : undefined,
            stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : null,
            subscription_status: "active",
          },
        );
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tier = tierForPrice(sub.items.data[0]?.price.id);
      const active = sub.status === "active" || sub.status === "trialing";
      await patchProfile(
        {
          userId: sub.metadata?.user_id,
          customerId: typeof sub.customer === "string" ? sub.customer : undefined,
        },
        {
          plan: active && tier ? tier : "friend",
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: periodEndIso(sub),
        },
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await patchProfile(
        {
          userId: sub.metadata?.user_id,
          customerId: typeof sub.customer === "string" ? sub.customer : undefined,
        },
        { plan: "friend", stripe_subscription_id: null, subscription_status: "canceled" },
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
