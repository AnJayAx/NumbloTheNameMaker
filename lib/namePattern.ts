export interface NamePatternRule {
  prefix?: string;
  suffix?: string;
}

export function cleanNamePattern(pattern?: string): string {
  return (pattern ?? "").trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30);
}

export function parseNamePattern(pattern?: string): NamePatternRule | null {
  const clean = cleanNamePattern(pattern);
  const letters = clean.replace(/-/g, "");
  if (!clean || !letters) return null;

  if (!clean.includes("-")) {
    return { prefix: clean };
  }

  const parts = clean.split("-").filter(Boolean);
  if (parts.length === 1 && clean.endsWith("-")) {
    return { prefix: parts[0] };
  }
  if (parts.length === 1 && clean.startsWith("-")) {
    return { suffix: parts[0] };
  }
  if (parts.length >= 2) {
    return { prefix: parts[0], suffix: parts[parts.length - 1] };
  }

  return null;
}

export function buildNamePatternInstruction(pattern?: string): string | null {
  const rule = parseNamePattern(pattern);
  if (!rule) return null;
  const hasDash = cleanNamePattern(pattern).includes("-");

  if (rule.prefix && rule.suffix) {
    return (
      `Name pattern: every name must start with "${rule.prefix}" and end with "${rule.suffix}". ` +
      "The dash is only a placeholder for the invented middle, so do not include a hyphen in the final names. " +
      "Any name that does not satisfy this pattern is invalid."
    );
  }

  if (rule.prefix) {
    return (
      `Name pattern: every name must start with "${rule.prefix}". ` +
      (hasDash
        ? "The dash is only a placeholder, so do not include a hyphen in the final names. "
        : "Treat this as a required prefix. ") +
      "Any name that does not satisfy this pattern is invalid."
    );
  }

  return (
    `Name pattern: every name must end with "${rule.suffix}". ` +
    "The dash is only a placeholder, so do not include a hyphen in the final names. " +
    "Any name that does not satisfy this pattern is invalid."
  );
}

export function matchesNamePattern(name: string, pattern?: string): boolean {
  const rule = parseNamePattern(pattern);
  if (!rule) return true;
  if (name.includes("-")) return false;

  const label = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!label) return false;

  const prefix = rule.prefix?.toLowerCase();
  const suffix = rule.suffix?.toLowerCase();
  if (prefix && !label.startsWith(prefix)) return false;
  if (suffix && !label.endsWith(suffix)) return false;
  if (prefix && suffix && label.length <= prefix.length + suffix.length) return false;

  return true;
}
