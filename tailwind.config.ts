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
        // UAT institutional palette
        uat: {
          50:  "#f0f4ff",
          100: "#e0eaff",
          200: "#c0d0fe",
          300: "#93adfd",
          400: "#6080fa",
          500: "#3a56f5",
          600: "#2438e9",
          700: "#1d2dd4",
          800: "#1d29ac",
          900: "#1e2888",
          950: "#141852",
        },
        accent: {
          50:  "#fff8ed",
          100: "#ffefd3",
          200: "#ffdaa6",
          300: "#ffbe6d",
          400: "#ff9832",
          500: "#ff7a0a",
          600: "#f05f00",
          700: "#c74602",
          800: "#9e380b",
          900: "#7f300c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
