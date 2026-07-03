"use client";

import ResultCard from "@/components/ResultCard";
import type { DomainResult, NameIdea } from "@/lib/types";

interface Props {
  ideas: NameIdea[];
  tlds: string[];
  results: Record<string, DomainResult>;
  checking: boolean;
  provider?: string;
  noun?: string;
  isSaved: (name: string) => boolean;
  onToggleSave: (idea: NameIdea, domains: DomainResult[]) => void;
}

export default function ResultsGrid({
  ideas,
  tlds,
  results,
  checking,
  provider,
  noun = "ideas",
  isSaved,
  onToggleSave,
}: Props) {
  const availableCount = ideas.filter((idea) =>
    tlds.some((tld) => {
      const key = `${idea.name.toLowerCase().replace(/[^a-z0-9]/g, "")}${tld}`;
      return results[key]?.available;
    }),
  ).length;

  return (
    <section className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">
          {ideas.length} {noun}
          {checking
            ? " · checking domains…"
            : availableCount
              ? ` · ${availableCount} with an open domain`
              : ""}
        </h2>
        {provider && (
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white/40">
            via {provider}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ideas.map((idea, i) => (
          <ResultCard
            key={`${idea.name}-${i}`}
            idea={idea}
            tlds={tlds}
            results={results}
            checking={checking}
            index={i}
            saved={isSaved(idea.name)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </section>
  );
}
