/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#22C55E",
          primaryHover: "#16A34A",
          accent: "#3B82F6",
          accentHover: "#2563EB",
          neon: "#A3E635",
          warn: "#F97316",
          danger: "#EF4444",
          surface: "#0B1020",
          card: "#0F172A",
          text: "#E5E7EB",
          muted: "#94A3B8"
        }
      },
      boxShadow: {
        glow: "0 0 0.5rem rgba(34,197,94,0.35), 0 0 2rem rgba(59,130,246,0.25)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem"
      }
    }
  },
  plugins: []
};
