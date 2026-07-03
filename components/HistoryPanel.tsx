"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { FilterBar } from "@/components/SavedPanel";
import type { GeneratedNameHistoryEntry } from "@/lib/useGeneratedHistory";

interface Props {
  open: boolean;
  history: GeneratedNameHistoryEntry[];
  isSaved: (name: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: GeneratedNameHistoryEntry) => void;
  onClear: () => void;
}

type SortKey = "newest" | "oldest" | "az";
type Availability = "all" | "available" | "taken";

const hasAvailable = (item: GeneratedNameHistoryEntry) => item.domains.some((d) => d.available);
const isChecked = (item: GeneratedNameHistoryEntry) => item.domains.length > 0;

export default function HistoryPanel({
  open,
  history,
  isSaved,
  onOpenChange,
  onSave,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [availability, setAvailability] = useState<Availability>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = history.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (availability === "available") return hasAvailable(item);
      if (availability === "taken") return isChecked(item) && !hasAvailable(item);
      return true;
    });

    const sorted = [...filtered];
    if (sort === "newest") sorted.sort((a, b) => b.generatedAt - a.generatedAt);
    else if (sort === "oldest") sorted.sort((a, b) => a.generatedAt - b.generatedAt);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [history, query, sort, availability]);

  const footer =
    history.length > 0 ? (
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          {visible.length} of {history.length} shown
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-white/40 transition hover:text-red-300"
        >
          Clear all
        </button>
      </div>
    ) : undefined;

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={
        <span>
          History <span className="text-white/40">({history.length})</span>
        </span>
      }
      ariaLabel="Generated name history"
      footer={footer}
    >
      {history.length > 0 && (
        <FilterBar
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          availability={availability}
          onAvailability={setAvailability}
        />
      )}

      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">No generated names yet.</p>
        ) : visible.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">No names match your filters.</p>
        ) : (
          visible.map((item) => (
            <HistoryRow
              key={`${item.key}-${item.generatedAt}`}
              item={item}
              saved={isSaved(item.name)}
              onSave={onSave}
            />
          ))
        )}
      </div>
    </Modal>
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
          ? "border-white/25 bg-white/[0.06]"
          : "hover:border-white/20 hover:bg-white/[0.04]",
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
        <p className="pointer-events-none relative mt-3 text-xs text-white/30">Not checked yet</p>
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
