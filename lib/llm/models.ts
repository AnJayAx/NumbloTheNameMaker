import type { LlmProvider } from "@/lib/types";

export interface ModelOption {
  id: string;
  label: string;
  blurb: string;
  cost: "low" | "medium" | "high";
}

export interface ProviderOption {
  id: LlmProvider;
  label: string;
  keyLabel: string;
  envKey: string;
  models: ModelOption[];
}

export const MODEL_PROVIDERS: ProviderOption[] = [
  {
    id: "claude",
    label: "Claude",
    keyLabel: "Anthropic API key",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        blurb: "Fastest Claude option for lightweight naming.",
        cost: "low",
      },
      {
        id: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
        blurb: "Balanced speed and quality.",
        cost: "medium",
      },
      {
        id: "claude-opus-4-8",
        label: "Claude Opus 4.8",
        blurb: "Highest Claude capability.",
        cost: "high",
      },
      {
        id: "claude-fable-5",
        label: "Claude Fable 5",
        blurb: "Most capable widely released Claude model.",
        cost: "high",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI GPT",
    keyLabel: "OpenAI API key",
    envKey: "OPENAI_API_KEY",
    models: [
      {
        id: "gpt-5.4-mini",
        label: "GPT-5.4 mini",
        blurb: "Lower-cost GPT for fast generations.",
        cost: "low",
      },
      {
        id: "gpt-5.4",
        label: "GPT-5.4",
        blurb: "Balanced GPT model for professional work.",
        cost: "medium",
      },
      {
        id: "gpt-5.5",
        label: "GPT-5.5",
        blurb: "Frontier GPT model for complex work.",
        cost: "high",
      },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    keyLabel: "Gemini API key",
    envKey: "GEMINI_API_KEY",
    models: [
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash-Lite",
        blurb: "Lowest-latency, lowest-cost Gemini option.",
        cost: "low",
      },
      {
        id: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash",
        blurb: "Fast frontier-level Gemini model.",
        cost: "medium",
      },
      {
        id: "gemini-3-flash-preview",
        label: "Gemini 3 Flash Preview",
        blurb: "Preview Gemini 3 model.",
        cost: "medium",
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro Preview",
        blurb: "Higher-capability Gemini Pro preview.",
        cost: "high",
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        blurb: "Stable low-cost fallback.",
        cost: "low",
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        blurb: "Stable price-performance fallback.",
        cost: "medium",
      },
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        blurb: "Stable high-capability Gemini fallback.",
        cost: "high",
      },
    ],
  },
];

export const DEFAULT_PROVIDER: LlmProvider = "claude";
export const PLATFORM_FREE_PROVIDER: LlmProvider = "claude";
export const PLATFORM_FREE_MODEL = "claude-haiku-4-5";

export function getProviderOption(provider: LlmProvider): ProviderOption {
  return MODEL_PROVIDERS.find((option) => option.id === provider) ?? MODEL_PROVIDERS[0];
}

export function getDefaultModel(provider: LlmProvider): string {
  return getProviderOption(provider).models[0]?.id ?? PLATFORM_FREE_MODEL;
}

export function isKnownModel(provider: LlmProvider, model: string): boolean {
  return getProviderOption(provider).models.some((option) => option.id === model);
}
