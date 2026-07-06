import { NextResponse } from "next/server";
import { z } from "zod";
import { getNameGenerator } from "@/lib/llm/provider";
import { getDefaultModel, getModelCost, isKnownModel } from "@/lib/llm/models";
import { modelAllowed } from "@/lib/limits";
import { DEFAULT_COUNT, MAX_COUNT, type LlmProvider } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  consumeQuota,
  releaseQuota,
  resolveSubject,
  setGuestCookie,
  type ResolvedSubject,
} from "@/lib/quota.server";

export const runtime = "nodejs";

const BodySchema = z.object({
  mode: z.enum(["playful", "affix", "real-words", "portmanteau", "classical", "freeform"]),
  description: z.string().max(600).default(""),
  keywords: z.array(z.string().max(40)).max(12).default([]),
  namePattern: z.string().max(30).default(""),
  tlds: z.array(z.string().max(12)).max(10).default([]),
  count: z.number().int().min(1).max(MAX_COUNT).default(DEFAULT_COUNT),
  syllables: z.enum(["any", "1", "2", "3"]).default("any"),
  excludeNames: z.array(z.string().min(1).max(40)).max(500).default([]),
  provider: z.enum(["claude", "openai", "gemini"]).optional(),
  model: z.string().min(1).max(80).optional(),
  apiKey: z.string().max(300).optional(),
});

type GenerateRequest = z.infer<typeof BodySchema>;

/** Resolve the effective model for a provider, falling back to its default. */
function resolveModel(provider: LlmProvider | undefined, model: string | undefined) {
  if (provider && model && isKnownModel(provider, model)) return model;
  if (provider) return getDefaultModel(provider);
  return model;
}

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

  const req: GenerateRequest = {
    ...parsed.data,
    namePattern: parsed.data.mode === "affix" ? parsed.data.namePattern : "",
  };
  if (req.mode === "freeform" && !req.description.trim()) {
    return NextResponse.json(
      { error: "Freeform mode needs a description of what you want." },
      { status: 400 },
    );
  }

  const ownKey = Boolean(req.apiKey?.trim());
  const admin = getSupabaseAdmin();

  // Own API key = unlimited; no service role = enforcement disabled (fail open).
  if (ownKey || !admin) {
    try {
      const model = resolveModel(req.provider, req.model);
      const generator = await getNameGenerator(req.provider, {
        model,
        apiKey: req.apiKey?.trim() || undefined,
      });
      const ideas = await generator.generate(req);
      if (!ideas.length) {
        return NextResponse.json(
          { error: "Namblo couldn't produce names this time. Try tweaking the brief." },
          { status: 502 },
        );
      }
      return NextResponse.json({ ideas, provider: generator.id, model, quota: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Name generation failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Enforced path: reserve quota, generate, refund any shortfall.
  let resolved: ResolvedSubject;
  try {
    resolved = await resolveSubject(admin, request);
  } catch {
    // If identity resolution fails, don't hard-block the user - fail open.
    resolved = {
      subject: "",
      tier: "guest",
      limit: 0,
      renewsAt: null,
      status: null,
      guestId: null,
      guestIsNew: false,
    };
  }

  const withGuestCookie = (res: NextResponse) => {
    if (resolved.guestIsNew && resolved.guestId) setGuestCookie(res, resolved.guestId);
    return res;
  };

  if (!resolved.subject) {
    const model = resolveModel(req.provider, req.model);
    const generator = await getNameGenerator(req.provider, { model, apiKey: undefined });
    const ideas = await generator.generate(req);
    return NextResponse.json({ ideas, provider: generator.id, model, quota: null });
  }

  const model = resolveModel(req.provider, req.model);

  // Model gating: premium models on the platform key are tier-restricted.
  if (!modelAllowed(resolved.tier, getModelCost(req.provider, model), false)) {
    return withGuestCookie(
      NextResponse.json(
        { error: "That model needs the Advanced plan, or add your own API key.", quota: null },
        { status: 403 },
      ),
    );
  }

  let reserved = 0;
  try {
    const { granted, snapshot } = await consumeQuota(
      admin,
      resolved.subject,
      resolved.limit,
      req.count,
    );
    reserved = granted;

    if (granted <= 0) {
      return withGuestCookie(
        NextResponse.json(
          {
            error: "You've used today's free names. Add your own API key to keep generating.",
            quota: { ...snapshot, tier: resolved.tier },
          },
          { status: 429 },
        ),
      );
    }

    const generator = await getNameGenerator(req.provider, { model, apiKey: undefined });
    const ideas = await generator.generate({ ...req, count: granted });

    // Refund whatever we reserved but didn't produce.
    const refund = Math.max(0, granted - ideas.length);
    if (refund > 0) await releaseQuota(admin, resolved.subject, refund);
    reserved -= refund;

    if (!ideas.length) {
      return withGuestCookie(
        NextResponse.json(
          { error: "Namblo couldn't produce names this time. Try tweaking the brief." },
          { status: 502 },
        ),
      );
    }

    const used = Math.max(0, snapshot.used - refund);
    const quota = {
      used,
      limit: resolved.limit,
      remaining: Math.max(0, resolved.limit - used),
      tier: resolved.tier,
    };
    return withGuestCookie(
      NextResponse.json({ ideas, provider: generator.id, model, quota }),
    );
  } catch (err: unknown) {
    if (reserved > 0) await releaseQuota(admin, resolved.subject, reserved);
    const message = err instanceof Error ? err.message : "Name generation failed.";
    return withGuestCookie(NextResponse.json({ error: message }, { status: 500 }));
  }
}
