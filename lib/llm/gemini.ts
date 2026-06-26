import type { GenerateRequest, NameIdea } from "@/lib/types";
import type { NameGenerator, NameGeneratorOptions } from "@/lib/llm/provider";
import { getDefaultModel } from "@/lib/llm/models";
import { buildBrief, systemPrompt } from "@/lib/llm/prompts";
import { parseIdeas } from "@/lib/llm/parse";

/** Gemini adapter using the HTTPS API directly so no optional SDK is required. */
export class GeminiGenerator implements NameGenerator {
  readonly id = "gemini";
  private apiKey: string;
  private model: string;

  constructor(options: NameGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    this.apiKey = apiKey;
    this.model = options.model || process.env.GEMINI_MODEL || getDefaultModel("gemini");
  }

  async generate(req: GenerateRequest): Promise<NameIdea[]> {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
    );
    url.searchParams.set("key", this.apiKey);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt() }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildBrief(req) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(apiError(data, "Gemini generation failed."));
    }

    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";
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
