/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        surface: "var(--surface)",
        card: "var(--card)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        success: "var(--success)",
        danger: "var(--danger)",
        text: "var(--text)",
        subtle: "var(--subtle)"
      },
      boxShadow: {
        card: "0 8px 26px rgba(0,0,0,0.26)"
      }
    }
  },
  plugins: []
};
