import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary institutional teal (replaces uat-*)
        sky: {
          50:  "#f0f9fa",
          100: "#d5edf1",
          200: "#a9dbe6",
          300: "#70c2d4",
          400: "#37a5bc",
          500: "#228ba0",
          600: "#1d6e7e",
          700: "#175b6a",
          800: "#124b58",
          900: "#0e3d49",
          950: "#092830",
        },
        // Public-portal accent (section kickers, CTAs on public pages)
        coral: {
          50:  "#fef4f2",
          100: "#fde5e0",
          200: "#fbc8c0",
          300: "#f8a092",
          400: "#f47d6d",
          500: "#f06b56",
          600: "#d9503c",
          700: "#b83c2a",
          800: "#963122",
          900: "#7a291d",
        },
        // Warning / pending status
        amber: {
          50:  "#fdf8ee",
          100: "#f9edcc",
          200: "#f2d78e",
          300: "#e8be50",
          400: "#d4a020",
          500: "#b58c0a",
          600: "#9a7508",
          700: "#7d5f07",
          800: "#664e08",
          900: "#53400a",
        },
        // Active / conform status greens
        forest: {
          1: "#d6ede0",
          2: "#8fd5ae",
          3: "#5fc9a3",
          4: "#2e9a6c",
          5: "#217a3a",
        },
        // Backward-compat alias — remove once all uat-* classes are migrated to sky-*
        uat: {
          50:  "#f0f9fa",
          100: "#d5edf1",
          200: "#a9dbe6",
          300: "#70c2d4",
          400: "#37a5bc",
          500: "#228ba0",
          600: "#1d6e7e",
          700: "#175b6a",
          800: "#124b58",
          900: "#0e3d49",
          950: "#092830",
        },
        // Text scale
        ink: {
          1: "#0f172a",
          2: "#1e293b",
          3: "#475569",
          4: "#94a3b8",
        },
        // Background scale
        paper: {
          1: "#ffffff",
          2: "#f8fafc",
          3: "#f1f5f9",
          4: "#e2e8f0",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia",   "serif"],
        mono:    ["var(--font-mono)",    "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
