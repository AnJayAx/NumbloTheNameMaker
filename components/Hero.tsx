interface Props {
  /** Which product the landing page is presenting. */
  product?: "namblo" | "nambly";
}

const COPY = {
  namblo: {
    name: "Namblo",
    tail: "the name maker.",
    blurb:
      "Describe your idea, pick a naming style, and Namblo invents a batch of brandable names - then checks every one against your favourite domains in real time.",
  },
  nambly: {
    name: "Nambly",
    tail: "the name checker.",
    blurb:
      "Already have names in mind? Paste them in and Nambly checks each one against your preferred domains in real time, so you know exactly what's still open.",
  },
} as const;

/** Top-of-page intro that adapts to the selected product. */
export default function Hero({ product = "namblo" }: Props) {
  const copy = COPY[product];

  return (
    <header className="mx-auto max-w-md animate-fade-up text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="neon-text">{copy.name}</span>
      </h1>
      <p className="mt-2 text-sm font-medium text-white/45">{copy.tail}</p>
      <p className="mx-auto mt-4 max-w-sm text-pretty text-sm leading-relaxed text-white/55">
        {copy.blurb}
      </p>
    </header>
  );
}
