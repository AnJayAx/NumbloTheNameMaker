import type { ReactNode } from "react";
import LedBackground from "@/components/LedBackground";
import SiteNavbar from "@/components/SiteNavbar";

/** Background + navbar chrome shared by the non-home routes. */
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <LedBackground />
      <SiteNavbar />
      <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-24">{children}</main>
    </>
  );
}
