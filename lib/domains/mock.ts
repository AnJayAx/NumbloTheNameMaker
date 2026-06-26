import type { DomainResult } from "@/lib/types";
import { DomainChecker, splitDomain } from "@/lib/domains/provider";

/**
 * Deterministic fake checker for offline UI work — no network calls.
 * Availability and price are derived from the domain string so results
 * are stable across runs.
 */
export class MockChecker implements DomainChecker {
  readonly id = "mock";

  async check(domains: string[]): Promise<DomainResult[]> {
    return domains.map((domain) => {
      const { tld } = splitDomain(domain);
      const h = hash(domain);
      // ~55% available; a slice of those are "premium".
      const available = h % 100 < 55;
      const premium = available && h % 100 < 12;
      const base = tldBasePrice(tld);
      const price = available
        ? Number((premium ? base * (5 + (h % 40)) : base).toFixed(2))
        : undefined;
      return {
        domain: domain.toLowerCase(),
        tld,
        available,
        premium,
        price,
        currency: price !== undefined ? "USD" : undefined,
        source: this.id,
      };
    });
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function tldBasePrice(tld: string): number {
  const table: Record<string, number> = {
    ".com": 10.98,
    ".io": 32.98,
    ".ai": 69.98,
    ".co": 24.98,
    ".app": 14.98,
    ".dev": 12.98,
  };
  return table[tld] ?? 14.98;
}
