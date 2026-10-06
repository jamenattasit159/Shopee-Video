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
  plugins: [],
};
export default config;
