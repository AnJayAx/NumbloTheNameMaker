"use client";

import { useRef, useState } from "react";
import LedBackground from "@/components/LedBackground";
import Hero from "@/components/Hero";
import ModeSelector from "@/components/ModeSelector";
import GeneratorForm, { type FormValues } from "@/components/GeneratorForm";
import HistoryPanel from "@/components/HistoryPanel";
import ResultsGrid from "@/components/ResultsGrid";
import SavedPanel from "@/components/SavedPanel";
import SettingsPanel from "@/components/SettingsPanel";
import { PLATFORM_FREE_MODEL, PLATFORM_FREE_PROVIDER } from "@/lib/llm/models";
import { FREE_LIMITS, useAiSettings, type AccountTier } from "@/lib/useAiSettings";
import {
  generatedNameKey,
  useGeneratedHistory,
  type GeneratedNameHistoryEntry,
} from "@/lib/useGeneratedHistory";
import { useSavedNames } from "@/lib/useSavedNames";
import { toDomain, type DomainResult, type GenerationMode, type NameIdea } from "@/lib/types";

type Status = "idle" | "generating" | "checking";
const MAX_FILL_ROUNDS = 12;
const REMOVAL_STEP_MS = 120;
const DEV_UNLIMITED = process.env.NEXT_PUBLIC_DEV_UNLIMITED === "true";

function createAbortError(): DOMException {
  return new DOMException("Generation stopped.", "AbortError");
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw createAbortError();
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(createAbortError());
      },
      { once: true },
    );
  });
}

function generatedToday(history: Array<{ generatedAt: number }>): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return history.filter((item) => item.generatedAt >= start.getTime()).length;
}

function quotaRemaining(tier: AccountTier, historyCount: number, todayCount: number): number {
  const used = tier === "paid" ? todayCount : historyCount;
  return Math.max(0, FREE_LIMITS[tier] - used);
}

function ideaFromHistory(entry: GeneratedNameHistoryEntry): NameIdea {
  return {
    name: entry.name,
    rationale: entry.rationale || "Previously generated name, rechecked for the selected TLDs.",
    style: entry.style || "history",
  };
}

function shouldCheckHistoryTld(entry: GeneratedNameHistoryEntry, tld: string): boolean {
  const result = entry.domains.find((domain) => domain.domain === toDomain(entry.name, tld));
  return !result || Boolean(result.error);
}

export default function Home() {
  const [mode, setMode] = useState<GenerationMode>("playful");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [ideas, setIdeas] = useState<NameIdea[]>([]);
  const [results, setResults] = useState<Record<string, DomainResult>>({});
  const [usedTlds, setUsedTlds] = useState<string[]>([]);
  const [llmProvider, setLlmProvider] = useState<string | undefined>();

  const { saved, isSaved, save, toggle, remove, clear } = useSavedNames();
  const aiSettings = useAiSettings();
  const {
    history: generatedHistory,
    hydrated: historyHydrated,
    keys: generatedHistoryKeys,
    names: generatedHistoryNames,
    remember: rememberGenerated,
    rememberDomains,
    clear: clearHistory,
  } = useGeneratedHistory();
  const todayCount = generatedToday(generatedHistory);
  const generationControllerRef = useRef<AbortController | null>(null);

  const handleStopGenerate = () => {
    generationControllerRef.current?.abort();
    setStatus("idle");
  };

  const handleGenerate = async (values: FormValues) => {
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;
    const { signal } = controller;

    setError(null);
    setStatus("generating");
    setIdeas([]);
    setResults({});
    setUsedTlds(values.tlds);
    setLlmProvider(undefined);

    const accepted: NameIdea[] = [];
    const accumulatedResults: Record<string, DomainResult> = {};
    const blockedKeys = new Set(generatedHistoryKeys);
    const promptExclusions = [...generatedHistoryNames];
    const ownApiKey =
      aiSettings.settings.accountTier === "guest" ? "" : aiSettings.selectedApiKey.trim();
    const usingOwnApiKey = Boolean(ownApiKey);
    const effectiveProvider =
      usingOwnApiKey || aiSettings.settings.accountTier !== "guest"
        ? aiSettings.settings.provider
        : PLATFORM_FREE_PROVIDER;
    const effectiveModel =
      usingOwnApiKey || aiSettings.settings.accountTier !== "guest"
        ? aiSettings.selectedModel
        : PLATFORM_FREE_MODEL;
    let remainingQuota =
      usingOwnApiKey || DEV_UNLIMITED
        ? Number.POSITIVE_INFINITY
        : quotaRemaining(aiSettings.settings.accountTier, generatedHistory.length, todayCount);
    let rounds = 0;

    const checkCandidates = async (candidates: NameIdea[], domainsToCheck: string[]) => {
      if (!candidates.length) return;

      throwIfAborted(signal);
      setStatus("checking");
      setIdeas([...accepted, ...candidates]);
      setResults({ ...accumulatedResults });

      const uniqueDomainsToCheck = Array.from(new Set(domainsToCheck));
      if (uniqueDomainsToCheck.length) {
        const checkRes = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: uniqueDomainsToCheck }),
          signal,
        });
        const checkData = await checkRes.json();
        throwIfAborted(signal);
        if (!checkRes.ok) throw new Error(checkData.error || "Domain check failed.");

        for (const result of checkData.results as DomainResult[]) {
          accumulatedResults[result.domain] = result;
        }
      }

      rememberDomains(candidates, accumulatedResults, values.tlds);
      setResults({ ...accumulatedResults });

      for (let i = 0; i < candidates.length; i += 1) {
        throwIfAborted(signal);
        const idea = candidates[i];
        const available = values.tlds.some(
          (tld) => accumulatedResults[toDomain(idea.name, tld)]?.available,
        );
        if (available && accepted.length < values.count) accepted.push(idea);

        setIdeas([...accepted, ...candidates.slice(i + 1)]);
        if (i < candidates.length - 1) await wait(REMOVAL_STEP_MS, signal);
      }
    };

    try {
      const historyToRecheck = generatedHistory
        .slice()
        .reverse()
        .filter((entry) => values.tlds.some((tld) => shouldCheckHistoryTld(entry, tld)))
        .slice(0, values.count);

      if (historyToRecheck.length) {
        for (const entry of historyToRecheck) {
          for (const result of entry.domains) {
            if (values.tlds.some((tld) => result.domain === toDomain(entry.name, tld))) {
              accumulatedResults[result.domain] = result;
            }
          }
        }

        await checkCandidates(
          historyToRecheck.map(ideaFromHistory),
          historyToRecheck.flatMap((entry) =>
            values.tlds
              .filter((tld) => shouldCheckHistoryTld(entry, tld))
              .map((tld) => toDomain(entry.name, tld)),
          ),
        );
      }

      while (accepted.length < values.count && rounds < MAX_FILL_ROUNDS) {
        rounds += 1;
        const shortfall = values.count - accepted.length;
        const requestCount = usingOwnApiKey ? shortfall : Math.min(shortfall, remainingQuota);

        if (requestCount <= 0) break;

        setStatus("generating");
        const generateRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            mode,
            ...values,
            count: requestCount,
            excludeNames: promptExclusions.slice(-500),
            provider: effectiveProvider,
            model: effectiveModel,
            apiKey: ownApiKey || undefined,
          }),
        });
        const generateData = await generateRes.json();
        throwIfAborted(signal);
        if (!generateRes.ok) throw new Error(generateData.error || "Generation failed.");

        const generated = ((generateData.ideas as NameIdea[]) ?? []).slice(0, requestCount);
        if (!generated.length) {
          throw new Error("Mark couldn't produce names this time. Try tweaking the brief.");
        }

        setLlmProvider(
          generateData.model ? `${generateData.provider} / ${generateData.model}` : generateData.provider,
        );
        promptExclusions.push(...generated.map((idea) => idea.name));

        const fresh = generated.filter((idea) => {
          const key = generatedNameKey(idea.name);
          if (!key || blockedKeys.has(key)) return false;
          blockedKeys.add(key);
          return true;
        });
        const candidates = fresh.slice(0, shortfall);

        rememberGenerated(candidates);
        if (!usingOwnApiKey && !DEV_UNLIMITED) remainingQuota -= candidates.length;

        if (!candidates.length) continue;

        await checkCandidates(
          candidates,
          candidates.flatMap((idea) => values.tlds.map((tld) => toDomain(idea.name, tld))),
        );
      }

      if (accepted.length < values.count) {
        const quotaHit = !usingOwnApiKey && !DEV_UNLIMITED && remainingQuota <= 0;
        setError(
          quotaHit
            ? `Found ${accepted.length} names with at least one open selected TLD before the quota ran out. Add your own API key to keep going.`
            : `Found ${accepted.length} names with at least one open selected TLD after ${rounds} rounds. Try different TLDs or a more specific brief.`,
        );
      }
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      if (generationControllerRef.current === controller) {
        generationControllerRef.current = null;
        setStatus("idle");
      }
    }
  };

  return (
    <>
      <LedBackground />
      <SavedPanel saved={saved} onRemove={remove} onClear={clear} />
      <HistoryPanel
        history={generatedHistory}
        isSaved={isSaved}
        onSave={(entry) => save(ideaFromHistory(entry), entry.domains)}
        onClear={clearHistory}
      />
      <SettingsPanel
        accountTier={aiSettings.settings.accountTier}
        provider={aiSettings.settings.provider}
        model={aiSettings.selectedModel}
        apiKeys={aiSettings.settings.apiKeys}
        historyCount={generatedHistory.length}
        generatedToday={todayCount}
        onAccountTierChange={aiSettings.setAccountTier}
        onProviderChange={aiSettings.setProvider}
        onModelChange={aiSettings.setModel}
        onApiKeyChange={aiSettings.setApiKey}
        onClearApiKeys={aiSettings.clearApiKeys}
      />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-16 sm:pt-24">
        <Hero />

        <div className="mt-12 space-y-8">
          <ModeSelector selected={mode} onSelect={setMode} />

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
              2 - Tell Mark about it
            </h2>
            <GeneratorForm
              loading={status !== "idle" || !historyHydrated || !aiSettings.hydrated}
              canStop={status !== "idle"}
              freeform={mode === "freeform"}
              onGenerate={handleGenerate}
              onStop={handleStopGenerate}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {ideas.length > 0 && (
            <ResultsGrid
              ideas={ideas}
              tlds={usedTlds}
              results={results}
              checking={status === "checking"}
              provider={llmProvider}
              isSaved={isSaved}
              onToggleSave={toggle}
            />
          )}
        </div>

        <footer className="mt-20 border-t border-white/5 pt-6 text-center text-xs text-white/30">
          Mark swaps AI providers (Claude - GPT - Gemini) and domain checkers (RDAP - Porkbun -
          Namecheap) via environment config. See the README to wire your keys.
        </footer>
      </main>
    </>
  );
}
