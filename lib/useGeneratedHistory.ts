"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadNameDataColumn, saveNameDataColumn } from "@/lib/supabase/nameData";
import { useAuth } from "@/lib/useAuth";
import { toDomain, toDomainLabel, type DomainResult, type NameIdea } from "@/lib/types";

export interface GeneratedNameHistoryEntry {
  name: string;
  key: string;
  generatedAt: number;
  rationale?: string;
  style?: string;
  domains: DomainResult[];
}

const STORAGE_KEY = "namblo.generated-history.v1";
const MAX_HISTORY_ENTRIES = 750;

export function generatedNameKey(name: string): string {
  return toDomainLabel(name.trim());
}

function entryFromIdea(
  idea: NameIdea | string,
  generatedAt = Date.now(),
  domains: DomainResult[] = [],
): GeneratedNameHistoryEntry | null {
  const name = typeof idea === "string" ? idea : idea.name;
  const clean = name.trim();
  const key = generatedNameKey(clean);
  if (!clean || !key) return null;
  return {
    name: clean,
    key,
    generatedAt,
    domains,
    rationale: typeof idea === "string" ? undefined : idea.rationale,
    style: typeof idea === "string" ? undefined : idea.style,
  };
}

/**
 * Stores every emitted name so later generations can avoid repeats, including
 * names that were discarded because every requested TLD was taken.
 */
export function useGeneratedHistory() {
  const { loading: authLoading, supabase, user } = useAuth();
  const userId = user?.id ?? null;
  const [history, setHistory] = useState<GeneratedNameHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const lastRemoteJson = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setHydrated(false);
      return () => {
        cancelled = true;
      };
    }

    setHydrated(false);
    lastRemoteJson.current = null;
    const localHistory = readLocalHistory();

    if (!supabase || !userId) {
      setHistory(localHistory);
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    const activeSupabase = supabase;
    const activeUserId = userId;

    async function hydrateRemote() {
      try {
        const remoteValue = await loadNameDataColumn(activeSupabase, activeUserId, "history");
        if (cancelled) return;

        const remoteHistory = normalizeHistory(remoteValue);
        const merged = mergeHistory(remoteHistory, localHistory);
        const remoteJson = serializeHistory(remoteHistory);
        const mergedJson = serializeHistory(merged);

        setHistory(merged);
        lastRemoteJson.current = remoteJson;

        if (mergedJson !== remoteJson) {
          await saveNameDataColumn(activeSupabase, activeUserId, "history", merged);
          lastRemoteJson.current = mergedJson;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not load Supabase history; using local history.", error);
          setHistory(localHistory);
          lastRemoteJson.current = null;
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrateRemote();

    return () => {
      cancelled = true;
    };
  }, [authLoading, supabase, userId]);

  useEffect(() => {
    if (!hydrated) return;

    writeLocalHistory(history);

    if (!supabase || !userId) return;
    const activeSupabase = supabase;
    const activeUserId = userId;

    const nextJson = serializeHistory(history);
    if (nextJson === lastRemoteJson.current) return;

    lastRemoteJson.current = nextJson;
    void saveNameDataColumn(activeSupabase, activeUserId, "history", history).catch((error) => {
      console.warn("Could not save Supabase history.", error);
      lastRemoteJson.current = null;
    });
  }, [history, hydrated, supabase, userId]);

  const keys = useMemo(() => new Set(history.map((item) => item.key)), [history]);
  const names = useMemo(() => history.map((item) => item.name), [history]);

  const has = useCallback((name: string) => keys.has(generatedNameKey(name)), [keys]);

  const remember = useCallback((ideas: Array<NameIdea | string>) => {
    setHistory((prev) => {
      const next = [...prev];
      const seen = new Set(prev.map((item) => item.key));
      for (const idea of ideas) {
        const entry = entryFromIdea(idea);
        if (!entry || seen.has(entry.key)) continue;
        seen.add(entry.key);
        next.push(entry);
      }
      return trimHistory(next);
    });
  }, []);

  const rememberDomains = useCallback(
    (ideas: NameIdea[], results: Record<string, DomainResult>, tlds: string[]) => {
      const checked = new Map(
        ideas.map((idea) => [
          generatedNameKey(idea.name),
          tlds
            .map((tld) => results[toDomain(idea.name, tld)])
            .filter((result): result is DomainResult => Boolean(result)),
        ]),
      );

      setHistory((prev) =>
        prev.map((entry) => {
          const domains = checked.get(entry.key);
          if (!domains) return entry;
          return { ...entry, domains: mergeDomainResults(entry.domains, domains) };
        }),
      );
    },
    [],
  );

  const clear = useCallback(() => setHistory([]), []);

  return { history, hydrated, keys, names, has, remember, rememberDomains, clear };
}

function readLocalHistory(): GeneratedNameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLocalHistory(history: GeneratedNameHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeHistory(history));
  } catch {
    /* storage full or unavailable */
  }
}

function normalizeHistory(value: unknown): GeneratedNameHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  const restored = value
    .map((item): GeneratedNameHistoryEntry | null => {
      if (typeof item === "string") return entryFromIdea(item);
      if (item && typeof item === "object" && "name" in item) {
        const candidate = item as Partial<GeneratedNameHistoryEntry>;
        if (typeof candidate.name !== "string") return null;
        const domains = Array.isArray(candidate.domains)
          ? candidate.domains.filter(isDomainResult)
          : [];
        return entryFromIdea(
          {
            name: candidate.name,
            rationale: typeof candidate.rationale === "string" ? candidate.rationale : "",
            style: typeof candidate.style === "string" ? candidate.style : "",
          },
          Number(candidate.generatedAt) || Date.now(),
          domains,
        );
      }
      return null;
    })
    .filter((item): item is GeneratedNameHistoryEntry => Boolean(item));

  return mergeHistory(restored);
}

function serializeHistory(history: GeneratedNameHistoryEntry[]): string {
  return JSON.stringify(trimHistory(history));
}

function isDomainResult(value: unknown): value is DomainResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DomainResult>;
  return (
    typeof item.domain === "string" &&
    typeof item.tld === "string" &&
    typeof item.available === "boolean" &&
    typeof item.source === "string"
  );
}

function mergeHistory(...lists: GeneratedNameHistoryEntry[][]): GeneratedNameHistoryEntry[] {
  const byKey = new Map<string, GeneratedNameHistoryEntry>();

  for (const entry of lists.flat()) {
    const existing = byKey.get(entry.key);
    if (!existing) {
      byKey.set(entry.key, entry);
      continue;
    }

    byKey.set(entry.key, {
      ...existing,
      ...entry,
      generatedAt: Math.min(existing.generatedAt, entry.generatedAt),
      rationale: existing.rationale || entry.rationale,
      style: existing.style || entry.style,
      domains: mergeDomainResults(existing.domains, entry.domains),
    });
  }

  return trimHistory(
    Array.from(byKey.values()).sort((a, b) => a.generatedAt - b.generatedAt),
  );
}

function mergeDomainResults(...lists: DomainResult[][]): DomainResult[] {
  const byDomain = new Map<string, DomainResult>();
  for (const domain of lists.flat()) byDomain.set(domain.domain, domain);
  return Array.from(byDomain.values());
}

function trimHistory(history: GeneratedNameHistoryEntry[]): GeneratedNameHistoryEntry[] {
  return history.slice(-MAX_HISTORY_ENTRIES);
}
