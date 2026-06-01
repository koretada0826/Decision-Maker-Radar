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
      },
    },
  },
  plugins: [],
};
export default config;
