/** Animated neon glow backdrop — pure CSS, sits behind all content. */
export default function LedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,130,160,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,130,160,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      {/* neon orbs */}
      <div className="absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-neon-cyan/20 blur-[120px] animate-drift" />
      <div className="absolute top-10 right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-neon-magenta/20 blur-[120px] animate-drift [animation-delay:-6s]" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-neon-purple/20 blur-[130px] animate-drift [animation-delay:-12s]" />
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-900" />
    </div>
  );
}
