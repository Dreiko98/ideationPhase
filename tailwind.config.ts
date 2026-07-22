import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        water: {
          50: "#eaf8ff",
          100: "#d3f0ff",
          500: "#1e88d8",
          600: "#0f6fb6",
          700: "#0b588f"
        },
        teal: {
          500: "#18b5b3"
        }
      },
      boxShadow: {
        card: "0 4px 20px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
