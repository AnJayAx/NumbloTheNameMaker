"use client";

import { useState } from "react";
import TldPicker from "@/components/TldPicker";
import { DEFAULT_COUNT, DEFAULT_TLDS, MAX_COUNT } from "@/lib/types";

export interface FormValues {
  description: string;
  keywords: string[];
  tlds: string[];
  count: number;
}

interface Props {
  loading: boolean;
  canStop?: boolean;
  freeform: boolean;
  onGenerate: (values: FormValues) => void;
  onStop?: () => void;
}

export default function GeneratorForm({ loading, canStop = false, freeform, onGenerate, onStop }: Props) {
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tlds, setTlds] = useState<string[]>(DEFAULT_TLDS.slice(0, 3));
  const [count, setCount] = useState(DEFAULT_COUNT);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    onGenerate({
      description: description.trim(),
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      tlds: tlds.length ? tlds : DEFAULT_TLDS.slice(0, 3),
      count,
    });
  };

  return (
    <form onSubmit={submit} className="glass led-ring space-y-5 p-5 sm:p-6">
      <div>
        <label htmlFor="desc" className="mb-2 block text-sm font-semibold text-white/80">
          {freeform ? "Describe exactly what you want" : "What's the business or project?"}
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={
            freeform
              ? "e.g. a calm, one-syllable name for a meditation app, soft sounds"
              : "e.g. a developer tool that turns API logs into dashboards"
          }
          className="w-full resize-none rounded-xl border border-white/10 bg-ink-700/60 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
        />
      </div>

      <div>
        <label htmlFor="kw" className="mb-2 block text-sm font-semibold text-white/80">
          Keywords / themes <span className="font-normal text-white/40">(comma-separated, optional)</span>
        </label>
        <input
          id="kw"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="logs, observability, fast, signal"
          className="w-full rounded-xl border border-white/10 bg-ink-700/60 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-white/80">Preferred TLDs</span>
        <TldPicker selected={tlds} onChange={setTlds} />
      </div>

      <div>
        <label htmlFor="count" className="mb-2 flex items-center justify-between text-sm font-semibold text-white/80">
          <span>How many names?</span>
          <span className="font-mono text-neon-cyan">{count}</span>
        </label>
        <input
          id="count"
          type="range"
          min={3}
          max={MAX_COUNT}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-neon-cyan"
        />
      </div>

      <div className={canStop ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-magenta px-5 py-3 text-sm font-semibold text-ink-900 shadow-led-soft transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canStop ? "Mark is generating..." : "Generate names"}
        </button>
        {canStop && (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl border border-red-300/40 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:border-red-200/70 hover:bg-red-400/20"
          >
            Stop
          </button>
        )}
      </div>
    </form>
  );
}
