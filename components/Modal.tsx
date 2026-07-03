"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  ariaLabel?: string;
}

const SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/** Centered, theme-aware dialog. Closes on backdrop click or Escape. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  ariaLabel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={[
          "glass relative flex max-h-[85vh] w-full flex-col overflow-hidden transition-all duration-300",
          SIZES[size],
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0 text-lg font-bold tracking-tight">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-white/25 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && <div className="border-t border-white/10 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
