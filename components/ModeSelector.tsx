"use client";

import { MODES, type GenerationMode } from "@/lib/types";

interface Props {
  selected: GenerationMode;
  onSelect: (mode: GenerationMode) => void;
}

export default function ModeSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {MODES.map((mode) => {
        const active = mode.id === selected;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            aria-pressed={active}
            className={[
              "group relative rounded-xl border p-3.5 text-left transition",
              active
                ? "border-white/25 bg-white/[0.06]"
                : "border-white/[0.08] bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.04]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span
                className={[
                  "text-sm font-semibold",
                  active ? "text-white" : "text-white/80",
                ].join(" ")}
              >
                {mode.label}
              </span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
            <p className="mt-1.5 text-xs leading-snug text-white/45">{mode.blurb}</p>
            <p className="mt-2 truncate text-[11px] text-white/30">
              e.g. {mode.examples.join(", ")}
            </p>
          </button>
        );
      })}
    </div>
  );
}
