/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#076324',
          dark: '#054d1b',
          light: '#0a8a30',
        },
        card: {
          face: '#fafafa',
          border: '#d4d4d4',
          red: '#dc2626',
          black: '#1a1a1a',
        },
        tg: {
          bg: 'var(--tg-theme-bg-color, #1c1c1e)',
          secondary: 'var(--tg-theme-secondary-bg-color, #2c2c2e)',
          text: 'var(--tg-theme-text-color, #ffffff)',
          hint: 'var(--tg-theme-hint-color, #98989e)',
          link: 'var(--tg-theme-link-color, #2ead4b)',
          button: 'var(--tg-theme-button-color, #2ead4b)',
          'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'felt-texture': 'radial-gradient(circle at 50% 50%, #0a8a30 0%, #076324 40%, #054d1b 100%)',
        'felt-subtle': 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px)',
      },
    },
  },
  plugins: [],
};
