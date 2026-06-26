"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toDomain, toDomainLabel, type DomainResult, type NameIdea } from "@/lib/types";

export interface GeneratedNameHistoryEntry {
  name: string;
  key: string;
  generatedAt: number;
  rationale?: string;
  style?: string;
  domains: DomainResult[];
}

const STORAGE_KEY = "mark.generated-history.v1";

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
  const [history, setHistory] = useState<GeneratedNameHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const restored = parsed
            .map((item): GeneratedNameHistoryEntry | null => {
              if (typeof item === "string") return entryFromIdea(item);
              if (item && typeof item.name === "string") {
                const domains = Array.isArray(item.domains)
                  ? item.domains.filter(isDomainResult)
                  : [];
                return entryFromIdea(
                  {
                    name: item.name,
                    rationale: typeof item.rationale === "string" ? item.rationale : "",
                    style: typeof item.style === "string" ? item.style : "",
                  },
                  Number(item.generatedAt) || Date.now(),
                  domains,
                );
              }
              return null;
            })
            .filter((item): item is GeneratedNameHistoryEntry => Boolean(item));
          setHistory(dedupe(restored));
        }
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* storage full or unavailable */
    }
  }, [history, hydrated]);

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
      return next;
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
          const merged = new Map(entry.domains.map((domain) => [domain.domain, domain]));
          for (const domain of domains) {
            merged.set(domain.domain, domain);
          }
          return { ...entry, domains: Array.from(merged.values()) };
        }),
      );
    },
    [],
  );

  const clear = useCallback(() => setHistory([]), []);

  return { history, hydrated, keys, names, has, remember, rememberDomains, clear };
}

function isDomainResult(value: unknown): value is DomainResult {
  return Boolean(value && typeof value === "object" && "domain" in value);
}

function dedupe(entries: GeneratedNameHistoryEntry[]): GeneratedNameHistoryEntry[] {
  const seen = new Set<string>();
  const result: GeneratedNameHistoryEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    result.push(entry);
  }
  return result;
}
