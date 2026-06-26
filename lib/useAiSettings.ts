"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PROVIDER,
  getDefaultModel,
  MODEL_PROVIDERS,
  type ProviderOption,
} from "@/lib/llm/models";
import type { LlmProvider } from "@/lib/types";

export type AccountTier = "guest" | "signed-in" | "paid";

export interface AiSettings {
  accountTier: AccountTier;
  provider: LlmProvider;
  modelByProvider: Record<LlmProvider, string>;
  apiKeys: Record<LlmProvider, string>;
}

const STORAGE_KEY = "mark.ai-settings.v1";

export const FREE_LIMITS: Record<AccountTier, number> = {
  guest: 10,
  "signed-in": 30,
  paid: 100,
};

const DEFAULT_SETTINGS: AiSettings = {
  accountTier: "guest",
  provider: DEFAULT_PROVIDER,
  modelByProvider: {
    claude: getDefaultModel("claude"),
    openai: getDefaultModel("openai"),
    gemini: getDefaultModel("gemini"),
  },
  apiKeys: {
    claude: "",
    openai: "",
    gemini: "",
  },
};

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(normalizeSettings(JSON.parse(raw)));
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage full or unavailable */
    }
  }, [settings, hydrated]);

  const selectedProvider = useMemo(
    () => MODEL_PROVIDERS.find((provider) => provider.id === settings.provider) ?? MODEL_PROVIDERS[0],
    [settings.provider],
  );
  const selectedModel = settings.modelByProvider[settings.provider] || getDefaultModel(settings.provider);
  const selectedApiKey = settings.apiKeys[settings.provider]?.trim() ?? "";

  const setAccountTier = useCallback((accountTier: AccountTier) => {
    setSettings((prev) => ({ ...prev, accountTier }));
  }, []);

  const setProvider = useCallback((provider: LlmProvider) => {
    setSettings((prev) => ({ ...prev, provider }));
  }, []);

  const setModel = useCallback((provider: LlmProvider, model: string) => {
    setSettings((prev) => ({
      ...prev,
      modelByProvider: { ...prev.modelByProvider, [provider]: model },
    }));
  }, []);

  const setApiKey = useCallback((provider: LlmProvider, apiKey: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: apiKey },
    }));
  }, []);

  const clearApiKeys = useCallback(() => {
    setSettings((prev) => ({ ...prev, apiKeys: DEFAULT_SETTINGS.apiKeys }));
  }, []);

  return {
    settings,
    hydrated,
    selectedProvider,
    selectedModel,
    selectedApiKey,
    setAccountTier,
    setProvider,
    setModel,
    setApiKey,
    clearApiKeys,
  };
}

function normalizeSettings(value: unknown): AiSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const partial = value as Partial<AiSettings>;
  const provider = isProvider(partial.provider) ? partial.provider : DEFAULT_PROVIDER;
  const accountTier = isAccountTier(partial.accountTier) ? partial.accountTier : "guest";

  return {
    accountTier,
    provider,
    modelByProvider: normalizeModels(partial.modelByProvider),
    apiKeys: normalizeApiKeys(partial.apiKeys),
  };
}

function normalizeModels(value: unknown): Record<LlmProvider, string> {
  const partial = value && typeof value === "object" ? (value as Partial<Record<LlmProvider, string>>) : {};
  return {
    claude: typeof partial.claude === "string" ? partial.claude : getDefaultModel("claude"),
    openai: typeof partial.openai === "string" ? partial.openai : getDefaultModel("openai"),
    gemini: typeof partial.gemini === "string" ? partial.gemini : getDefaultModel("gemini"),
  };
}

function normalizeApiKeys(value: unknown): Record<LlmProvider, string> {
  const partial = value && typeof value === "object" ? (value as Partial<Record<LlmProvider, string>>) : {};
  return {
    claude: typeof partial.claude === "string" ? partial.claude : "",
    openai: typeof partial.openai === "string" ? partial.openai : "",
    gemini: typeof partial.gemini === "string" ? partial.gemini : "",
  };
}

function isProvider(value: unknown): value is LlmProvider {
  return MODEL_PROVIDERS.some((provider: ProviderOption) => provider.id === value);
}

function isAccountTier(value: unknown): value is AccountTier {
  return value === "guest" || value === "signed-in" || value === "paid";
}
