/** Top-of-page intro for Mark. */
export default function Hero() {
  return (
    <header className="mx-auto max-w-3xl text-center">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/60 shadow-led-soft">
        <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-neon-cyan" />
        AI naming agent · live domain checks
      </div>
      <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
        Meet <span className="neon-text">Mark</span>,
        <br className="hidden sm:block" /> the name maker.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
        Describe your idea and pick a naming style. Mark invents a batch of brandable
        names, then checks each one against your preferred domains in real time.
      </p>
    </header>
  );
}
