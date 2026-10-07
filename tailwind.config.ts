import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./remotion/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-noto-thai)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        shopee: {
          primary: "#EE4D2D",
          dark: "#D03E1F",
          light: "#FFF5F1",
          accent: "#FF6533",
          yellow: "#FFBA00",
        },
      },
      animation: {
        "pulse-subtle": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slight": "bounceSlight 1s infinite",
      },
      keyframes: {
        bounceSlight: {
          "0%, 100%": { transform: "translateY(-4%)" },
          "50%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#ea580c",
          "primary-content": "#ffffff",
          "secondary": "#38bdf8",
          "secondary-content": "#0f172a",
          "accent": "#f97316",
          "accent-content": "#ffffff",
          "neutral": "#1e293b",
          "neutral-content": "#e2e8f0",
          "base-100": "#0b0f17",
          "base-200": "#111827",
          "base-300": "#1f2937",
          "base-content": "#f3f4f6",
          "info": "#38bdf8",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "0.5rem",
        },
      },
      "light",
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  },
};
export default config;
