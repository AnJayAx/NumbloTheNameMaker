import { NextResponse } from "next/server";
import { z } from "zod";
import { getDomainChecker } from "@/lib/domains/provider";

export const runtime = "nodejs";

const BodySchema = z.object({
  // up to 15 names x 10 TLDs
  domains: z.array(z.string().min(3).max(80)).min(1).max(150),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Keep only well-formed "name.tld" strings.
  const domains = Array.from(
    new Set(
      parsed.data.domains
        .map((d) => d.trim().toLowerCase())
        .filter((d) => /^[a-z0-9-]+\.[a-z]{2,}$/.test(d)),
    ),
  );

  if (!domains.length) {
    return NextResponse.json({ error: "No valid domains to check." }, { status: 400 });
  }

  try {
    const checker = await getDomainChecker();
    const results = await checker.check(domains);
    return NextResponse.json({ results, provider: checker.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Domain check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
