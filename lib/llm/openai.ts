import type { GenerateRequest, NameIdea } from "@/lib/types";
import type { NameGenerator, NameGeneratorOptions } from "@/lib/llm/provider";
import { getDefaultModel } from "@/lib/llm/models";
import { buildBrief, systemPrompt } from "@/lib/llm/prompts";
import { parseIdeas } from "@/lib/llm/parse";

/** OpenAI adapter using the HTTPS API directly so no optional SDK is required. */
export class OpenAIGenerator implements NameGenerator {
  readonly id = "openai";
  private apiKey: string;
  private model: string;

  constructor(options: NameGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    this.apiKey = apiKey;
    this.model = options.model || process.env.OPENAI_MODEL || getDefaultModel("openai");
  }

  async generate(req: GenerateRequest): Promise<NameIdea[]> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: buildBrief(req) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(apiError(data, "OpenAI generation failed."));
    }

    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return parseIdeas(text);
  }
}

function apiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string") return error.message;
  }
  return fallback;
}
