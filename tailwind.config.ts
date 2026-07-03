import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Near-black neutral ramp (deepest -> lightest surface).
        ink: {
          900: "#161616",
          800: "#1c1c1c",
          700: "#222222",
          600: "#2a2a2a",
          500: "#333333",
        },
        // Pure white/grey. The old colourful token names are kept and remapped to
        // neutrals so existing classes convert app-wide: `cyan` is white (primary),
        // the rest are greys. No hue.
        neon: {
          cyan: "#f5f5f6", // primary = white
          blue: "#d4d4d6",
          magenta: "#a1a1a6",
          purple: "#8a8a90",
          iris: "#6e6e74",
          lime: "#ededee", // available -> near white
          mint: "#f5f5f6",
        },
        // Override Tailwind's built-in amber (stars/low/selected states) -> greys.
        amber: {
          100: "#ededee",
          200: "#d4d4d6",
          300: "#b4b4b8",
          400: "#9a9a9f",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "led-cyan": "0 0 0 1px rgba(255,255,255,0.16)",
        "led-magenta": "0 0 0 1px rgba(255,255,255,0.1)",
        "led-purple": "0 0 0 1px rgba(255,255,255,0.12)",
        "led-soft": "0 0 0 1px rgba(255,255,255,0.08)",
        "led-card": "0 24px 60px -28px rgba(0,0,0,0.85)",
        pop: "0 30px 80px -30px rgba(0,0,0,0.7)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.08)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
        aurora: {
          "0%": { transform: "translate3d(-6%, -2%, 0) scale(1.05) rotate(0deg)" },
          "33%": { transform: "translate3d(4%, 3%, 0) scale(1.15) rotate(6deg)" },
          "66%": { transform: "translate3d(-3%, 5%, 0) scale(1.1) rotate(-4deg)" },
          "100%": { transform: "translate3d(-6%, -2%, 0) scale(1.05) rotate(0deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shine: {
          to: { backgroundPosition: "200% center" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        liquid: {
          "0%": { transform: "scale(1, 1)" },
          "35%": { transform: "scale(1.28, 0.84)" },
          "65%": { transform: "scale(0.93, 1.07)" },
          "100%": { transform: "scale(1, 1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        aurora: "aurora 26s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shine: "shine 6s linear infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        liquid: "liquid 0.52s cubic-bezier(0.22,1,0.36,1)",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
