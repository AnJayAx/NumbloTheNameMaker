"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { PLAN_TIERS, TIER_META, type AccountTier } from "@/lib/limits";
import { MODEL_PROVIDERS } from "@/lib/llm/models";
import type { LlmProvider } from "@/lib/types";

interface Props {
  open: boolean;
  tier: AccountTier;
  authenticated: boolean;
  apiKeys: Record<LlmProvider, string>;
  freeUsedToday: number;
  freeLimit: number;
  onOpenChange: (open: boolean) => void;
  onApiKeyChange: (provider: LlmProvider, apiKey: string) => void;
  onClearApiKeys: () => void;
}

type Tab = "keys" | "billing";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "keys", label: "API Keys" },
  { id: "billing", label: "Billing" },
];

export default function SettingsPanel({
  open,
  tier,
  authenticated,
  apiKeys,
  freeUsedToday,
  freeLimit,
  onOpenChange,
  onApiKeyChange,
  onClearApiKeys,
}: Props) {
  const [tab, setTab] = useState<Tab>("keys");
  const quotaUsed = freeUsedToday;
  const quotaLimit = freeLimit;
  const apiKeysEnabled = tier !== "guest";

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Settings" ariaLabel="Settings">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/55 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "keys" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Your API keys</span>
            {!apiKeysEnabled && (
              <span className="text-[11px] text-white/35">Log in to use your own keys</span>
            )}
          </div>
          <div className="space-y-3">
            {MODEL_PROVIDERS.map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor={`apiKey-${item.id}`} className="text-xs font-medium text-white/65">
                    {item.keyLabel}
                  </label>
                  {apiKeys[item.id] && (
                    <span className="rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2 py-0.5 text-[10px] text-neon-lime">
                      Saved
                    </span>
                  )}
                </div>
                <input
                  id={`apiKey-${item.id}`}
                  type="password"
                  value={apiKeys[item.id]}
                  disabled={!apiKeysEnabled}
                  onChange={(event) => onApiKeyChange(item.id, event.target.value)}
                  placeholder={apiKeysEnabled ? "sk-..." : "Log in to use your own key"}
                  className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            ))}
          </div>
          <p className="text-xs leading-snug text-white/35">
            Keys are stored in this browser and sent only with generation requests.
          </p>
          <button
            type="button"
            onClick={onClearApiKeys}
            className="text-xs text-white/40 transition hover:text-red-300"
          >
            Clear API keys
          </button>
        </section>
      )}

      {tab === "billing" && (
        <section className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white/80">Current usage</span>
              <span className="font-mono text-xs text-white/35">
                {quotaUsed}/{quotaLimit}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/45">Free names used today.</p>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold text-white/80">Plan</span>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_TIERS.map((planTier) => {
                const meta = TIER_META[planTier];
                const current = tier === planTier;
                const cls = [
                  "block h-full rounded-lg border px-2.5 py-2 text-left transition",
                  current
                    ? "border-white/30 bg-white/[0.08]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25",
                ].join(" ");
                const inner = (
                  <>
                    <span className="block text-sm font-semibold text-white">{meta.short}</span>
                    <span className="block text-[10px] text-white/45">{meta.price}</span>
                    <span className="mt-1 block text-[10px] text-white/35">
                      {current ? "Current plan" : "Upgrade"}
                    </span>
                  </>
                );
                return current ? (
                  <div key={planTier} className={cls}>
                    {inner}
                  </div>
                ) : (
                  <Link
                    key={planTier}
                    href={authenticated ? "/pricing" : "/?panel=account"}
                    className={cls}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>

          <p className="text-xs leading-snug text-white/40">
            Add your own API key to generate without limits — Namblo only uses it for
            generation requests.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/subscription"
              className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-center text-sm font-semibold text-white/80 transition hover:border-white/30"
            >
              Manage subscription
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-center text-sm font-semibold text-white/80 transition hover:border-white/30"
            >
              Compare plans
            </Link>
          </div>
        </section>
      )}
    </Modal>
  );
}
