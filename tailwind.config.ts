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
        ink: {
          900: "#06060b",
          800: "#0a0a0f",
          700: "#0f0f17",
          600: "#15151f",
          500: "#1d1d2b",
        },
        neon: {
          cyan: "#22d3ee",
          blue: "#3b82f6",
          magenta: "#e0479e",
          purple: "#a855f7",
          lime: "#a3e635",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "led-cyan": "0 0 0 1px rgba(34,211,238,0.35), 0 0 18px -2px rgba(34,211,238,0.55)",
        "led-magenta": "0 0 0 1px rgba(224,71,158,0.35), 0 0 18px -2px rgba(224,71,158,0.55)",
        "led-soft": "0 0 24px -6px rgba(34,211,238,0.45)",
        "led-card": "0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px -12px rgba(0,0,0,0.8)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.08)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
