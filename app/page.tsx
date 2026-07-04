"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import LedBackground from "@/components/LedBackground";
import Hero from "@/components/Hero";
import ModeSelector from "@/components/ModeSelector";
import GeneratorForm, { type FormValues } from "@/components/GeneratorForm";
import ProviderModelPicker from "@/components/ProviderModelPicker";
import ManualCheckForm, { type ManualCheckValues } from "@/components/ManualCheckForm";
import AuthPanel from "@/components/AuthPanel";
import HistoryPanel from "@/components/HistoryPanel";
import NavRail from "@/components/NavRail";
import TopMeta from "@/components/TopMeta";
import Section from "@/components/Section";
import ResultsGrid from "@/components/ResultsGrid";
import SavedPanel from "@/components/SavedPanel";
import { PLATFORM_FREE_MODEL, PLATFORM_FREE_PROVIDER } from "@/lib/llm/models";
import { matchesNamePattern } from "@/lib/namePattern";
import { useAiSettings } from "@/lib/useAiSettings";
import { useServerQuota } from "@/lib/useServerQuota";
import {
  generatedNameKey,
  useGeneratedHistory,
  type GeneratedNameHistoryEntry,
} from "@/lib/useGeneratedHistory";
import { useAuth } from "@/lib/useAuth";
import { useSavedNames } from "@/lib/useSavedNames";
import { toDomain, type DomainResult, type GenerationMode, type NameIdea } from "@/lib/types";

type Status = "idle" | "generating" | "checking";
type ActiveDrawer = "account" | "history" | "saved" | null;
/** Which product the landing page is showing: Namblo (make) or Nambly (check). */
type Product = "namblo" | "nambly";
const MAX_FILL_ROUNDS = 12;
const REMOVAL_STEP_MS = 120;
const MANUAL_CHECK_CHUNK_SIZE = 25;

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
  const [resultNoun, setResultNoun] = useState("ideas");
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [product, setProduct] = useState<Product>("namblo");

  const { saved, isSaved, save, toggle, remove, clear } = useSavedNames();
  const aiSettings = useAiSettings();
  const { loading: authLoading, user, session } = useAuth();
  const {
    history: generatedHistory,
    hydrated: historyHydrated,
    keys: generatedHistoryKeys,
    names: generatedHistoryNames,
    remember: rememberGenerated,
    rememberDomains,
    clear: clearHistory,
  } = useGeneratedHistory();
  const generationControllerRef = useRef<AbortController | null>(null);
  // Server-authoritative quota + tier (from profiles.plan). The fallback tier is
  // only used when enforcement is disabled (no service role configured).
  const quota = useServerQuota(session?.access_token ?? null, user ? "friend" : "guest");
  const activeTier = quota.tier;
  // A saved key only counts for the currently selected provider — an Anthropic
  // key does not unlock Gemini/GPT.
  const hasKeyForProvider =
    activeTier !== "guest" && aiSettings.selectedApiKey.trim() !== "";
  const freeRemaining = quota.remaining;
  // Free pool is spent and the selected provider has no key of its own.
  const generationBlocked =
    quota.hydrated && freeRemaining <= 0 && !hasKeyForProvider;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const tool = params.get("tool");
    if (tool === "nambly" || tool === "namblo") {
      setProduct(tool);
      params.delete("tool");
    }

    const requested = params.get("panel");
    const target: ActiveDrawer =
      requested === "account" ||
      requested === "saved" ||
      requested === "history"
        ? requested
        : null;
    if (target) {
      setActiveDrawer(target);
      params.delete("panel");
    }

    const query = params.toString();
    if (query !== window.location.search.replace(/^\?/, "")) {
      window.history.replaceState(
        null,
        "",
        query ? `${window.location.pathname}?${query}` : window.location.pathname,
      );
    }
  }, []);

  // Refresh the server usage count whenever the Account drawer opens so the
  // tier/usage-derived UI is always up to date.
  useEffect(() => {
    if (activeDrawer === "account") quota.refresh();
  }, [activeDrawer, quota.refresh]);

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
    setResultNoun("ideas");

    const accepted: NameIdea[] = [];
    const accumulatedResults: Record<string, DomainResult> = {};
    const blockedKeys = new Set(generatedHistoryKeys);
    const promptExclusions = [...generatedHistoryNames];
    const ownApiKey =
      activeTier === "guest" ? "" : aiSettings.selectedApiKey.trim();
    const usingOwnApiKey = Boolean(ownApiKey);
    const effectiveProvider =
      usingOwnApiKey || activeTier !== "guest"
        ? aiSettings.settings.provider
        : PLATFORM_FREE_PROVIDER;
    const effectiveModel =
      usingOwnApiKey || activeTier !== "guest"
        ? aiSettings.selectedModel
        : PLATFORM_FREE_MODEL;
    let remainingQuota = usingOwnApiKey ? Number.POSITIVE_INFINITY : freeRemaining;
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

    const matchesActivePattern = (name: string) =>
      mode !== "affix" ||
      !values.namePattern.trim() ||
      matchesNamePattern(name, values.namePattern);

    try {
      const historyToRecheck = generatedHistory
        .slice()
        .reverse()
        .filter((entry) => matchesActivePattern(entry.name))
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
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          credentials: "same-origin",
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
        // The server is authoritative on quota — mirror it into the badge.
        if (generateData.quota) {
          quota.apply(generateData.quota);
          if (!usingOwnApiKey) remainingQuota = generateData.quota.remaining;
        }
        if (!generateRes.ok) throw new Error(generateData.error || "Generation failed.");

        const generated = ((generateData.ideas as NameIdea[]) ?? []).slice(0, requestCount);
        if (!generated.length) {
          throw new Error("Namblo couldn't produce names this time. Try tweaking the brief.");
        }

        setLlmProvider(
          generateData.model ? `${generateData.provider} / ${generateData.model}` : generateData.provider,
        );
        promptExclusions.push(...generated.map((idea) => idea.name));

        const patternMatched = generated.filter((idea) => matchesActivePattern(idea.name));
        const fresh = patternMatched.filter((idea) => {
          const key = generatedNameKey(idea.name);
          if (!key || blockedKeys.has(key)) return false;
          blockedKeys.add(key);
          return true;
        });
        const candidates = fresh.slice(0, shortfall);

        rememberGenerated(candidates);

        if (!candidates.length) continue;

        await checkCandidates(
          candidates,
          candidates.flatMap((idea) => values.tlds.map((tld) => toDomain(idea.name, tld))),
        );
      }

      if (accepted.length < values.count) {
        const quotaHit = !usingOwnApiKey && remainingQuota <= 0;
        const pattern = mode === "affix" ? values.namePattern.trim() : "";
        if (quotaHit) {
          setError(
            `Found ${accepted.length} names with at least one open selected TLD before the quota ran out. Add your own API key to keep going.`,
          );
        } else if (pattern) {
          setError(
            `Found ${accepted.length} names matching "${pattern}" with at least one open selected TLD after ${rounds} rounds. Try a simpler pattern, different TLDs, or a more specific brief.`,
          );
        } else {
          setError(
            `Found ${accepted.length} names with at least one open selected TLD after ${rounds} rounds. Try different TLDs or a more specific brief.`,
          );
        }
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

  const handleManualCheck = async (values: ManualCheckValues) => {
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;
    const { signal } = controller;

    const manualIdeas: NameIdea[] = values.names.map((name) => ({
      name,
      rationale: "User-supplied name.",
      style: "manual",
    }));
    const domains = manualIdeas.flatMap((idea) =>
      values.tlds.map((tld) => toDomain(idea.name, tld)),
    );
    const chunks: string[][] = [];
    for (let i = 0; i < domains.length; i += MANUAL_CHECK_CHUNK_SIZE) {
      chunks.push(domains.slice(i, i + MANUAL_CHECK_CHUNK_SIZE));
    }

    setError(null);
    setStatus("checking");
    setIdeas(manualIdeas);
    setResults({});
    setUsedTlds(values.tlds);
    setLlmProvider("porkbun");
    setResultNoun("names");

    const accumulatedResults: Record<string, DomainResult> = {};

    try {
      for (const chunk of chunks) {
        throwIfAborted(signal);
        const checkRes = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: chunk, provider: "porkbun" }),
          signal,
        });
        const checkData = await checkRes.json();
        throwIfAborted(signal);
        if (!checkRes.ok) throw new Error(checkData.error || "Domain check failed.");

        for (const result of checkData.results as DomainResult[]) {
          accumulatedResults[result.domain] = result;
        }
        setResults({ ...accumulatedResults });
        setLlmProvider(checkData.provider || "porkbun");
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
      <NavRail
        user={user}
        favouritesCount={saved.length}
        historyCount={generatedHistory.length}
        onOpenFavourites={() => setActiveDrawer("saved")}
        onOpenHistory={() => setActiveDrawer("history")}
        onAccount={() => setActiveDrawer("account")}
      />
      <TopMeta namesLeft={freeRemaining} />
      <SavedPanel
        open={activeDrawer === "saved"}
        saved={saved}
        onOpenChange={(open) => setActiveDrawer(open ? "saved" : null)}
        onRemove={remove}
        onClear={clear}
      />
      <HistoryPanel
        open={activeDrawer === "history"}
        history={generatedHistory}
        isSaved={isSaved}
        onOpenChange={(open) => setActiveDrawer(open ? "history" : null)}
        onSave={(entry) => save(ideaFromHistory(entry), entry.domains)}
        onClear={clearHistory}
      />
      <AuthPanel
        open={activeDrawer === "account"}
        apiKeys={aiSettings.settings.apiKeys}
        onOpenChange={(open) => setActiveDrawer(open ? "account" : null)}
        onApiKeyChange={aiSettings.setApiKey}
        onClearApiKeys={aiSettings.clearApiKeys}
      />
      <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] text-xl font-bold text-white">
            N
          </div>

          <div className="mt-7 w-full">
            <ProductSwitch product={product} onChange={setProduct} />
          </div>
        </div>

        <div className="mt-16 space-y-12">
          <SlideDeck
            index={product === "namblo" ? 0 : 1}
            a={
              <div className="space-y-12">
                <Hero product="namblo" />
                <Section label="Style">
                  <ModeSelector selected={mode} onSelect={setMode} />
                </Section>

                <Section label="Engine">
                  <div className="relative">
                    <div
                      aria-hidden={!user}
                      className={user ? "" : "pointer-events-none select-none blur-[3px] saturate-[0.6]"}
                    >
                      <ProviderModelPicker
                        provider={aiSettings.settings.provider}
                        model={aiSettings.selectedModel}
                        enabled={activeTier !== "guest"}
                        tier={activeTier}
                        apiKeys={aiSettings.settings.apiKeys}
                        freeExhausted={freeRemaining <= 0}
                        onProviderChange={aiSettings.setProvider}
                        onModelChange={aiSettings.setModel}
                      />
                    </div>
                    {!user && <UnlockOverlay onUnlock={() => setActiveDrawer("account")} />}
                  </div>
                </Section>

                <Section label="Brief">
                  <GeneratorForm
                    loading={status !== "idle" || authLoading || !historyHydrated || !aiSettings.hydrated}
                    canStop={status !== "idle" && resultNoun === "ideas"}
                    freeform={mode === "freeform"}
                    allowNamePattern={mode === "affix"}
                    blocked={generationBlocked}
                    onGenerate={handleGenerate}
                    onStop={handleStopGenerate}
                    onRequestKey={() => setActiveDrawer("account")}
                  />
                </Section>
              </div>
            }
            b={
              <div className="space-y-12">
                <Hero product="nambly" />
                <Section label="Check">
                  <ManualCheckForm
                    loading={status !== "idle"}
                    canStop={status === "checking" && resultNoun === "names"}
                    onCheck={handleManualCheck}
                    onStop={handleStopGenerate}
                  />
                </Section>
              </div>
            }
          />

          {error && (
            <div className="animate-fade-up rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {ideas.length > 0 && (
            <Section label="Results">
              <ResultsGrid
                ideas={ideas}
                tlds={usedTlds}
                results={results}
                checking={status === "checking"}
                provider={llmProvider}
                noun={resultNoun}
                isSaved={isSaved}
                onToggleSave={toggle}
              />
            </Section>
          )}
        </div>

        <footer className="mt-24 border-t border-white/[0.08] pt-8 text-center">
          <p className="mx-auto max-w-md font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-white/30">
            Namblo · AI naming + realtime domains
          </p>
        </footer>
      </main>
    </>
  );
}

/**
 * Two-slide horizontal deck that spans the FULL viewport width: each slide is
 * `w-screen`, so switching slides the content clear across the whole screen (not
 * just the centred column). Content is re-centred inside each slide. The
 * container height eases to the active slide.
 */
function SlideDeck({ index, a, b }: { index: number; a: ReactNode; b: ReactNode }) {
  const [height, setHeight] = useState<number>();
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = index === 0 ? firstRef.current : secondRef.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden transition-[height] duration-[520ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{ height }}
    >
      <div
        className="flex items-start transition-transform duration-[520ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        <div ref={firstRef} className="w-screen shrink-0">
          <div className="mx-auto max-w-2xl px-5">{a}</div>
        </div>
        <div ref={secondRef} className="w-screen shrink-0">
          <div className="mx-auto max-w-2xl px-5">{b}</div>
        </div>
      </div>
    </div>
  );
}

function UnlockOverlay({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[1.15rem] bg-ink-900/40 p-6 text-center backdrop-blur-[2px]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-neon-cyan shadow-led-soft">
        <LockIcon />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">Choose your AI provider & model</p>
        <p className="mt-1 text-xs text-white/55">
          Create a free account to pick Claude, GPT, or Gemini.
        </p>
      </div>
      <button
        type="button"
        onClick={onUnlock}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink-900 transition hover:-translate-y-px hover:bg-white/90"
      >
        Register for free to unlock
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

const PRODUCTS: Array<{ id: Product; name: string; tagline: string }> = [
  { id: "namblo", name: "Namblo", tagline: "Name Maker" },
  { id: "nambly", name: "Nambly", tagline: "Name Checker" },
];

function ProductSwitch({
  product,
  onChange,
}: {
  product: Product;
  onChange: (product: Product) => void;
}) {
  // `sliding` is true only while the pill is travelling — during that window
  // both labels go white (legible over the dark track and the moving pill),
  // and the pill plays a squash/stretch so it flows like a water drop.
  const [sliding, setSliding] = useState(false);

  const select = (next: Product) => {
    if (next === product) return;
    setSliding(true);
    onChange(next);
    window.setTimeout(() => setSliding(false), 560);
  };

  return (
    <div className="relative mx-auto grid max-w-sm grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1 shadow-led-card backdrop-blur-xl">
      {/* Pill layer — sits behind the labels so text is never covered. */}
      <div aria-hidden className="pointer-events-none absolute inset-1">
        <div
          className="absolute inset-y-0 left-0 w-1/2 transition-transform duration-[520ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ transform: product === "nambly" ? "translateX(100%)" : "translateX(0)" }}
        >
          <span
            className={[
              "block h-full w-full rounded-full bg-[linear-gradient(110deg,#33333a,#4a4a52_50%,#33333a)] shadow-led-soft",
              sliding ? "animate-liquid" : "",
            ].join(" ")}
          />
        </div>
      </div>

      {PRODUCTS.map((item) => {
        const active = product === item.id;
        const labelColor = active ? "text-white" : "text-white/55 hover:text-white";
        const tagColor = active ? "text-white/75" : "text-white/40";
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            aria-pressed={active}
            className={[
              "relative z-10 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300 [text-shadow:0_1px_5px_rgba(0,0,0,0.45)]",
              labelColor,
            ].join(" ")}
          >
            <span className="flex items-baseline gap-1.5">
              {item.name}
              <span className={["text-[11px] transition-colors duration-300", tagColor].join(" ")}>
                {item.tagline}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
