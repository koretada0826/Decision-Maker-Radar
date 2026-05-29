import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F2A5C",
          50: "#EEF2FA",
          100: "#D6DEEF",
          500: "#1E4FAE",
          600: "#163E8C",
          700: "#0F2A5C",
        },
        rank: {
          s: "#DC2626",
          a: "#EA580C",
          b: "#CA8A04",
          c: "#0EA5E9",
          d: "#64748B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
