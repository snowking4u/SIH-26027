/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy control-room chrome
        navy: {
          950: "#070d1b",
          900: "#0b1424",
          850: "#0e1830",
          800: "#111d36",
          700: "#18294a",
          600: "#223659",
          500: "#30507f",
          400: "#5f7aa8",
          300: "#8ba3c9",
        },
        // Brand / operational blue
        brand: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // Status colours
        success: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
          light: "#ecfdf5",
        },
        warning: {
          DEFAULT: "#d97706",
          dark: "#b45309",
          light: "#fffbeb",
        },
        danger: {
          DEFAULT: "#dc2626",
          dark: "#b91c1c",
          light: "#fef2f2",
        },
        info: {
          DEFAULT: "#0284c7",
          light: "#f0f9ff",
        },
        ai: {
          DEFAULT: "#7c3aed",
          light: "#f5f3ff",
        },
        // Light content area
        surface: {
          DEFAULT: "#f4f6fb",
          muted: "#eef1f7",
          white: "#ffffff",
        },
        ink: {
          DEFAULT: "#1a2536",
          muted: "#5b6b83",
          faint: "#8a97ac",
        },
        line: {
          DEFAULT: "#e3e8f0",
          dark: "#d3dae6",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 29, 54, 0.06), 0 1px 3px rgba(16, 29, 54, 0.08)",
        panel: "0 2px 6px rgba(16, 29, 54, 0.08)",
        "glow-green": "0 0 0 1px rgba(34, 197, 94, 0.2)",
      },
    },
  },
  plugins: [],
};