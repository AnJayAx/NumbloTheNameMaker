"use client";

import { useState } from "react";
import { FREE_LIMITS, type AccountTier } from "@/lib/useAiSettings";
import { MODEL_PROVIDERS } from "@/lib/llm/models";
import type { LlmProvider } from "@/lib/types";

interface Props {
  accountTier: AccountTier;
  provider: LlmProvider;
  model: string;
  apiKeys: Record<LlmProvider, string>;
  historyCount: number;
  generatedToday: number;
  onAccountTierChange: (tier: AccountTier) => void;
  onProviderChange: (provider: LlmProvider) => void;
  onModelChange: (provider: LlmProvider, model: string) => void;
  onApiKeyChange: (provider: LlmProvider, apiKey: string) => void;
  onClearApiKeys: () => void;
}

const TIERS: Array<{ id: AccountTier; label: string; detail: string }> = [
  { id: "guest", label: "Guest", detail: "10 free names" },
  { id: "signed-in", label: "Logged in", detail: "30 free names" },
  { id: "paid", label: "Paid", detail: "100 names daily" },
];

export default function SettingsPanel({
  accountTier,
  provider,
  model,
  apiKeys,
  historyCount,
  generatedToday,
  onAccountTierChange,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onClearApiKeys,
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedProvider = MODEL_PROVIDERS.find((item) => item.id === provider) ?? MODEL_PROVIDERS[0];
  const quotaUsed = accountTier === "paid" ? generatedToday : historyCount;
  const quotaLimit = FREE_LIMITS[accountTier];
  const apiKeysEnabled = accountTier !== "guest";
  const modelControlsEnabled = accountTier !== "guest";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-28 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-700/80 px-4 py-2 text-sm text-white/80 shadow-led-soft backdrop-blur-xl transition hover:border-neon-purple/40 hover:text-white"
      >
        <span className="font-mono text-neon-purple">S</span>
        Settings
      </button>

      <div
        className={[
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={[
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
        <aside
          role="dialog"
          aria-label="Settings"
          className={[
            "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 backdrop-blur-xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-white/60 transition hover:text-white"
            >
              x
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <section>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white/80">
                <span>Account</span>
                <span className="font-mono text-xs text-white/35">
                  {quotaUsed}/{quotaLimit}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((tier) => {
                  const active = accountTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => onAccountTierChange(tier.id)}
                      className={[
                        "rounded-lg border px-2 py-2 text-left transition",
                        active
                          ? "border-neon-cyan/50 bg-neon-cyan/10 text-white shadow-led-cyan"
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold">{tier.label}</span>
                      <span className="block text-[10px] text-white/35">{tier.detail}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <span className="mb-2 block text-sm font-semibold text-white/80">Provider</span>
              <div className="grid grid-cols-3 gap-2">
                {MODEL_PROVIDERS.map((item) => {
                  const active = provider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!modelControlsEnabled}
                      onClick={() => onProviderChange(item.id)}
                      className={[
                        "rounded-lg border px-2 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "border-neon-magenta/50 bg-neon-magenta/10 text-white shadow-led-magenta"
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <label htmlFor="model" className="mb-2 block text-sm font-semibold text-white/80">
                Model
              </label>
              <select
                id="model"
                value={model}
                disabled={!modelControlsEnabled}
                onChange={(event) => onModelChange(provider, event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-700/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedProvider.models.map((item) => (
                  <option key={item.id} value={item.id} className="bg-ink-800 text-white">
                    {item.label} - {item.cost}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-snug text-white/40">
                {modelControlsEnabled
                  ? selectedProvider.models.find((item) => item.id === model)?.blurb
                  : "Guest generations use the platform's low-cost model."}
              </p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="apiKey" className="text-sm font-semibold text-white/80">
                  {selectedProvider.keyLabel}
                </label>
                {apiKeys[provider] && (
                  <span className="rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2 py-0.5 text-[10px] text-neon-lime">
                    Saved
                  </span>
                )}
              </div>
              <input
                id="apiKey"
                type="password"
                value={apiKeys[provider]}
                disabled={!apiKeysEnabled}
                onChange={(event) => onApiKeyChange(provider, event.target.value)}
                placeholder={apiKeysEnabled ? "sk-..." : "Log in to use your own key"}
                className="w-full rounded-xl border border-white/10 bg-ink-700/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-2 text-xs leading-snug text-white/35">
                Keys are stored in this browser and sent only with generation requests.
              </p>
            </section>
          </div>

          <div className="border-t border-white/10 px-5 py-3">
            <button
              type="button"
              onClick={onClearApiKeys}
              className="text-xs text-white/40 transition hover:text-red-300"
            >
              Clear API keys
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
