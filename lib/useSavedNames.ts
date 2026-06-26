"use client";

import { useCallback, useEffect, useState } from "react";
import type { DomainResult, NameIdea } from "@/lib/types";

/** A name the user chose to keep, with a snapshot of its domain results. */
export interface SavedName extends NameIdea {
  savedAt: number;
  domains: DomainResult[];
}

const STORAGE_KEY = "mark.saved.v1";
const norm = (name: string) => name.trim().toLowerCase();

/**
 * Saved-names store backed by localStorage. Hydrates on mount (so SSR markup
 * matches the empty first client render), then persists on every change.
 */
export function useSavedNames() {
  const [saved, setSaved] = useState<SavedName[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSaved(parsed as SavedName[]);
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* storage full or unavailable */
    }
  }, [saved, hydrated]);

  const isSaved = useCallback(
    (name: string) => saved.some((s) => norm(s.name) === norm(name)),
    [saved],
  );

  const save = useCallback((idea: NameIdea, domains: DomainResult[]) => {
    setSaved((prev) => {
      const key = norm(idea.name);
      if (prev.some((s) => norm(s.name) === key)) return prev;
      return [{ ...idea, domains, savedAt: Date.now() }, ...prev];
    });
  }, []);

  const toggle = useCallback((idea: NameIdea, domains: DomainResult[]) => {
    setSaved((prev) => {
      const key = norm(idea.name);
      if (prev.some((s) => norm(s.name) === key)) {
        return prev.filter((s) => norm(s.name) !== key);
      }
      return [{ ...idea, domains, savedAt: Date.now() }, ...prev];
    });
  }, []);

  const remove = useCallback((name: string) => {
    setSaved((prev) => prev.filter((s) => norm(s.name) !== norm(name)));
  }, []);

  const clear = useCallback(() => setSaved([]), []);

  return { saved, hydrated, isSaved, save, toggle, remove, clear };
}
