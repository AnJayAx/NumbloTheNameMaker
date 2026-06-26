"use client";

import { useMemo, useState } from "react";
import type { GeneratedNameHistoryEntry } from "@/lib/useGeneratedHistory";

interface Props {
  history: GeneratedNameHistoryEntry[];
  isSaved: (name: string) => boolean;
  onSave: (item: GeneratedNameHistoryEntry) => void;
  onClear: () => void;
}

export default function HistoryPanel({ history, isSaved, onSave, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ordered = useMemo(() => [...history].reverse(), [history]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-16 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-700/80 px-4 py-2 text-sm text-white/80 shadow-led-soft backdrop-blur-xl transition hover:border-neon-cyan/40 hover:text-white"
      >
        <span className="font-mono text-neon-cyan">H</span>
        History
        {history.length > 0 && (
          <span className="rounded-full bg-neon-cyan/15 px-2 py-0.5 text-xs font-semibold text-neon-cyan">
            {history.length}
          </span>
        )}
      </button>

      <div
        className={[
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={[
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
        <aside
          role="dialog"
          aria-label="Generated name history"
          className={[
            "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 backdrop-blur-xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">
              History <span className="text-white/40">({history.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-white/60 transition hover:text-white"
            >
              x
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {ordered.length === 0 ? (
              <p className="mt-10 text-center text-sm text-white/40">
                No generated names yet.
              </p>
            ) : (
              ordered.map((item) => (
                <HistoryRow
                  key={`${item.key}-${item.generatedAt}`}
                  item={item}
                  saved={isSaved(item.name)}
                  onSave={onSave}
                />
              ))
            )}
          </div>

          {history.length > 0 && (
            <div className="border-t border-white/10 px-5 py-3">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-white/40 transition hover:text-red-300"
              >
                Clear all
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function HistoryRow({
  item,
  saved,
  onSave,
}: {
  item: GeneratedNameHistoryEntry;
  saved: boolean;
  onSave: (item: GeneratedNameHistoryEntry) => void;
}) {
  const [copied, setCopied] = useState(false);
  const firstAvailable = item.domains.find((domain) => domain.available)?.domain;
  const checkedAndTaken = item.domains.length > 0 && !firstAvailable;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(firstAvailable ?? item.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className={[
        "glass led-ring relative w-full p-4 text-left transition",
        saved
          ? "border-amber-300/40 bg-amber-300/[0.06] shadow-[0_0_18px_-8px_rgba(252,211,77,0.85)]"
          : "hover:border-amber-300/35 hover:bg-white/[0.05]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSave(item)}
        aria-pressed={saved}
        aria-label={saved ? `${item.name} is saved` : `Save ${item.name}`}
        title={saved ? "Saved" : "Save this name"}
        className="absolute inset-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-300/45"
      />

      <div className="pointer-events-none relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-lg font-bold">{item.name}</h3>
            {saved && (
              <span className="shrink-0 text-amber-300" aria-hidden>
                <StarIcon />
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.style && (
              <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
                {item.style}
              </span>
            )}
            <span className="font-mono text-[10px] text-white/30">
              {new Date(item.generatedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          className="pointer-events-auto relative shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/60 transition hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {item.rationale && (
        <p className="pointer-events-none relative mt-1.5 text-xs leading-snug text-white/50">
          {item.rationale}
        </p>
      )}

      {item.domains.length > 0 ? (
        <div className="pointer-events-none relative mt-3 flex flex-wrap gap-1.5">
          {item.domains.map((domain) => (
            <span
              key={domain.domain}
              className={[
                "pill border text-xs",
                domain.available
                  ? "border-neon-lime/40 bg-neon-lime/10 text-neon-lime"
                  : "border-white/10 bg-white/[0.02] text-white/35 line-through",
              ].join(" ")}
            >
              {domain.tld}
              {domain.available && domain.price !== undefined && (
                <span className="text-white/70">${domain.price.toFixed(2)}</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="pointer-events-none relative mt-3 text-xs text-white/30">
          Not checked yet
        </p>
      )}

      {checkedAndTaken && (
        <p className="pointer-events-none relative mt-2 text-xs text-white/35">
          All checked TLDs were taken.
        </p>
      )}
    </div>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6.06 6.6.86-4.85 4.55 1.24 6.53L12 17.9l-5.89 2.6 1.24-6.53L2.5 9.42l6.6-.86L12 2.5z" />
    </svg>
  );
}
