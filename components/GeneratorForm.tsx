"use client";

import { useState } from "react";
import TldPicker from "@/components/TldPicker";
import {
  DEFAULT_COUNT,
  DEFAULT_TLDS,
  MAX_COUNT,
  type SyllablePreference,
} from "@/lib/types";

const SYLLABLE_OPTIONS: Array<{
  value: SyllablePreference;
  label: string;
  example: string;
}> = [
  { value: "any", label: "Any", example: "Flexible" },
  { value: "1", label: "1", example: "Grab" },
  { value: "2", label: "2", example: "Google" },
  { value: "3", label: "3", example: "Amazon" },
];

export interface FormValues {
  description: string;
  keywords: string[];
  namePattern: string;
  tlds: string[];
  count: number;
  syllables: SyllablePreference;
}

interface Props {
  loading: boolean;
  canStop?: boolean;
  freeform: boolean;
  allowNamePattern?: boolean;
  /** Free names are used up and the selected provider has no key of its own. */
  blocked?: boolean;
  onGenerate: (values: FormValues) => void;
  onStop?: () => void;
  onRequestKey?: () => void;
}

export default function GeneratorForm({
  loading,
  canStop = false,
  freeform,
  allowNamePattern = false,
  blocked = false,
  onGenerate,
  onStop,
  onRequestKey,
}: Props) {
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [namePattern, setNamePattern] = useState("");
  const [tlds, setTlds] = useState<string[]>(DEFAULT_TLDS.slice(0, 3));
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [syllables, setSyllables] = useState<SyllablePreference>("any");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || blocked) return;
    onGenerate({
      description: description.trim(),
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      namePattern: allowNamePattern ? namePattern.trim() : "",
      tlds: tlds.length ? tlds : DEFAULT_TLDS.slice(0, 3),
      count,
      syllables,
    });
  };

  return (
    <form onSubmit={submit} className="glass space-y-5 p-6">
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
          className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
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
          className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
        />
      </div>

      {allowNamePattern && (
        <div>
          <label htmlFor="pattern" className="mb-2 block text-sm font-semibold text-white/80">
            Name pattern <span className="font-normal text-white/40">(optional)</span>
          </label>
          <input
            id="pattern"
            value={namePattern}
            onChange={(e) => setNamePattern(e.target.value)}
            maxLength={30}
            placeholder="pipe-, -pipe, pi-pe"
            className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
          />
        </div>
      )}

      <div>
        <span className="mb-2 block text-sm font-semibold text-white/80">Preferred TLDs</span>
        <TldPicker selected={tlds} onChange={setTlds} />
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-white/80">Syllable target</span>
        <div className="grid grid-cols-4 gap-2">
          {SYLLABLE_OPTIONS.map((option) => {
            const active = syllables === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSyllables(option.value)}
                aria-pressed={active}
                className={[
                  "min-h-[4.25rem] rounded-xl border px-3 py-2 text-center transition-all",
                  active
                    ? "border-neon-cyan/50 bg-neon-cyan/[0.08] text-white shadow-led-cyan"
                    : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
                ].join(" ")}
              >
                <span className="block text-base font-bold">{option.label}</span>
                <span className="mt-1 block truncate text-[11px] text-white/40">
                  {option.example}
                </span>
              </button>
            );
          })}
        </div>
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

      {blocked ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onRequestKey}
            className="btn-primary w-full text-sm"
          >
            Free names used up - add an API key
          </button>
          <p className="text-center text-xs leading-snug text-white/45">
            You&apos;ve used today&apos;s free names. Add your own API key to keep generating
            without limits - your free names reset tomorrow.
          </p>
        </div>
      ) : (
        <div className={canStop ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}>
          <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
            {canStop ? (
              <>
                <Spinner />
                Namblo is generating…
              </>
            ) : (
              "Generate names"
            )}
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
      )}
    </form>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
