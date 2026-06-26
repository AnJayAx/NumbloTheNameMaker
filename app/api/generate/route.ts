import { NextResponse } from "next/server";
import { z } from "zod";
import { getNameGenerator } from "@/lib/llm/provider";
import { getDefaultModel, isKnownModel } from "@/lib/llm/models";
import { DEFAULT_COUNT, MAX_COUNT } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  mode: z.enum(["playful", "affix", "real-words", "portmanteau", "classical", "freeform"]),
  description: z.string().max(600).default(""),
  keywords: z.array(z.string().max(40)).max(12).default([]),
  tlds: z.array(z.string().max(12)).max(10).default([]),
  count: z.number().int().min(1).max(MAX_COUNT).default(DEFAULT_COUNT),
  excludeNames: z.array(z.string().min(1).max(40)).max(500).default([]),
  provider: z.enum(["claude", "openai", "gemini"]).optional(),
  model: z.string().min(1).max(80).optional(),
  apiKey: z.string().max(300).optional(),
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

  const req = parsed.data;
  if (req.mode === "freeform" && !req.description.trim()) {
    return NextResponse.json(
      { error: "Freeform mode needs a description of what you want." },
      { status: 400 },
    );
  }

  try {
    const provider = req.provider;
    const model =
      provider && req.model && isKnownModel(provider, req.model)
        ? req.model
        : provider
          ? getDefaultModel(provider)
          : req.model;
    const generator = await getNameGenerator(provider, {
      model,
      apiKey: req.apiKey?.trim() || undefined,
    });
    const ideas = await generator.generate(req);
    if (!ideas.length) {
      return NextResponse.json(
        { error: "Mark couldn't produce names this time. Try tweaking the brief." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ideas, provider: generator.id, model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Name generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
