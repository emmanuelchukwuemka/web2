import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          void:    "#030508",
          base:    "#06080F",
          surface: "#090C18",
          card:    "#0C1020",
          elevated:"#101528",
          overlay: "#141A30",
        },
        border: {
          DEFAULT: "#1C2340",
          hover:   "#2A3460",
          subtle:  "#111830",
          glow:    "#F59E0B40",
        },
        gold: {
          DEFAULT: "#F59E0B",
          light:   "#FCD34D",
          dark:    "#D97706",
          glow:    "#F59E0B33",
        },
        accent: {
          purple:        "#7C3AED",
          "purple-light":"#A78BFA",
          cyan:          "#06B6D4",
          green:         "#10B981",
          "green-light": "#34D399",
          red:           "#EF4444",
          amber:         "#F59E0B",
        },
        text: {
          primary:   "#FFFFFF",
          secondary: "#8892B0",
          muted:     "#4A5280",
          disabled:  "#262D4A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'Fira Code'", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.02em",
        tight:    "-0.01em",
      },
      backgroundImage: {
        "gradient-gold":    "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #D97706 100%)",
        "gradient-hero":    "radial-gradient(ellipse 100% 80% at 50% -10%, rgba(245,158,11,0.12) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)",
        "gradient-card":    "linear-gradient(135deg, rgba(245,158,11,0.04) 0%, transparent 60%)",
        "gradient-surface": "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
        "grid-pattern":     "linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)",
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.5s ease-out",
        "slide-down":   "slideDown 0.3s ease-out",
        "glow-pulse":   "glowPulse 3s ease-in-out infinite",
        "float":        "float 6s ease-in-out infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "spin-slow":    "spin 8s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                                          to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(16px)" },           to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" },           to: { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%,100%": { opacity: "0.4" },                                   "50%": { opacity: "1" } },
        float:     { "0%,100%": { transform: "translateY(0px)" },                     "50%": { transform: "translateY(-12px)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" },                         to: { backgroundPosition: "200% 0" } },
      },
      boxShadow: {
        card:       "0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.6)",
        "card-hover":"0 0 0 1px rgba(245,158,11,0.2), 0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(245,158,11,0.06)",
        gold:       "0 0 24px rgba(245,158,11,0.35), 0 0 48px rgba(245,158,11,0.15)",
        "gold-sm":  "0 0 12px rgba(245,158,11,0.25)",
        purple:     "0 0 24px rgba(124,58,237,0.35)",
        "purple-sm":"0 0 12px rgba(124,58,237,0.2)",
        inner:      "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;