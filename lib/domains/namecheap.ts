import type { DomainResult } from "@/lib/types";
import { DomainChecker, splitDomain } from "@/lib/domains/provider";

/**
 * Namecheap adapter - availability + pricing. Drop-in for when credentials are
 * ready. NOTE: Namecheap requires API access on your account (20+ domains OR
 * $50 balance OR $50+ spent) and the *server's* public IPv4 to be whitelisted.
 * Use the free sandbox (NAMECHEAP_SANDBOX=true) for development.
 *
 * Uses two endpoints:
 *   namecheap.domains.check     -> availability + premium flag + premium price
 *   namecheap.users.getPricing  -> regular registration price per TLD
 *
 * Responses are XML; parsed with lightweight regex (no XML dependency).
 */
export class NamecheapChecker implements DomainChecker {
  readonly id = "namecheap";
  private apiUser: string;
  private apiKey: string;
  private userName: string;
  private clientIp: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    const { NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, NAMECHEAP_CLIENT_IP } =
      process.env;
    if (!NAMECHEAP_API_USER || !NAMECHEAP_API_KEY || !NAMECHEAP_USERNAME || !NAMECHEAP_CLIENT_IP) {
      throw new Error(
        "Namecheap provider needs NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_USERNAME and NAMECHEAP_CLIENT_IP.",
      );
    }
    this.apiUser = NAMECHEAP_API_USER.trim();
    this.apiKey = NAMECHEAP_API_KEY.trim();
    this.userName = NAMECHEAP_USERNAME.trim();
    this.clientIp = NAMECHEAP_CLIENT_IP.trim();
    const sandbox = (process.env.NAMECHEAP_SANDBOX ?? "true").toLowerCase() !== "false";
    this.baseUrl = sandbox
      ? "https://api.sandbox.namecheap.com/xml.response"
      : "https://api.namecheap.com/xml.response";
    this.timeoutMs = Number(process.env.NAMECHEAP_TIMEOUT_MS) || 25000;
  }

  async check(domains: string[]): Promise<DomainResult[]> {
    const clean = domains.map((d) => d.trim().toLowerCase());
    const [availability, pricing] = await Promise.all([
      this.checkAvailability(clean),
      this.getRegisterPricing(clean),
    ]);

    return clean.map((domain) => {
      const { tld } = splitDomain(domain);
      const avail = availability.get(domain);
      if (!avail) {
        return { domain, tld, available: false, source: this.id, error: "No result" };
      }
      const price = avail.premium
        ? avail.premiumPrice
        : pricing.get(tld.replace(/^\./, ""));
      return {
        domain,
        tld,
        available: avail.available,
        premium: avail.premium,
        price: avail.available ? price : undefined,
        currency: avail.available && price !== undefined ? "USD" : undefined,
        source: this.id,
      };
    });
  }

  private params(command: string, extra: Record<string, string>): string {
    const sp = new URLSearchParams({
      ApiUser: this.apiUser,
      ApiKey: this.apiKey,
      UserName: this.userName,
      ClientIp: this.clientIp,
      Command: command,
      ...extra,
    });
    return `${this.baseUrl}?${sp.toString()}`;
  }

  private async fetchXml(url: string, command: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const xml = await res.text();
      if (!res.ok) {
        throw new Error(`Namecheap ${command} failed with HTTP ${res.status}.`);
      }
      const err = matchAttr(xml, "Error", null);
      if (/Status="ERROR"/i.test(xml)) {
        const msg = /<Error[^>]*>([^<]*)<\/Error>/i.exec(xml)?.[1] ?? "Namecheap API error";
        throw new Error(`Namecheap ${command}: ${msg}`);
      }
      void err;
      return xml;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : "";
      if (name === "AbortError" || /aborted/i.test(message)) {
        throw new Error(
          `Namecheap ${command} timed out after ${Math.round(this.timeoutMs / 1000)}s. Check NAMECHEAP_SANDBOX, credentials, and whitelisted server IP.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkAvailability(
    domains: string[],
  ): Promise<Map<string, { available: boolean; premium: boolean; premiumPrice?: number }>> {
    const result = new Map<string, { available: boolean; premium: boolean; premiumPrice?: number }>();
    const xml = await this.fetchXml(
      this.params("namecheap.domains.check", { DomainList: domains.join(",") }),
      "namecheap.domains.check",
    );
    const rows = xml.match(/<DomainCheckResult\b[^>]*\/?>/gi) ?? [];
    for (const row of rows) {
      const domain = matchAttr(row, "Domain", "")?.toLowerCase();
      if (!domain) continue;
      const available = matchAttr(row, "Available", "false") === "true";
      const premium = matchAttr(row, "IsPremiumName", "false") === "true";
      const premiumPriceStr = matchAttr(row, "PremiumRegistrationPrice", "0");
      const premiumPrice = premium ? Number(premiumPriceStr) || undefined : undefined;
      result.set(domain, { available, premium, premiumPrice });
    }
    return result;
  }

  /** Best-effort regular register price per TLD (keyed without the leading dot). */
  private async getRegisterPricing(domains: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    const tlds = Array.from(new Set(domains.map((d) => splitDomain(d).tld.replace(/^\./, "")))).filter(
      Boolean,
    );
    try {
      const xml = await this.fetchXml(
        this.params("namecheap.users.getPricing", {
          ProductType: "DOMAIN",
          ProductCategory: "REGISTER",
          ActionName: "REGISTER",
        }),
        "namecheap.users.getPricing",
      );
      for (const tld of tlds) {
        const block = new RegExp(`<Product Name="${tld}">([\\s\\S]*?)<\\/Product>`, "i").exec(xml)?.[1];
        if (!block) continue;
        const oneYear = /<Price\b[^>]*Duration="1"[^>]*\/?>/i.exec(block)?.[0];
        const priceStr = oneYear ? matchAttr(oneYear, "YourPrice", "") : "";
        const price = Number(priceStr);
        if (Number.isFinite(price) && price > 0) prices.set(tld, price);
      }
    } catch {
      // Pricing is best-effort; availability still returns without it.
    }
    return prices;
  }
}

/** Extract an XML attribute value from a tag string. */
function matchAttr(tag: string, name: string, fallback: string | null): string | null {
  const m = new RegExp(`${name}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : fallback;
}
