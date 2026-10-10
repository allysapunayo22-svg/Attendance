import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./apps/admin-web/app/**/*.{ts,tsx}",
    "./apps/admin-web/components/**/*.{ts,tsx}",
    "./apps/admin-web/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      spacing: {
        13: "3.25rem"
      },
      colors: {
        student: {
          50: "#f2f7fc",
          100: "#e5eff9",
          200: "#ccdeef",
          300: "#a9c6e1",
          400: "#82aacd",
          500: "#608fb7",
          600: "#47779f",
          700: "#365f83",
          800: "#2e506e",
          900: "#263f56",
          950: "#1c2e40"
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#0f172a",
          navy: "#0c1527",
          dark: "#070e1e"
        },
        ink: {
          DEFAULT: "#0f172a",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        }
      }
    }
  },
  plugins: []
};

export default config;
