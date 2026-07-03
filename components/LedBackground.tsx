/** Ambient backdrop — charcoal wash + a fine film grain, monochrome. */
export default function LedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(125% 85% at 50% -10%, var(--bg-2), var(--bg) 55%)",
        }}
      />

      {/* faint neutral light source, top-center */}
      <div
        className="absolute left-1/2 top-[-16rem] h-[34rem] w-[60rem] -translate-x-1/2 rounded-full blur-[150px]"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.05), transparent)" }}
      />

      {/* fine grain */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-64"
        style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }}
      />
    </div>
  );
}
