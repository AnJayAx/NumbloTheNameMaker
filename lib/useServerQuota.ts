"use client";

import { useCallback, useEffect, useState } from "react";
import { FREE_LIMITS, type AccountTier } from "@/lib/limits";

export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
  tier?: AccountTier;
}

interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  tier: AccountTier;
  /** Next billing date (ISO) for a paid subscriber, else null. */
  renewsAt: string | null;
  enforced: boolean;
  hydrated: boolean;
}

/**
 * Server-authoritative daily quota + tier. Fetches `/api/quota` on mount and
 * whenever the token changes, and can be updated in place from generate
 * responses via {@link apply}. When enforcement is off (no service role) it
 * falls back to `fallbackTier` so the UI still shows a sensible tier/count.
 */
export function useServerQuota(token: string | null, fallbackTier: AccountTier) {
  const fallbackLimit = FREE_LIMITS[fallbackTier];
  const [state, setState] = useState<QuotaState>({
    used: 0,
    limit: fallbackLimit,
    remaining: fallbackLimit,
    tier: fallbackTier,
    renewsAt: null,
    enforced: false,
    hydrated: false,
  });

  const fetchQuota = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch("/api/quota", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "same-origin",
          signal,
        });
        if (!res.ok) throw new Error("quota fetch failed");
        const data = (await res.json()) as Partial<QuotaState>;
        const enforced = Boolean(data.enforced);
        setState({
          used: enforced ? data.used ?? 0 : 0,
          limit: enforced ? data.limit ?? fallbackLimit : fallbackLimit,
          remaining: enforced ? data.remaining ?? fallbackLimit : fallbackLimit,
          tier: enforced ? (data.tier as AccountTier) ?? fallbackTier : fallbackTier,
          renewsAt: enforced ? data.renewsAt ?? null : null,
          enforced,
          hydrated: true,
        });
      } catch {
        if (signal?.aborted) return;
        setState({
          used: 0,
          limit: fallbackLimit,
          remaining: fallbackLimit,
          tier: fallbackTier,
          renewsAt: null,
          enforced: false,
          hydrated: true,
        });
      }
    },
    [token, fallbackTier, fallbackLimit],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchQuota(controller.signal);
    return () => controller.abort();
  }, [fetchQuota]);

  /** Update from a generate response's `quota` payload (server is authoritative). */
  const apply = useCallback((snapshot: QuotaSnapshot | null | undefined) => {
    if (!snapshot) return;
    setState((prev) => ({
      ...prev,
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: snapshot.remaining,
      tier: snapshot.tier ?? prev.tier,
      enforced: true,
      hydrated: true,
    }));
  }, []);

  const refresh = useCallback(() => void fetchQuota(), [fetchQuota]);

  return {
    used: state.used,
    limit: state.limit,
    remaining: state.remaining,
    tier: state.tier,
    renewsAt: state.renewsAt,
    enforced: state.enforced,
    hydrated: state.hydrated,
    apply,
    refresh,
  };
}
