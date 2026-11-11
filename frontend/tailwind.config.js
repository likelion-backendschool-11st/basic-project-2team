import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';
/** @type {import('tailwindcss').Config} */
// Tokens extracted from Stitch project 13412042059489833434 (OurParty / Nocturnal FinTech)
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          base: '#171721',
          surface: '#1e1e2a',
          card: '#252538',
          hover: '#2d2d44',
          deep: '#14141d',
          border: 'rgba(255, 255, 255, 0.08)',
          borderLight: 'rgba(255, 255, 255, 0.14)',
        },
        mercury: {
          DEFAULT: '#5266eb',
          light: '#6d7ff5',
          dark: '#3e4fc2',
          glow: 'rgba(82, 102, 235, 0.35)',
        },
        fog: {
          headline: '#ededf3',
          sub: '#c3c3cc',
          muted: '#7a7a8c',
        },
        lavender: '#edecfb',
        periwinkle: '#9cb4e8',
        emeraldAccent: '#10b981',
        amberAccent: '#f59e0b',
        roseAccent: '#f43f5e',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-mercury': '0 0 25px -5px rgba(82, 102, 235, 0.4)',
        'card-subtle': '0 4px 20px 0 rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [forms, containerQueries],
};
