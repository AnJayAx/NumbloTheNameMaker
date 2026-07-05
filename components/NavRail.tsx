"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/useAuth";

interface Props {
  user: User | null;
  favouritesCount?: number;
  historyCount?: number;
  onOpenFavourites: () => void;
  onOpenHistory: () => void;
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
  onAccount,
}: Props) {
  const avatar = user ? avatarUrl(user) : null;

  const renderItems = (placement: "right" | "top") => (
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
      {user ? (
        <AccountItem
          user={user}
          avatar={avatar}
          placement={placement}
          onOpenApiKeys={onAccount}
        />
      ) : (
        <RailItem label="Sign in" onClick={onAccount}>
          <UserIcon />
        </RailItem>
      )}
    </>
  );

  return (
    <>
      {/* Desktop rail — logo pinned top, icons centred in the remaining space */}
      <nav className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col items-center md:flex">
        <Link href="/" aria-label="Namblo home" className="mt-4 shrink-0">
          <Image src="/logo.png" alt="Namblo" width={36} height={36} className="h-9 w-9 object-contain" priority />
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          {renderItems("right")}
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.07] bg-ink-900/90 px-1 py-2 backdrop-blur-xl md:hidden">
        {renderItems("top")}
      </nav>
    </>
  );
}

function AccountItem({
  user,
  avatar,
  placement,
  onOpenApiKeys,
}: {
  user: User;
  avatar: string | null;
  placement: "right" | "top";
  onOpenApiKeys: () => void;
}) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuPosition =
    placement === "right"
      ? "left-full top-1/2 ml-3 -translate-y-1/2 origin-left"
      : "bottom-full right-0 mb-3 origin-bottom-right";

  const displayName =
    (user.user_metadata?.username as string | undefined) || user.email || "Account";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rail-btn text-white"
      >
        {avatar && !avatarBroken ? (
          // Google's image CDN 403s requests that carry a Referer header, so the
          // avatar breaks without `no-referrer`. Fall back to the icon if it
          // still fails to load (deleted photo, offline, etc.).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setAvatarBroken(true)}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <UserIcon />
        )}
        {!open && <span className="rail-tip">Account</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1.5 shadow-2xl backdrop-blur-xl",
            menuPosition,
          ].join(" ")}
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
              Signed in
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white/85">{displayName}</p>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <MenuLink href="/profile" onNavigate={() => setOpen(false)}>
            <UserIcon />
            Profile
          </MenuLink>
          <MenuLink href="/subscription" onNavigate={() => setOpen(false)}>
            <CardIcon />
            Billing
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenApiKeys();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            <KeyIcon />
            API Keys
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-red-400/10 hover:text-red-200 [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white [&_svg]:h-[18px] [&_svg]:w-[18px]"
    >
      {children}
    </Link>
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

function UserIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M6.5 14.5h4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15 20 3" />
      <path d="M17 6l2.5 2.5" />
      <path d="M14 9l2.5 2.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M9.5 8.5 6 12l3.5 3.5" />
      <path d="M6 12h9" />
    </svg>
  );
}
