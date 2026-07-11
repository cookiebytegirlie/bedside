/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f6f1e9',
        ink: '#000000',
        muted: '#818181',
        sage: {
          50: '#f2f5f0',
          100: '#e2e9dd',
          200: '#c6d4bd',
          300: '#a3b895',
          400: '#7f9c6d',
          500: '#62804f',
          600: '#4c653e',
          700: '#3d5133',
          800: '#33422b',
          900: '#2b3725',
        },
        clay: {
          50: '#fbf3ee',
          100: '#f5e1d3',
          200: '#e9bfa2',
          300: '#dc9a70',
          400: '#cf7847',
          500: '#b95f30',
          600: '#984a25',
          700: '#7a3b1f',
        },
        // Urgency system, matched to the Figma design system's badge colors.
        routine: { bg: '#e3ffe8', fg: '#36ae4c' },
        watch: { bg: '#ffefd5', fg: '#df920f' },
        attention: { bg: '#ffd5d5', fg: '#df0f0f' },
        // Muted sage-gray from the "Use Face ID" microcopy in the Figma
        // design system — distinct from the sage accent scale, which is
        // too saturated/dark for that use.
        mist: '#86a394',
        // The three stops of the "BedSide" wordmark gradient in the Figma
        // design system frame (green → sage mist → peach).
        brand: { green: '#8dbd8b', mist: '#aec6bb', peach: '#ffc4a1' },
      },
      fontFamily: {
        sans: ['"Darker Grotesque"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(43, 37, 32, 0.08)',
        card: '0px 20px 44px -10px rgba(40, 37, 34, 0.10)',
      },
      borderRadius: {
        // Near-square widgets — just enough softening to not look
        // sharp-cut. rounded-full (avatars, chips, pill buttons) is
        // untouched since those are meant to be fully circular/pill-shaped,
        // not "widget corners".
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
        '4xl': '2px',
        '5xl': '2px',
      },
    },
  },
  plugins: [],
}
