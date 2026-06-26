import type { DomainResult } from "@/lib/types";
import { DomainChecker, splitDomain } from "@/lib/domains/provider";

interface PorkbunCheckResponse {
  status?: string;
  message?: string;
  code?: string;
  response?: {
    avail?: string;
    price?: string;
    regularPrice?: string;
    premium?: string;
    firstYearPromo?: string;
  };
  ttlRemaining?: number;
}

/**
 * Porkbun availability + pricing checker.
 *
 * Uses only POST /domain/checkDomain/{domain}; this endpoint checks availability
 * and returns registration/renewal/transfer pricing. It does not register or
 * charge for domains.
 */
export class PorkbunChecker implements DomainChecker {
  readonly id = "porkbun";
  private apiKey: string;
  private secretApiKey: string;
  private baseUrl = "https://api.porkbun.com/api/json/v3";
  private timeoutMs: number;
  private checkDelayMs: number;

  constructor() {
    const { PORKBUN_API_KEY, PORKBUN_SECRET_API_KEY } = process.env;
    if (!PORKBUN_API_KEY || !PORKBUN_SECRET_API_KEY) {
      throw new Error("Porkbun provider needs PORKBUN_API_KEY and PORKBUN_SECRET_API_KEY.");
    }
    this.apiKey = PORKBUN_API_KEY.trim();
    this.secretApiKey = PORKBUN_SECRET_API_KEY.trim();
    this.timeoutMs = Number(process.env.PORKBUN_TIMEOUT_MS) || 25000;
    this.checkDelayMs = Number(process.env.PORKBUN_CHECK_DELAY_MS) || 0;
  }

  async check(domains: string[]): Promise<DomainResult[]> {
    const clean = domains.map((domain) => domain.trim().toLowerCase());
    const results: DomainResult[] = [];

    for (let i = 0; i < clean.length; i += 1) {
      if (i > 0 && this.checkDelayMs > 0) await wait(this.checkDelayMs);
      results.push(await this.checkOne(clean[i]));
    }

    return results;
  }

  private async checkOne(domain: string): Promise<DomainResult> {
    const { tld } = splitDomain(domain);
    const base: DomainResult = { domain, tld, available: false, source: this.id };

    try {
      const data = await this.fetchJson<PorkbunCheckResponse>(
        `${this.baseUrl}/domain/checkDomain/${encodeURIComponent(domain)}`,
      );

      if (data.status !== "SUCCESS") {
        return {
          ...base,
          error: formatPorkbunError(data),
        };
      }

      const info = data.response;
      if (!info) return { ...base, error: "Porkbun returned no result" };

      const price = parsePrice(info.price ?? info.regularPrice);
      const available = info.avail === "yes";
      return {
        ...base,
        available,
        price: available ? price : undefined,
        currency: available && price !== undefined ? "USD" : undefined,
        premium: info.premium === "yes",
      };
    } catch (err: unknown) {
      return {
        ...base,
        error: err instanceof Error ? err.message : "Porkbun check failed",
      };
    }
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: this.apiKey,
          secretapikey: this.secretApiKey,
        }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as (T & { message?: string; code?: string }) | null;

      if (!res.ok) {
        const details = data?.message || data?.code || `HTTP ${res.status}`;
        throw new Error(`Porkbun API error: ${details}`);
      }
      if (!data) throw new Error("Porkbun returned invalid JSON");

      return data;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : "";
      if (name === "AbortError" || /aborted/i.test(message)) {
        throw new Error(`Porkbun check timed out after ${Math.round(this.timeoutMs / 1000)}s`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parsePrice(value: string | undefined): number | undefined {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

function formatPorkbunError(data: PorkbunCheckResponse): string {
  if (data.code === "RATE_LIMIT_EXCEEDED") {
    const waitText =
      typeof data.ttlRemaining === "number" ? ` Try again in ${data.ttlRemaining}s.` : "";
    return `Porkbun rate limit exceeded.${waitText}`;
  }
  if (data.message) return `Porkbun: ${data.message}`;
  if (data.code) return `Porkbun: ${data.code}`;
  return "Porkbun check failed";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
