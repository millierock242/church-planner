/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Lime-green brand colour. Change these shades to re-colour the whole site.
        brand: {
          50: "#f4fbe8",
          100: "#e6f6c8",
          200: "#cdeb98",
          300: "#aedc5f",
          400: "#8fcb2e",
          500: "#72b317",
          600: "#3b7d0b",
          700: "#2f6a08",
          800: "#265506",
          900: "#1d4205",
        },
      },
    },
  },
  plugins: [],
};
