import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette
        bg: {
          primary:  "#080B14",
          card:     "#0D1220",
          elevated: "#111827",
        },
        border: {
          DEFAULT: "#1E2D4D",
          hover:   "#2A3F6F",
          subtle:  "#111827",
        },
        accent: {
          purple: "#7C3AED",
          "purple-light": "#A78BFA",
          cyan:   "#06B6D4",
          green:  "#10B981",
          red:    "#EF4444",
          amber:  "#F59E0B",
        },
        text: {
          primary:   "#F1F5F9",
          secondary: "#94A3B8",
          muted:     "#475569",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.25) 0%, transparent 60%)",
        "card-glow": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.3s ease-in-out",
        "slide-up":   "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      boxShadow: {
        card:  "0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)",
        glow:  "0 0 24px rgba(124,58,237,0.35)",
        "glow-sm": "0 0 12px rgba(124,58,237,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;