"use client";

import { useMemo, useState } from "react";
import TldPicker from "@/components/TldPicker";
import { parseManualNames } from "@/lib/manualNames";

export interface ManualCheckValues {
  names: string[];
  tlds: string[];
}

interface Props {
  loading: boolean;
  canStop?: boolean;
  onCheck: (values: ManualCheckValues) => void;
  onStop?: () => void;
}

export default function ManualCheckForm({ loading, canStop = false, onCheck, onStop }: Props) {
  const [input, setInput] = useState("");
  const [tlds, setTlds] = useState<string[]>([".com"]);
  const names = useMemo(() => parseManualNames(input), [input]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !names.length || !tlds.length) return;
    onCheck({ names, tlds });
  };

  return (
    <form onSubmit={submit} className="glass space-y-5 p-6">
      <div>
        <label htmlFor="manual-names" className="mb-2 block text-sm font-semibold text-white/80">
          Names to check <span className="font-normal text-white/40">(comma-separated)</span>
        </label>
        <textarea
          id="manual-names"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          placeholder="Evoke, Pursuit, Vantage, Forge, Threshold, Vantage Point"
          className="w-full resize-y rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-neon-cyan/50 focus:shadow-led-cyan"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-white/80">Preferred TLDs</span>
        <TldPicker selected={tlds} onChange={setTlds} />
      </div>

      <div className={canStop ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}>
        <button
          type="submit"
          disabled={loading || !names.length || !tlds.length}
          className="btn-primary w-full text-sm"
        >
          {canStop
            ? "Checking names…"
            : `Check ${names.length || 0} ${names.length === 1 ? "name" : "names"}`}
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
