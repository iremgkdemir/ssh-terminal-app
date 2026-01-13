/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#2a2a3a',
        },
        accent: {
          cyan: '#00d4ff',
          green: '#00ff88',
          purple: '#a855f7',
          orange: '#ff6b35',
          pink: '#ff0080',
        },
      },
    },
  },
  plugins: [],
}