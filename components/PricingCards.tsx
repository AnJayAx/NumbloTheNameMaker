"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { TIER_META, type AccountTier } from "@/lib/limits";
import { useAuth } from "@/lib/useAuth";
import { useServerQuota } from "@/lib/useServerQuota";

const FREE_TIERS: AccountTier[] = ["guest", "friend"];
const PREMIUM_TIERS: AccountTier[] = ["standard", "advanced"];
const RANK: Record<AccountTier, number> = { guest: 0, friend: 1, standard: 2, advanced: 3 };

interface Cta {
  label: string;
  kind: "link" | "checkout" | "portal" | "current" | "none";
  href?: string;
  tier?: "standard" | "advanced";
  variant?: "primary" | "ghost";
}

/** The CTA a card should show given the viewer's tier. */
function ctaFor(tier: AccountTier, current: AccountTier, loggedIn: boolean): Cta {
  if (!loggedIn) {
    switch (tier) {
      case "guest":
        return { label: "Start naming", kind: "link", href: "/", variant: "ghost" };
      case "friend":
        return { label: "Log in", kind: "link", href: "/?panel=account", variant: "primary" };
      case "standard":
        return { label: "Subscribe", kind: "link", href: "/?panel=account", variant: "primary" };
      case "advanced":
        return { label: "Subscribe", kind: "link", href: "/?panel=account", variant: "primary" };
    }
  }

  if (tier === current) {
    return { label: tier === "friend" ? "Logged in" : "Current plan", kind: "current" };
  }
  if (tier === "guest") return { label: "", kind: "none" };

  const up = RANK[tier] > RANK[current];
  // Already subscribed → all plan changes go through the billing portal;
  // otherwise (currently free) start a fresh checkout for the chosen tier.
  const hasPaidSub = current === "standard" || current === "advanced";
  if (hasPaidSub) {
    return { label: up ? "Upgrade" : "Downgrade", kind: "portal", variant: up ? "primary" : "ghost" };
  }
  return { label: "Upgrade", kind: "checkout", tier: tier as "standard" | "advanced", variant: "primary" };
}

export default function PricingCards() {
  const { user, session } = useAuth();
  const quota = useServerQuota(session?.access_token ?? null, user ? "friend" : "guest");
  const current = quota.tier;
  const loggedIn = Boolean(user);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (path: string, id: string, body?: object) => {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  };

  const renderCta = (cta: Cta) => {
    if (cta.kind === "none") return <div className="h-[42px]" aria-hidden />;
    if (cta.kind === "current") {
      return (
        <div className="flex h-[42px] w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-white/55">
          {cta.label}
        </div>
      );
    }
    if (cta.kind === "link") {
      return (
        <Link
          href={cta.href ?? "#"}
          className={cta.variant === "primary" ? "btn-primary w-full text-sm" : "btn-ghost w-full text-sm"}
        >
          {cta.label}
        </Link>
      );
    }
    // checkout / portal
    const id = cta.kind === "checkout" ? `checkout:${cta.tier}` : "portal";
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() =>
          cta.kind === "checkout"
            ? go("/api/stripe/checkout", id, { tier: cta.tier })
            : go("/api/stripe/portal", id)
        }
        className={cta.variant === "primary" ? "btn-primary w-full text-sm" : "btn-ghost w-full text-sm"}
      >
        {busy === id ? "Redirecting…" : cta.label}
      </button>
    );
  };

  const renderCard = (tier: AccountTier) => {
    const meta = TIER_META[tier];
    const isCurrent = tier === current;
    const badge = isCurrent ? "Current" : tier === "friend" ? "Popular" : null;
    const cta = ctaFor(tier, current, loggedIn);
    return (
      <section
        key={tier}
        className={[
          "glass card-hover relative flex h-full flex-col p-6",
          isCurrent ? "border-white/30" : "",
        ].join(" ")}
      >
        {/* Reserved badge row keeps every card's title/price aligned. */}
        <div className="mb-3 h-5">
          {badge && (
            <span className="inline-flex rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
              {badge}
            </span>
          )}
        </div>
        <h2 className="flex min-h-[2.75rem] items-start text-base font-semibold leading-tight text-white">
          {meta.label}
        </h2>
        <p className="mt-2 text-3xl font-black tracking-tight text-white">{meta.price}</p>
        <p className="mt-1 text-xs text-white/45">{meta.tagline}</p>

        <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/65">
          {meta.features.map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/70">
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">{renderCta(cta)}</div>
      </section>
    );
  };

  return (
    <>
      <div className="mx-auto mt-14 max-w-2xl space-y-12">
        <div>
          <GroupTitle>Free</GroupTitle>
          <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2">
            {FREE_TIERS.map(renderCard)}
          </div>
        </div>
        <div>
          <GroupTitle>Premium</GroupTitle>
          <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2">
            {PREMIUM_TIERS.map(renderCard)}
          </div>
        </div>
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-red-300">{error}</p>
      )}
    </>
  );
}

/** Centered section heading with a hairline rule flanking it on both sides. */
function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        {children}
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
