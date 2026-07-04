"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { TIER_META } from "@/lib/limits";
import { useServerQuota } from "@/lib/useServerQuota";
import { useAuth } from "@/lib/useAuth";

export default function SubscriptionPage() {
  const { loading, user, session } = useAuth();
  const quota = useServerQuota(session?.access_token ?? null, user ? "friend" : "guest");
  const meta = TIER_META[quota.tier];
  const hasSubscription = quota.tier === "tea" || quota.tier === "sugar";
  const renewsAtLabel = quota.renewsAt
    ? new Date(quota.renewsAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const [justCheckedOut, setJustCheckedOut] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stalled = justCheckedOut && !hasSubscription && attempts >= 6;

  useEffect(() => {
    setJustCheckedOut(
      new URLSearchParams(window.location.search).get("checkout") === "success",
    );
  }, []);

  // Celebrate, and poll for the webhook to flip the plan (it lands async).
  useEffect(() => {
    if (!justCheckedOut) return;
    let cancelled = false;

    import("canvas-confetti")
      .then((mod) => {
        if (cancelled) return;
        const confetti = mod.default;
        const colors = ["#ffffff", "#d4d4d8", "#a1a1aa", "#3ecf8e"];
        confetti({
          particleCount: 140,
          spread: 75,
          startVelocity: 45,
          origin: { y: 0.35 },
          colors,
          disableForReducedMotion: true,
        });
        window.setTimeout(() => {
          if (cancelled) return;
          confetti({
            particleCount: 90,
            spread: 110,
            scalar: 0.9,
            origin: { y: 0.4 },
            colors,
            disableForReducedMotion: true,
          });
        }, 250);
      })
      .catch(() => {});

    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      quota.refresh();
      setAttempts(tries);
      if (tries >= 6) window.clearInterval(id);
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [justCheckedOut, quota.refresh]);

  const openPortal = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  // ---- Post-checkout thank-you ----
  if (justCheckedOut) {
    return (
      <PageShell>
        <header className="mx-auto max-w-3xl text-center">
          <p className="eyebrow justify-center">Payment complete</p>
          <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
            Thank you<span className="neon-text">!</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
            You&apos;re officially <span className="font-semibold text-white">{meta.label}</span> —
            Namblo appreciates you more than words. 💛
          </p>
        </header>

        <div className="mx-auto mt-12 max-w-2xl">
          <section className="glass p-8">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-white/40">Your plan</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/65">
                {quota.limit} names / day
              </span>
            </div>
            <p className="mt-1 text-3xl font-black tracking-tight text-white">{meta.label}</p>
            {hasSubscription && renewsAtLabel && (
              <p className="mt-2 text-xs text-white/45">Next payment · {renewsAtLabel}</p>
            )}

            {hasSubscription ? (
              <>
                <p className="mt-6 text-sm font-semibold text-white/80">What you&apos;ve unlocked</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/70">
                  {meta.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3ecf8e]/15 text-[10px] text-[#3ecf8e]">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : stalled ? (
              <div className="mt-6">
                <p className="text-sm leading-snug text-white/55">
                  Still processing your upgrade. If you just paid, it can take a moment to land —
                  or the payment webhook may not be running yet.
                </p>
                <button
                  type="button"
                  onClick={() => quota.refresh()}
                  className="btn-ghost mt-3 text-sm"
                >
                  Refresh status
                </button>
              </div>
            ) : (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-white/55">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                Activating your plan — this can take a few seconds…
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/" className="btn-primary text-sm">
                Start naming
              </Link>
              {hasSubscription && (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  {busy ? "Opening…" : "Manage subscription"}
                </button>
              )}
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </section>
        </div>
      </PageShell>
    );
  }

  // ---- Normal subscription view ----
  return (
    <PageShell>
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow justify-center">Account</p>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
          Your <span className="neon-text">subscription</span>
        </h1>
      </header>

      <div className="mx-auto mt-12 max-w-2xl space-y-6">
        {loading ? (
          <p className="text-center text-sm text-white/40">Checking session…</p>
        ) : !user ? (
          <section className="glass p-8 text-center">
            <p className="text-sm text-white/60">Log in to manage your subscription.</p>
            <Link href="/?panel=account" className="btn-primary mt-5 text-sm">
              Log in
            </Link>
          </section>
        ) : (
          <section className="glass p-8">
            <span className="text-xs uppercase tracking-wide text-white/40">Current plan</span>
            <p className="mt-1 text-3xl font-black tracking-tight text-white">{meta.label}</p>
            <p className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/65">
              {quota.limit} names / day
            </p>

            {hasSubscription && renewsAtLabel && (
              <p className="mt-3 text-sm text-white/50">
                Next payment:{" "}
                <span className="font-medium text-white/80">{renewsAtLabel}</span>
              </p>
            )}

            <div className="mt-6">
              <p className="text-sm font-semibold text-white/80">What&apos;s included</p>
              <ul className="mt-3 space-y-2.5 text-sm text-white/70">
                {meta.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/70">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {quota.tier !== "sugar" && (
                <Link href="/pricing" className="btn-primary text-sm">
                  Upgrade plan
                </Link>
              )}
              {hasSubscription && (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  {busy ? "Opening…" : "Manage subscription"}
                </button>
              )}
            </div>

            {hasSubscription && (
              <p className="mt-3 text-xs text-white/40">
                Cancel, switch plans, or update your card in the billing portal.
              </p>
            )}

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </section>
        )}
      </div>
    </PageShell>
  );
}
