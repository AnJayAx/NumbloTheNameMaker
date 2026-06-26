"use client";

import { useState } from "react";
import type { SavedName } from "@/lib/useSavedNames";

interface Props {
  saved: SavedName[];
  onRemove: (name: string) => void;
  onClear: () => void;
}

export default function SavedPanel({ saved, onRemove, onClear }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-700/80 px-4 py-2 text-sm text-white/80 backdrop-blur-xl transition hover:border-amber-300/40 hover:text-white shadow-led-soft"
      >
        <span className="text-amber-300">★</span>
        Saved
        {saved.length > 0 && (
          <span className="rounded-full bg-amber-300/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
            {saved.length}
          </span>
        )}
      </button>

      {/* Drawer */}
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
          aria-label="Saved names"
          className={[
            "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 backdrop-blur-xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">
              Saved names{" "}
              <span className="text-white/40">({saved.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-white/60 transition hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {saved.length === 0 ? (
              <p className="mt-10 text-center text-sm text-white/40">
                No saved names yet.
                <br />
                Tap the ★ on any name to keep it here.
              </p>
            ) : (
              saved.map((item) => (
                <SavedRow key={item.name} item={item} onRemove={onRemove} />
              ))
            )}
          </div>

          {saved.length > 0 && (
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

function SavedRow({ item, onRemove }: { item: SavedName; onRemove: (name: string) => void }) {
  const [copied, setCopied] = useState(false);
  const firstAvailable = item.domains.find((d) => d.available)?.domain;

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
    <div className="glass led-ring p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{item.name}</h3>
          {item.style && (
            <span className="mt-0.5 inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
              {item.style}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/60 transition hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.name)}
            aria-label="Remove"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/40 transition hover:border-red-400/40 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </div>

      {item.rationale && (
        <p className="mt-1.5 text-xs leading-snug text-white/50">{item.rationale}</p>
      )}

      {item.domains.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.domains.map((d) => (
            <span
              key={d.domain}
              className={[
                "pill border text-xs",
                d.available
                  ? "border-neon-lime/40 bg-neon-lime/10 text-neon-lime"
                  : "border-white/10 bg-white/[0.02] text-white/35 line-through",
              ].join(" ")}
            >
              {d.tld}
              {d.available && d.price !== undefined && (
                <span className="text-white/70">${d.price.toFixed(2)}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
