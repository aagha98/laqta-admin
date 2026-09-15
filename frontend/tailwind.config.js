/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B1412',
        surface: {
          lowest: '#07100E',
          low: '#141D1B',
          DEFAULT: '#18211F',
          high: '#232C29',
          highest: '#2D3734',
        },
        ink: '#DBE5E1',
        muted: '#8FA19D',
        line: 'rgba(255,255,255,0.08)',
        primary: { DEFAULT: '#0EA5A0', bright: '#5ED9D3', dim: '#0A7975' },
        accent: { DEFAULT: '#FFB020', bright: '#FFBD58' },
        success: '#22C55E',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        num: ['Inter', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem', '3xl': '1.5rem' },
      boxShadow: {
        glass: '0 8px 32px -4px rgba(0,0,0,0.5)',
        glow: '0 0 16px rgba(14,165,160,0.35)',
        'glow-amber': '0 0 16px rgba(255,176,32,0.35)',
      },
    },
  },
  plugins: [],
};
