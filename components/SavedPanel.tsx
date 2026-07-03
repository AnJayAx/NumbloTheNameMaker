"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import type { SavedName } from "@/lib/useSavedNames";

interface Props {
  open: boolean;
  saved: SavedName[];
  onOpenChange: (open: boolean) => void;
  onRemove: (name: string) => void;
  onClear: () => void;
}

type SortKey = "newest" | "oldest" | "az";
type Availability = "all" | "available" | "taken";

const hasAvailable = (item: SavedName) => item.domains.some((d) => d.available);
const isChecked = (item: SavedName) => item.domains.length > 0;

export default function SavedPanel({ open, saved, onOpenChange, onRemove, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [availability, setAvailability] = useState<Availability>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = saved.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (availability === "available") return hasAvailable(item);
      if (availability === "taken") return isChecked(item) && !hasAvailable(item);
      return true;
    });

    const sorted = [...filtered];
    if (sort === "newest") sorted.sort((a, b) => b.savedAt - a.savedAt);
    else if (sort === "oldest") sorted.sort((a, b) => a.savedAt - b.savedAt);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [saved, query, sort, availability]);

  const footer =
    saved.length > 0 ? (
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          {visible.length} of {saved.length} shown
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
          Favourites <span className="text-white/40">({saved.length})</span>
        </span>
      }
      ariaLabel="Saved names"
      footer={footer}
    >
      {saved.length > 0 && (
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
        {saved.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">
            No saved names yet.
            <br />
            Use the save button on any name to keep it here.
          </p>
        ) : visible.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">
            No favourites match your filters.
          </p>
        ) : (
          visible.map((item) => <SavedRow key={item.name} item={item} onRemove={onRemove} />)
        )}
      </div>
    </Modal>
  );
}

export function FilterBar({
  query,
  onQuery,
  sort,
  onSort,
  availability,
  onAvailability,
}: {
  query: string;
  onQuery: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  availability: Availability;
  onAvailability: (value: Availability) => void;
}) {
  return (
    <div className="mb-4 space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search names…"
        className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select
          size="sm"
          value={sort}
          ariaLabel="Sort"
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "az", label: "Name A–Z" },
          ]}
          onChange={(next) => onSort(next as SortKey)}
        />
        <Select
          size="sm"
          value={availability}
          ariaLabel="Filter by availability"
          options={[
            { value: "all", label: "All" },
            { value: "available", label: "Has open domain" },
            { value: "taken", label: "All taken" },
          ]}
          onChange={(next) => onAvailability(next as Availability)}
        />
      </div>
    </div>
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
