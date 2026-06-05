/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          600: '#475569',
          700: '#334155',
        },
      },
      animation: {
        'underline': 'underline 0.3s ease-in-out forwards',
      },
      keyframes: {
        underline: {
          'from': {
            'width': '0',
            'left': '0',
          },
          'to': {
            'width': '100%',
            'left': '0',
          },
        },
      },
    },
  },
  plugins: [],
}
