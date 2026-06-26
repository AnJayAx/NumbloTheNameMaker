import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest, NameIdea } from "@/lib/types";
import type { NameGenerator, NameGeneratorOptions } from "@/lib/llm/provider";
import { buildBrief, systemPrompt } from "@/lib/llm/prompts";
import { NAME_LIST_JSON_SCHEMA, parseIdeas } from "@/lib/llm/parse";
import { getDefaultModel } from "@/lib/llm/models";

/**
 * Reference adapter. Uses the Anthropic Messages API with structured JSON
 * output (output_config.format), then validates/parses defensively.
 */
export class ClaudeGenerator implements NameGenerator {
  readonly id = "claude";
  private client: Anthropic;
  private model: string;

  constructor(options: NameGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    this.client = new Anthropic({ apiKey });
    this.model = options.model || process.env.CLAUDE_MODEL || getDefaultModel("claude");
  }

  async generate(req: GenerateRequest): Promise<NameIdea[]> {
    // We pass output_config (structured outputs, GA on Sonnet 4.6) for a clean
    // JSON response, and still parse defensively so the adapter keeps working
    // even if a given SDK/model build ignores the field.
    const params = {
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt(),
      messages: [{ role: "user", content: buildBrief(req) }],
      output_config: {
        format: { type: "json_schema", schema: NAME_LIST_JSON_SCHEMA },
      },
    };

    const response = await this.client.messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return parseIdeas(text);
  }
}
