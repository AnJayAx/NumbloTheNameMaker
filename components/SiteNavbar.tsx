"use client";

import { useRouter } from "next/navigation";
import NavRail from "@/components/NavRail";
import TopMeta from "@/components/TopMeta";
import { useServerQuota } from "@/lib/useServerQuota";
import { useAuth } from "@/lib/useAuth";
import { useGeneratedHistory } from "@/lib/useGeneratedHistory";
import { useSavedNames } from "@/lib/useSavedNames";

/**
 * Chrome for routes other than the home page. The drawers live on the home
 * page, so the rail buttons deep-link back to `/` with a `panel` query the home
 * page reads on mount.
 */
export default function SiteNavbar() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { history } = useGeneratedHistory();
  const { saved } = useSavedNames();

  const quota = useServerQuota(session?.access_token ?? null, user ? "friend" : "guest");

  return (
    <>
      <NavRail
        user={user}
        favouritesCount={saved.length}
        historyCount={history.length}
        onOpenFavourites={() => router.push("/?panel=saved")}
        onOpenHistory={() => router.push("/?panel=history")}
        onAccount={() => router.push("/?panel=account")}
      />
      <TopMeta namesLeft={quota.remaining} />
    </>
  );
}
