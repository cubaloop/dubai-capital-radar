/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fbf8ed',
          100: '#f5efcf',
          200: '#ebde9e',
          300: '#dfca67',
          400: '#d5b63c',
          500: '#c59f27',
          600: '#aa7e1e',
          700: '#875d1b',
          800: '#714c1c',
          900: '#60401c',
          950: '#38220c',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#070d17',
        }
      }
    },
  },
  plugins: [],
}
