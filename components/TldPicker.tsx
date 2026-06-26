"use client";

import { DEFAULT_TLDS } from "@/lib/types";

const SUGGESTED = [...DEFAULT_TLDS, ".so", ".xyz", ".net", ".org"];

interface Props {
  selected: string[];
  onChange: (tlds: string[]) => void;
}

export default function TldPicker({ selected, onChange }: Props) {
  const toggle = (tld: string) => {
    onChange(
      selected.includes(tld) ? selected.filter((t) => t !== tld) : [...selected, tld],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED.map((tld) => {
        const active = selected.includes(tld);
        return (
          <button
            key={tld}
            type="button"
            onClick={() => toggle(tld)}
            aria-pressed={active}
            className={[
              "rounded-full border px-3 py-1 font-mono text-sm transition-all",
              active
                ? "border-neon-magenta/50 bg-neon-magenta/10 text-white shadow-led-magenta"
                : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
            ].join(" ")}
          >
            {tld}
          </button>
        );
      })}
    </div>
  );
}
