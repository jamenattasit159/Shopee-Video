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
        paper: {
          bg: "#FAF8F5",
          canvas: "#F5F2EB",
          card: "#FFFFFF",
          subtle: "#F0ECE1",
          border: "#E2DDD2",
          ink: "#1C1917",
          muted: "#78716C",
          kraft: "#D9B382",
          tape: "#FDE68A",
        },
      },
      boxShadow: {
        "paper-sm": "1px 1px 0px 0px rgba(28, 25, 23, 0.08)",
        "paper": "2px 2px 0px 0px rgba(28, 25, 23, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        "paper-md": "3px 3px 0px 0px rgba(28, 25, 23, 0.14), 0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        "paper-lg": "4px 4px 0px 0px rgba(28, 25, 23, 0.16), 0 10px 15px -3px rgba(0, 0, 0, 0.05)",
        "sticker": "2px 2px 0px 0px #1C1917",
        "sticker-lg": "3px 3px 0px 0px #1C1917",
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
        paper: {
          "primary": "#EE4D2D",
          "primary-content": "#ffffff",
          "secondary": "#0284C7",
          "secondary-content": "#ffffff",
          "accent": "#F59E0B",
          "accent-content": "#1C1917",
          "neutral": "#292524",
          "neutral-content": "#FAFAF9",
          "base-100": "#FFFFFF",
          "base-200": "#F9F7F2",
          "base-300": "#EBE5D8",
          "base-content": "#1C1917",
          "info": "#0284C7",
          "success": "#16A34A",
          "warning": "#D97706",
          "error": "#DC2626",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "0.5rem",
        },
      },
      "light",
    ],
    defaultTheme: "paper",
    darkTheme: "paper",
    base: true,
    styled: true,
    utils: true,
  },
};
export default config;
