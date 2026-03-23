/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#080C14',   // deep navy-black
        surface: '#111827',   // dark blue-grey (was pure #1A1A1A)
        card:    '#1A2235',   // slightly lighter blue-grey for cards
        border:  '#1E2D45',   // subtle blue border
        accent:  '#3B82F6',   // primary blue
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
