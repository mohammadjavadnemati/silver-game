import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0E14",
        panel: "#161B26",
        "panel-light": "#1F2635",
        silver: "#C9D3DE",
        ember: "#E8935A",
        "blood-moon": "#8B2E3A",
        parchment: "#EDE3D0",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;