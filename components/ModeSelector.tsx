"use client";

import { MODES, type GenerationMode } from "@/lib/types";

interface Props {
  selected: GenerationMode;
  onSelect: (mode: GenerationMode) => void;
}

export default function ModeSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
        1 · Pick a naming style
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODES.map((mode) => {
          const active = mode.id === selected;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelect(mode.id)}
              aria-pressed={active}
              className={[
                "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200",
                active
                  ? "border-neon-cyan/50 bg-neon-cyan/[0.06] shadow-led-cyan"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">{mode.label}</span>
                {active && <span className="h-2 w-2 animate-pulse-glow rounded-full bg-neon-cyan" />}
              </div>
              <p className="mt-1.5 text-xs leading-snug text-white/50">{mode.blurb}</p>
              <p className="mt-2 truncate text-[11px] text-white/35">
                e.g. {mode.examples.join(", ")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
