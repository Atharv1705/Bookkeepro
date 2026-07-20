/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0077C8',
          'blue-dark': '#005fa3',
          'blue-light': '#e9f5ff',
          orange: '#FF7F11',
          'orange-dark': '#e56e0d',
          'orange-light': '#fff3e0',
          navy: '#0B2540',
          accent: '#3AB4F2',
          bg: '#f1f7fb',
          card: '#ffffff',
          muted: '#6b7a86',
          border: '#e2eaf2',
        },
        status: {
          success: '#2e7d32',
          'success-bg': '#e6f9ec',
          error: '#c62828',
          'error-bg': '#fdecea',
          warn: '#f57f17',
          'warn-bg': '#fff8e1',
        },
        header: {
          bg: '#BEE2FA',
        },
        footer: {
          bot: '#A9D9F8',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xs': '6px',
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'pill': '999px',
      },
      boxShadow: {
        'xs': '0 1px 4px rgba(0,0,0,0.06)',
        'sm': '0 2px 10px rgba(0,0,0,0.07)',
        'md': '0 6px 24px rgba(0,0,0,0.09)',
        'lg': '0 16px 48px rgba(0,0,0,0.12)',
      }
    },
  },
  plugins: [],
}
