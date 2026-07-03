import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PricingCards from "@/components/PricingCards";

export const metadata: Metadata = {
  title: "Pricing · Namblo",
  description: "Namblo pricing — free tiers plus bring-your-own-key for unlimited naming.",
};

export default function PricingPage() {
  return (
    <PageShell>
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow justify-center">Pricing</p>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
          Simple, <span className="neon-text">honest</span> pricing
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
          Start free. Bring your own AI key and Namblo never caps how many names you
          generate — you only pay your provider for what you use.
        </p>
      </header>

      <PricingCards />
    </PageShell>
  );
}
