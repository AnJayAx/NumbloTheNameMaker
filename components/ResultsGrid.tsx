"use client";

import ResultCard from "@/components/ResultCard";
import type { DomainResult, NameIdea } from "@/lib/types";

interface Props {
  ideas: NameIdea[];
  tlds: string[];
  results: Record<string, DomainResult>;
  checking: boolean;
  provider?: string;
  isSaved: (name: string) => boolean;
  onToggleSave: (idea: NameIdea, domains: DomainResult[]) => void;
}

export default function ResultsGrid({
  ideas,
  tlds,
  results,
  checking,
  provider,
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
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
          {ideas.length} ideas
          {checking ? " · checking domains…" : availableCount ? ` · ${availableCount} with an open domain` : ""}
        </h2>
        {provider && (
          <span className="font-mono text-[11px] text-white/30">via {provider}</span>
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
