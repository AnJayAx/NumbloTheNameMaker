"use client";

import { useState } from "react";
import { toDomain, type DomainResult, type NameIdea } from "@/lib/types";

interface Props {
  idea: NameIdea;
  tlds: string[];
  results: Record<string, DomainResult>;
  checking: boolean;
  index: number;
  saved: boolean;
  onToggleSave: (idea: NameIdea, domains: DomainResult[]) => void;
}

export default function ResultCard({
  idea,
  tlds,
  results,
  checking,
  index,
  saved,
  onToggleSave,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const domains = tlds.map((tld) => ({ tld, domain: toDomain(idea.name, tld) }));
  const firstAvailable = domains.find((d) => results[d.domain]?.available)?.domain;

  const handleSave = () => {
    const snapshot = domains
      .map((d) => results[d.domain])
      .filter((r): r is DomainResult => Boolean(r));
    onToggleSave(idea, snapshot);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="glass card-hover animate-fade-up p-5"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-black tracking-tight text-white">{idea.name}</h3>
          {idea.style && (
            <span className="mt-1.5 inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/50">
              {idea.style}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save name"}
            title={saved ? "Saved — click to remove" : "Save this name"}
            className={[
              "rounded-lg border px-2 py-1 text-sm transition",
              saved
                ? "border-white/30 bg-white/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:text-white",
            ].join(" ")}
          >
            <StarIcon filled={saved} />
          </button>
          <button
            type="button"
            onClick={() => copy(firstAvailable ?? idea.name)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60 transition hover:border-neon-cyan/40 hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {idea.rationale && (
        <p className="mt-2 text-sm leading-snug text-white/55">{idea.rationale}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {domains.map(({ tld, domain }) => (
          <Pill key={domain} tld={tld} result={results[domain]} checking={checking} />
        ))}
      </div>
    </div>
  );
}

function Pill({
  tld,
  result,
  checking,
}: {
  tld: string;
  result?: DomainResult;
  checking: boolean;
}) {
  if (!result) {
    if (checking) {
      return (
        <span className="pill shimmer animate-shimmer border border-white/10 text-transparent">
          {tld} ·····
        </span>
      );
    }
    return <span className="pill border border-white/10 text-white/40">{tld}</span>;
  }

  if (result.error) {
    return (
      <span className="pill border border-amber-400/30 bg-amber-400/5 text-amber-200/70" title={result.error}>
        {tld} · ?
      </span>
    );
  }

  if (result.available) {
    return (
      <span className="pill border border-white/25 bg-white/[0.07] text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        {tld}
        {result.premium && <span className="text-amber-300">★</span>}
        {result.price !== undefined && (
          <span className="text-white/70">${result.price.toFixed(2)}</span>
        )}
      </span>
    );
  }

  return (
    <span className="pill border border-white/10 bg-white/[0.02] text-white/35 line-through">
      {tld}
    </span>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6.06 6.6.86-4.85 4.55 1.24 6.53L12 17.9l-5.89 2.6 1.24-6.53L2.5 9.42l6.6-.86L12 2.5z" />
    </svg>
  );
}
