import { z } from "zod";
import type { NameIdea } from "@/lib/types";

const IdeaSchema = z.object({
  name: z.string().min(1).max(40),
  rationale: z.string().default(""),
  style: z.string().default(""),
});

const PayloadSchema = z.object({
  ideas: z.array(IdeaSchema).default([]),
});

/** JSON Schema for providers that support structured/strict output. */
export const NAME_LIST_JSON_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          rationale: { type: "string" },
          style: { type: "string" },
        },
        required: ["name", "rationale", "style"],
        additionalProperties: false,
      },
    },
  },
  required: ["ideas"],
  additionalProperties: false,
} as const;

/**
 * Robustly extract a list of name ideas from raw model text. Handles fenced
 * code blocks and surrounding prose by isolating the outermost JSON object.
 */
export function parseIdeas(raw: string): NameIdea[] {
  const json = extractJsonObject(raw);
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const result = PayloadSchema.safeParse(data);
  if (!result.success) return [];
  // De-duplicate by lowercased name, drop empties.
  const seen = new Set<string>();
  const ideas: NameIdea[] = [];
  for (const idea of result.data.ideas) {
    const key = idea.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ideas.push({
      name: idea.name.trim(),
      rationale: idea.rationale.trim(),
      style: idea.style.trim(),
    });
  }
  return ideas;
}

function extractJsonObject(raw: string): string | null {
  const text = raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
