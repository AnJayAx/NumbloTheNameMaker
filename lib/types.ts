// Shared domain-model types used across the API, providers, and UI.

/** The five structured generation modes plus freeform. */
export type GenerationMode =
  | "playful"
  | "affix"
  | "real-words"
  | "portmanteau"
  | "classical"
  | "freeform";

export type LlmProvider = "claude" | "openai" | "gemini";

export interface ModeMeta {
  id: GenerationMode;
  label: string;
  blurb: string;
  examples: string[];
}

/** Catalogue of modes, also used to render the selector UI. */
export const MODES: ModeMeta[] = [
  {
    id: "playful",
    label: "Playful / Invented",
    blurb: "Coined, brandable, fun-to-say words with no prior meaning.",
    examples: ["Google", "Grok", "Zapier", "Hulu"],
  },
  {
    id: "affix",
    label: "Affix",
    blurb: "A root plus a prefix or suffix like -ify, -ly, -io, -hub, -labs.",
    examples: ["Shopify", "Smartify", "Calendly", "Twilio"],
  },
  {
    id: "real-words",
    label: "Real Words",
    blurb: "Everyday words and metaphors repurposed as a brand.",
    examples: ["Amazon", "Meta", "Grab", "Stripe"],
  },
  {
    id: "portmanteau",
    label: "Portmanteau",
    blurb: "Two words blended into one memorable mashup.",
    examples: ["Netflix", "Pinterest", "Microsoft", "Instagram"],
  },
  {
    id: "classical",
    label: "Classical Roots",
    blurb: "Latin, Greek, or other-language roots for a timeless feel.",
    examples: ["Volvo", "Asana", "Vimeo", "Sonos"],
  },
  {
    id: "freeform",
    label: "Freeform",
    blurb: "Describe exactly what you want — Mark figures out the style.",
    examples: ["“calm, one-syllable, for a meditation app”"],
  },
];

/** A single name idea returned by the LLM. */
export interface NameIdea {
  name: string;
  rationale: string;
  /** Short style tag, e.g. "invented", "affix", "metaphor". */
  style: string;
}

/** Request payload from the UI to /api/generate. */
export interface GenerateRequest {
  mode: GenerationMode;
  description: string;
  keywords: string[];
  tlds: string[];
  count: number;
  excludeNames?: string[];
  provider?: LlmProvider;
  model?: string;
}

/** Availability + pricing for one domain (name + tld). */
export interface DomainResult {
  domain: string;
  tld: string;
  available: boolean;
  price?: number;
  currency?: string;
  premium?: boolean;
  /** Which provider produced this result: "rdap" | "namecheap" | "porkbun" | "mock". */
  source: string;
  error?: string;
}

/** Request payload from the UI to /api/check. */
export interface CheckRequest {
  domains: string[];
}

export const DEFAULT_TLDS = [".com", ".io", ".ai", ".co", ".app", ".dev"];
export const MAX_COUNT = 15;
export const DEFAULT_COUNT = 10;

/** Normalises a brand name into the registrable label (lowercase, alnum only). */
export function toDomainLabel(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Builds "label.tld" from a name and a TLD that includes the leading dot. */
export function toDomain(name: string, tld: string): string {
  return `${toDomainLabel(name)}${tld.startsWith(".") ? tld : `.${tld}`}`;
}
