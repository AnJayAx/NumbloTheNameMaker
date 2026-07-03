import { toDomainLabel } from "@/lib/types";

export function parseManualNames(input: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of input.split(",")) {
    const name = part.trim().replace(/\s+/g, " ");
    const key = toDomainLabel(name);
    if (!name || key.length < 2 || key.length > 63 || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}
