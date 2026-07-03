"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadNameDataColumn, saveNameDataColumn } from "@/lib/supabase/nameData";
import { useAuth } from "@/lib/useAuth";
import type { DomainResult, NameIdea } from "@/lib/types";

/** A name the user chose to keep, with a snapshot of its domain results. */
export interface SavedName extends NameIdea {
  savedAt: number;
  domains: DomainResult[];
}

const STORAGE_KEY = "namblo.saved.v1";
const MAX_SAVED_NAMES = 500;
const norm = (name: string) => name.trim().toLowerCase();

/**
 * Saved-names store backed by Supabase for signed-in users and localStorage for
 * guests. Local names are merged into the account on first sign-in.
 */
export function useSavedNames() {
  const { loading: authLoading, supabase, user } = useAuth();
  const userId = user?.id ?? null;
  const [saved, setSaved] = useState<SavedName[]>([]);
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
    const localSaved = readLocalSaved();

    if (!supabase || !userId) {
      setSaved(localSaved);
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    const activeSupabase = supabase;
    const activeUserId = userId;

    async function hydrateRemote() {
      try {
        const remoteValue = await loadNameDataColumn(activeSupabase, activeUserId, "saved");
        if (cancelled) return;

        const remoteSaved = normalizeSavedList(remoteValue);
        const merged = mergeSaved(remoteSaved, localSaved);
        const remoteJson = serializeSaved(remoteSaved);
        const mergedJson = serializeSaved(merged);

        setSaved(merged);
        lastRemoteJson.current = remoteJson;

        if (mergedJson !== remoteJson) {
          await saveNameDataColumn(activeSupabase, activeUserId, "saved", merged);
          lastRemoteJson.current = mergedJson;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not load Supabase saved names; using local saved names.", error);
          setSaved(localSaved);
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

    writeLocalSaved(saved);

    if (!supabase || !userId) return;
    const activeSupabase = supabase;
    const activeUserId = userId;

    const nextJson = serializeSaved(saved);
    if (nextJson === lastRemoteJson.current) return;

    lastRemoteJson.current = nextJson;
    void saveNameDataColumn(activeSupabase, activeUserId, "saved", saved).catch((error) => {
      console.warn("Could not save Supabase saved names.", error);
      lastRemoteJson.current = null;
    });
  }, [saved, hydrated, supabase, userId]);

  const isSaved = useCallback(
    (name: string) => saved.some((item) => norm(item.name) === norm(name)),
    [saved],
  );

  const save = useCallback((idea: NameIdea, domains: DomainResult[]) => {
    setSaved((prev) => {
      const key = norm(idea.name);
      if (prev.some((item) => norm(item.name) === key)) return prev;
      return trimSaved([{ ...idea, domains, savedAt: Date.now() }, ...prev]);
    });
  }, []);

  const toggle = useCallback((idea: NameIdea, domains: DomainResult[]) => {
    setSaved((prev) => {
      const key = norm(idea.name);
      if (prev.some((item) => norm(item.name) === key)) {
        return prev.filter((item) => norm(item.name) !== key);
      }
      return trimSaved([{ ...idea, domains, savedAt: Date.now() }, ...prev]);
    });
  }, []);

  const remove = useCallback((name: string) => {
    setSaved((prev) => prev.filter((item) => norm(item.name) !== norm(name)));
  }, []);

  const clear = useCallback(() => setSaved([]), []);

  return { saved, hydrated, isSaved, save, toggle, remove, clear };
}

function readLocalSaved(): SavedName[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeSavedList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLocalSaved(saved: SavedName[]) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSaved(saved));
  } catch {
    /* storage full or unavailable */
  }
}

function normalizeSavedList(value: unknown): SavedName[] {
  if (!Array.isArray(value)) return [];

  const restored = value
    .map((item): SavedName | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<SavedName>;
      if (typeof candidate.name !== "string") return null;
      return {
        name: candidate.name,
        rationale: typeof candidate.rationale === "string" ? candidate.rationale : "",
        style: typeof candidate.style === "string" ? candidate.style : "",
        savedAt: Number(candidate.savedAt) || Date.now(),
        domains: Array.isArray(candidate.domains)
          ? candidate.domains.filter(isDomainResult)
          : [],
      };
    })
    .filter((item): item is SavedName => Boolean(item));

  return mergeSaved(restored);
}

function serializeSaved(saved: SavedName[]): string {
  return JSON.stringify(trimSaved(saved));
}

function mergeSaved(...lists: SavedName[][]): SavedName[] {
  const byName = new Map<string, SavedName>();

  for (const entry of lists.flat()) {
    const key = norm(entry.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, entry);
      continue;
    }

    const newest = entry.savedAt >= existing.savedAt ? entry : existing;
    byName.set(key, {
      ...newest,
      rationale: newest.rationale || existing.rationale || entry.rationale,
      style: newest.style || existing.style || entry.style,
      domains: mergeDomainResults(existing.domains, entry.domains),
      savedAt: Math.max(existing.savedAt, entry.savedAt),
    });
  }

  return trimSaved(
    Array.from(byName.values()).sort((a, b) => b.savedAt - a.savedAt),
  );
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

function mergeDomainResults(...lists: DomainResult[][]): DomainResult[] {
  const byDomain = new Map<string, DomainResult>();
  for (const domain of lists.flat()) byDomain.set(domain.domain, domain);
  return Array.from(byDomain.values());
}

function trimSaved(saved: SavedName[]): SavedName[] {
  return saved.slice(0, MAX_SAVED_NAMES);
}
