"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  favouritesCount?: number;
  historyCount?: number;
  onOpenFavourites: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onAccount: () => void;
}

function avatarUrl(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const url = meta.avatar_url || meta.picture;
  return typeof url === "string" && url ? url : null;
}

/**
 * Vertically-centred left icon rail on md+ / bottom icon bar on mobile, with a
 * smooth tooltip that slides out beside each icon (desktop only).
 */
export default function NavRail({
  user,
  favouritesCount = 0,
  historyCount = 0,
  onOpenFavourites,
  onOpenHistory,
  onOpenSettings,
  onAccount,
}: Props) {
  const avatar = user ? avatarUrl(user) : null;

  const items = (
    <>
      <RailItem label="Home" href="/">
        <HomeIcon />
      </RailItem>
      <RailItem label="About Us" href="/about">
        <InfoIcon />
      </RailItem>
      <RailItem label="Pricing" href="/pricing">
        <TagIcon />
      </RailItem>
      <RailItem label="Favourites" onClick={onOpenFavourites} count={favouritesCount}>
        <StarIcon />
      </RailItem>
      <RailItem label="History" onClick={onOpenHistory} count={historyCount}>
        <HistoryIcon />
      </RailItem>
      <RailItem label="Settings" onClick={onOpenSettings}>
        <GearIcon />
      </RailItem>
      <RailItem label={user ? "Account" : "Sign in"} onClick={onAccount} active={Boolean(user)}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <UserIcon />
        )}
      </RailItem>
    </>
  );

  return (
    <>
      {/* Desktop rail — icons centred vertically */}
      <nav className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col items-center justify-center gap-2 md:flex">
        {items}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.07] bg-ink-900/90 px-1 py-2 backdrop-blur-xl md:hidden">
        {items}
      </nav>
    </>
  );
}

function RailItem({
  label,
  href,
  onClick,
  children,
  count = 0,
  active = false,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
  active?: boolean;
}) {
  const inner = (
    <>
      {children}
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/80" />
      )}
      <span className="rail-tip">{label}</span>
    </>
  );

  const className = ["rail-btn", active ? "text-white" : ""].join(" ");

  return href ? (
    <Link href={href} aria-label={label} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {inner}
    </button>
  );
}

/* — icons (stroke, monochrome) — */

function iconProps() {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "h-[22px] w-[22px]",
  };
}

function HomeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.5v5" />
      <path d="M12 7.75h.01" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M5.5 3.5v3h3" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[22px] w-[22px]">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.484.484 0 0 0 13.4 2h-2.8c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.489.489 0 0 0-.59.22L2.85 8.47a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94 0 .32.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.03.24.23.41.47.41h2.8c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
