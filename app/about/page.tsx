import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About Us · Namblo",
  description:
    "Namblo is an AI naming agent that invents brandable names and checks domain availability in real time.",
};

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Describe it",
    body: "Tell Namblo about your business or project and pick a naming style — playful, affix, real words, portmanteau, or classical roots.",
  },
  {
    title: "Generate",
    body: "Namblo invents a batch of brandable candidates with your chosen AI provider and model, avoiding names you've already seen.",
  },
  {
    title: "Check live",
    body: "Every candidate is checked against your preferred TLDs in real time, so you only keep names whose domains are actually open.",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow justify-center">About us</p>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
          About <span className="neon-text">Namblo</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
          Namblo is an AI naming agent built for founders, makers, and side-project
          hoarders. It turns a short brief into a shortlist of brandable names whose
          domains are still available — no more falling in love with a name that's taken.
        </p>
      </header>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <section key={step.title} className="glass card-hover p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 font-mono text-sm font-bold text-neon-cyan ring-1 ring-white/10">
              0{index + 1}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-snug text-white/55">{step.body}</p>
          </section>
        ))}
      </div>

      <section className="glass mt-8 overflow-hidden p-8">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Provider-agnostic by design
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
          Namblo swaps AI providers (Claude · GPT · Gemini) and domain checkers (RDAP ·
          Porkbun · Namecheap) via configuration. Bring your own API key to generate
          without limits, or use the free platform tier to get started.
        </p>
      </section>
    </PageShell>
  );
}
