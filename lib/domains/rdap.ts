import { promises as dns } from "node:dns";
import type { DomainResult } from "@/lib/types";
import { DomainChecker, mapWithConcurrency, splitDomain } from "@/lib/domains/provider";

/**
 * Free availability checker. Queries the RDAP system (which is authoritative
 * for "does this domain exist") and falls back to a DNS nameserver lookup for
 * TLDs without RDAP coverage. Availability only — no pricing.
 *
 * RDAP semantics via rdap.org (redirects to the authoritative server):
 *   HTTP 404 -> domain not registered (available)
 *   HTTP 200 -> domain registered (taken)
 */
export class RdapChecker implements DomainChecker {
  readonly id = "rdap";

  async check(domains: string[]): Promise<DomainResult[]> {
    return mapWithConcurrency(domains, 5, (d) => this.checkOne(d));
  }

  private async checkOne(domain: string): Promise<DomainResult> {
    const clean = domain.trim().toLowerCase();
    const { tld } = splitDomain(clean);
    const base: DomainResult = { domain: clean, tld, available: false, source: this.id };

    const rdap = await this.rdapStatus(clean);
    if (rdap === "available") return { ...base, available: true };
    if (rdap === "taken") return { ...base, available: false };

    // RDAP inconclusive — fall back to a DNS nameserver lookup.
    const dnsResult = await this.dnsHasRecords(clean);
    if (dnsResult === "taken") return { ...base, available: false };
    if (dnsResult === "available") return { ...base, available: true };

    return { ...base, available: false, error: "Could not determine availability" };
  }

  private async rdapStatus(domain: string): Promise<"available" | "taken" | "unknown"> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        method: "GET",
        redirect: "follow",
        headers: { Accept: "application/rdap+json" },
        signal: controller.signal,
      });
      if (res.status === 404) return "available";
      if (res.status === 200) return "taken";
      return "unknown";
    } catch {
      return "unknown";
    } finally {
      clearTimeout(timer);
    }
  }

  private async dnsHasRecords(domain: string): Promise<"available" | "taken" | "unknown"> {
    try {
      const ns = await dns.resolveNs(domain);
      return ns && ns.length > 0 ? "taken" : "available";
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN") {
        return "available";
      }
      return "unknown";
    }
  }
}
