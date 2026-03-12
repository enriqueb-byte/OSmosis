/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          500: '#003063',
          600: '#002550',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 48, 99, 0.5)' },
          '50%': { opacity: '0.9', boxShadow: '0 0 28px rgba(0, 48, 99, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
