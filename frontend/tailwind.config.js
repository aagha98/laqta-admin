/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5A0',
        ink: '#12211E',
        accent: '#FFB020',
        background: '#F3F7F6',
        surface: '#FFFFFF',
        border: '#E1EBE8',
        muted: '#647672',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
};
