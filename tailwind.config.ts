import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ADT brand palette
        adt: {
          navy: "#012169", // primary ADT blue/navy
          blue: "#0057B8",
          sky: "#1f7ae0",
          ink: "#0a142f",
          mist: "#eef3fb",
          line: "#d7e0f0",
        },
        risk: {
          high: "#c0392b",
          med: "#d98a00",
          low: "#2e7d4f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(1,33,105,0.06), 0 4px 16px rgba(1,33,105,0.08)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
