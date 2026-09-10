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
        primary: {
          50: '#f4f0ff',
          100: '#eae4ff',
          200: '#d6c8ff',
          300: '#bda2ff',
          400: '#a277ff',
          500: '#8c57ff', // Materio Violet Primary
          600: '#7e4ee6',
          700: '#6a3ec4',
          800: '#5530a1',
          900: '#422380',
        },
        materio: {
          bg: '#F4F5FA',
          'dark-bg': '#201D34',
          card: '#FFFFFF',
          'dark-card': '#28243D',
          'dark-surface': '#312D4B',
          success: '#56CA00',
          warning: '#FFB400',
          info: '#16B1FF',
          error: '#FF4C51',
        },
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
