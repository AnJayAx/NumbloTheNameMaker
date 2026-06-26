import type { GenerateRequest, LlmProvider, NameIdea } from "@/lib/types";

/** Every LLM adapter implements this single method. */
export interface NameGenerator {
  readonly id: string;
  generate(req: GenerateRequest): Promise<NameIdea[]>;
}

export interface NameGeneratorOptions {
  model?: string;
  apiKey?: string;
}

/**
 * Returns the configured name generator. Adapters are imported lazily so that
 * an unused provider's optional SDK never has to be installed.
 */
export async function getNameGenerator(
  requestedProvider?: LlmProvider,
  options: NameGeneratorOptions = {},
): Promise<NameGenerator> {
  const provider = (requestedProvider || process.env.LLM_PROVIDER || "claude").toLowerCase();
  switch (provider) {
    case "claude": {
      const { ClaudeGenerator } = await import("@/lib/llm/claude");
      return new ClaudeGenerator(options);
    }
    case "openai": {
      const { OpenAIGenerator } = await import("@/lib/llm/openai");
      return new OpenAIGenerator(options);
    }
    case "gemini": {
      const { GeminiGenerator } = await import("@/lib/llm/gemini");
      return new GeminiGenerator(options);
    }
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${provider}". Use one of: claude, openai, gemini.`,
      );
  }
}
