import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fff9f0',
          100: '#fff4e2',
        },
        rose: {
          400: '#d62b70',
          500: '#c0255f',
        },
        cocoa: {
          300: '#a27a63',
          500: '#4b2b1d',
        },
        mint: {
          50: '#f0fff4',
          600: '#2f855a',
        },
        blush: {
          200: '#fde7e9',
          300: '#f6c6cf',
        },
      },
      fontFamily: {
        display: ['"Nunito"', '"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 35px 45px -30px rgba(64, 30, 15, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
