import type { DomainResult } from "@/lib/types";

/** Every domain-availability adapter implements this single method. */
export interface DomainChecker {
  readonly id: string;
  check(domains: string[]): Promise<DomainResult[]>;
}

export type DomainProviderId = "rdap" | "namecheap" | "porkbun" | "mock";

/**
 * Returns the configured domain checker, chosen by DOMAIN_PROVIDER
 * (rdap | namecheap | porkbun | mock). Adapters are imported lazily.
 */
export async function getDomainChecker(providerOverride?: DomainProviderId): Promise<DomainChecker> {
  const provider = (providerOverride || process.env.DOMAIN_PROVIDER || "rdap").toLowerCase();
  switch (provider) {
    case "rdap": {
      const { RdapChecker } = await import("@/lib/domains/rdap");
      return new RdapChecker();
    }
    case "namecheap": {
      const { NamecheapChecker } = await import("@/lib/domains/namecheap");
      return new NamecheapChecker();
    }
    case "porkbun": {
      const { PorkbunChecker } = await import("@/lib/domains/porkbun");
      return new PorkbunChecker();
    }
    case "mock": {
      const { MockChecker } = await import("@/lib/domains/mock");
      return new MockChecker();
    }
    default:
      throw new Error(
        `Unknown DOMAIN_PROVIDER "${provider}". Use one of: rdap, namecheap, porkbun, mock.`,
      );
  }
}

/** Splits "acme.io" into { name: "acme", tld: ".io" }. */
export function splitDomain(domain: string): { name: string; tld: string } {
  const clean = domain.trim().toLowerCase().replace(/^\.+/, "");
  const dot = clean.indexOf(".");
  if (dot === -1) return { name: clean, tld: "" };
  return { name: clean.slice(0, dot), tld: clean.slice(dot) };
}

/** Runs `task` over `items` with a bounded number of concurrent workers. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
