"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional muted secondary text shown on the right (e.g. a cost/tier). */
  hint?: string;
  /** Non-selectable (shown dimmed) - e.g. a model the tier can't use. */
  disabled?: boolean;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  /** Trigger sizing to match nearby inputs. */
  size?: "sm" | "md";
  className?: string;
}

interface Position {
  left: number;
  top: number;
  width: number;
  openUp: boolean;
}

/**
 * Fully themed dropdown that replaces the native <select>, whose open list can't
 * be styled and renders in the OS palette. The popover is rendered in a portal
 * so it's never clipped by an `overflow-hidden` ancestor (e.g. the slide deck).
 * Keyboard + outside-click aware.
 */
export default function Select({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  id,
  size = "md",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // Flip upward only when there's clearly not enough room below.
    const openUp = spaceBelow < 280 && rect.top > spaceBelow;
    setPos({
      left: rect.left,
      top: openUp ? rect.top : rect.bottom,
      width: rect.width,
      openUp,
    });
  }, []);

  // Position the popover and keep it anchored while scrolling/resizing.
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition]);

  // Close when clicking outside both the trigger and the portaled list.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Highlight the current selection when the menu opens.
  useEffect(() => {
    if (open) setActive(selectedIndex);
  }, [open, selectedIndex]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const triggerSize =
    size === "sm" ? "rounded-lg px-2.5 py-2 text-xs" : "rounded-xl px-3 py-2.5 text-sm";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={[
          "flex w-full items-center justify-between gap-2 border bg-transparent text-left text-white outline-none transition",
          triggerSize,
          disabled
            ? "cursor-not-allowed border-white/10 opacity-50"
            : open
              ? "border-white/40"
              : "border-white/10 hover:border-white/25 focus:border-white/40",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate">{selected?.label ?? ""}</span>
          {selected?.hint && <span className="shrink-0 text-white/40">· {selected.hint}</span>}
        </span>
        <Chevron open={open} />
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-activedescendant={`${listId}-${active}`}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              ...(pos.openUp
                ? { bottom: window.innerHeight - pos.top + 6 }
                : { top: pos.top + 6 }),
            }}
            className="z-[70] max-h-64 overflow-auto rounded-xl border border-white/10 bg-ink-800/95 p-1 shadow-pop backdrop-blur-xl animate-scale-in"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === active;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    // Select on press so the button doesn't blur-close first.
                    event.preventDefault();
                    choose(index);
                  }}
                  className={[
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition",
                    option.disabled
                      ? "cursor-not-allowed text-white/30"
                      : isActive
                        ? "cursor-pointer bg-white/[0.08] text-white"
                        : "cursor-pointer text-white/70",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Check show={isSelected} />
                    <span className="truncate">{option.label}</span>
                  </span>
                  {option.hint && (
                    <span
                      className={[
                        "shrink-0 text-xs",
                        isActive ? "text-white/70" : "text-white/35",
                      ].join(" ")}
                    >
                      {option.hint}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={[
        "h-4 w-4 shrink-0 text-white/45 transition-transform duration-200",
        open ? "rotate-180" : "",
      ].join(" ")}
      fill="none"
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check({ show }: { show: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={["h-3.5 w-3.5 shrink-0 text-white", show ? "opacity-100" : "opacity-0"].join(" ")}
      fill="none"
    >
      <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
