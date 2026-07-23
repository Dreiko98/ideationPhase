import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#edf3ff",
          200: "#d8e5fb",
          300: "#a9c6f7",
          400: "#789fe2",
          500: "#5279c8",
          600: "#4268ba",
          700: "#345cae",
          800: "#294a8e",
          900: "#233f75"
        },
        water: {
          50: "#f5f8ff",
          100: "#edf3ff",
          200: "#d8e5fb",
          500: "#5279c8",
          600: "#4268ba",
          700: "#345cae"
        },
        teal: {
          500: "#789fe2"
        }
      },
      boxShadow: {
        card: "0 14px 40px rgba(52, 92, 174, 0.08)",
        "brand-sm": "0 8px 24px rgba(52, 92, 174, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
