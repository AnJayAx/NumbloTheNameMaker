import type { GenerateRequest, GenerationMode } from "@/lib/types";

/** Mark's core persona — shared across every mode and provider. */
const PERSONA = `You are Mark, a world-class brand-naming agent. You invent names that are
short, memorable, easy to say, easy to spell, and distinctive. You think like the
founders behind Google, Stripe, Shopify, Meta, Netflix, and Vimeo.

Hard rules:
- Names should generally be 1-3 syllables and easy to type.
- Avoid hyphens, numbers, and double letters unless they genuinely improve the name.
- Avoid generic, overused startup clichés (e.g. "Hub", "Hub", "ly" spam) unless the mode calls for it.
- Do NOT include a TLD or domain extension in the name itself.
- Each idea needs a short, concrete rationale (max ~12 words) — why it fits the brief.
- Never repeat a name. Vary first letters and sounds across the set.`;

/** Per-mode creative direction. */
const MODE_DIRECTION: Record<GenerationMode, string> = {
  playful: `MODE: Playful / Invented.
Coin brand-new words with no prior dictionary meaning but a fun, bouncy sound.
Lean on punchy vowels and made-up morphemes. Think: Google, Grok, Zapier, Hulu, Yahoo.`,
  affix: `MODE: Affix.
Take a meaningful root from the brief and attach a productive prefix or suffix such as
-ify, -ly, -io, -hub, -labs, -ai, -base, -kit, super-, meta-, hyper-.
Think: Shopify, Smartify, Calendly, Twilio, Firebase.`,
  "real-words": `MODE: Real Words / Evocative.
Repurpose an existing everyday word or vivid metaphor whose feeling matches the brief.
The word should be unexpected yet fitting. Think: Amazon, Meta, Grab, Stripe, Apple.`,
  portmanteau: `MODE: Portmanteau / Compound.
Blend or fuse two relevant words into one seamless new word. The seam should feel natural.
Think: Netflix (net+flicks), Pinterest (pin+interest), Microsoft, Instagram.`,
  classical: `MODE: Classical / Foreign Roots.
Build names from Latin, Greek, or other-language roots that evoke the brief's meaning,
giving a timeless, premium feel. Think: Volvo (I roll), Asana, Vimeo, Sonos, Nokia.`,
  freeform: `MODE: Freeform.
Read the user's description closely and infer the best naming style yourself. You may mix
techniques (invented, affixed, real words, blends, roots). Prioritize what fits the brief.`,
};

/** Builds the user-turn brief from the structured request. */
export function buildBrief(req: GenerateRequest): string {
  const lines: string[] = [];
  lines.push(MODE_DIRECTION[req.mode]);
  lines.push("");
  lines.push(`Business / project: ${req.description.trim() || "(not specified)"}`);
  if (req.keywords.length) {
    lines.push(`Keywords / themes to draw from: ${req.keywords.join(", ")}`);
  }
  if (req.tlds.length) {
    lines.push(
      `The user prefers these TLDs: ${req.tlds.join(", ")}. Favor names that read well with them ` +
        `(e.g. shorter names for .com, clever reads for .io / .ai).`,
    );
  }
  if (req.excludeNames?.length) {
    const exclusions = req.excludeNames.slice(-250);
    lines.push(
      `Do not generate any of these previously generated names or tiny spelling variants: ${exclusions.join(", ")}.`,
    );
  }
  lines.push("");
  lines.push(
    `Produce exactly ${req.count} distinct name ideas. For each, give the name, a one-line ` +
      `rationale, and a short style tag (e.g. "invented", "affix", "metaphor", "blend", "root").`,
  );
  lines.push("");
  lines.push(
    'Respond with ONLY a JSON object, no prose or markdown fences: ' +
      '{ "ideas": [ { "name": string, "rationale": string, "style": string } ] }',
  );
  return lines.join("\n");
}

export function systemPrompt(): string {
  return PERSONA;
}
