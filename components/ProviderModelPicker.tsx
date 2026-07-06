"use client";

import Select from "@/components/Select";
import { MODEL_PROVIDERS } from "@/lib/llm/models";
import { modelAllowed, TIER_META, type AccountTier, type ModelCost } from "@/lib/limits";
import type { LlmProvider } from "@/lib/types";

/** Lowest tier that can run a model of this cost on the platform key. */
const TIER_ORDER: AccountTier[] = ["guest", "friend", "standard", "advanced"];
function requiredTierName(cost: ModelCost): string {
  const tier = TIER_ORDER.find((t) => modelAllowed(t, cost, false)) ?? "advanced";
  return TIER_META[tier].short;
}

interface Props {
  provider: LlmProvider;
  model: string;
  /** Provider/model choice is only honored for logged-in tiers. */
  enabled: boolean;
  /** Effective tier - gates premium models on the platform key. */
  tier: AccountTier;
  /** Saved API keys per provider, used to show which providers stay unlocked. */
  apiKeys: Record<LlmProvider, string>;
  /** True once the daily free pool is used up. */
  freeExhausted: boolean;
  onProviderChange: (provider: LlmProvider) => void;
  onModelChange: (provider: LlmProvider, model: string) => void;
}

export default function ProviderModelPicker({
  provider,
  model,
  enabled,
  tier,
  apiKeys,
  freeExhausted,
  onProviderChange,
  onModelChange,
}: Props) {
  const selectedProvider =
    MODEL_PROVIDERS.find((item) => item.id === provider) ?? MODEL_PROVIDERS[0];
  const activeModel = selectedProvider.models.find((item) => item.id === model);
  const hasKeyForSelected = Boolean(apiKeys[provider]?.trim());
  // With the free pool gone, the selected provider needs its own key to run.
  const needsKey = enabled && freeExhausted && !hasKeyForSelected;

  return (
    <div className="glass space-y-5 p-5 sm:p-6">
      <div>
        <span className="mb-2 block text-sm font-semibold text-white/80">AI provider</span>
        <div className="grid grid-cols-3 gap-2">
          {MODEL_PROVIDERS.map((item) => {
            const active = provider === item.id;
            const locked = enabled && freeExhausted && !apiKeys[item.id]?.trim();
            return (
              <button
                key={item.id}
                type="button"
                disabled={!enabled}
                onClick={() => onProviderChange(item.id)}
                aria-pressed={active}
                title={locked ? `Add a ${item.label} key to use it` : undefined}
                className={[
                  "rounded-xl border px-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                  active
                    ? "border-neon-cyan/50 bg-neon-cyan/[0.1] text-white shadow-led-cyan"
                    : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25 hover:text-white/80",
                ].join(" ")}
              >
                {locked ? `🔒 ${item.label}` : item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="gen-model" className="mb-2 block text-sm font-semibold text-white/80">
          Model
        </label>
        <Select
          id="gen-model"
          value={model}
          disabled={!enabled}
          ariaLabel="Model"
          options={selectedProvider.models.map((item) => {
            const allowed = modelAllowed(tier, item.cost, hasKeyForSelected);
            return {
              value: item.id,
              label: item.label,
              hint: allowed ? item.cost : `🔒 ${requiredTierName(item.cost)}`,
              disabled: !allowed,
            };
          })}
          onChange={(next) => onModelChange(provider, next)}
        />
        <p
          className={[
            "mt-2 text-xs leading-snug",
            needsKey ? "text-amber-200/80" : "text-white/40",
          ].join(" ")}
        >
          {!enabled
            ? "Guest generations use the platform's low-cost model. Log in to choose a provider and model."
            : needsKey
              ? `🔒 Free names used up - add a ${selectedProvider.label} key in Settings to keep using it, or pick a provider you have a key for.`
              : activeModel?.blurb}
        </p>
      </div>
    </div>
  );
}
