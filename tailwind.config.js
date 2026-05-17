/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5c59f2",
        dark: "#f8fafc",
        darker: "#f1f5f9",
        surface: "#ffffff",
        surfaceElevated: "#ffffff",
      }
    },
  },
  plugins: [],
}
