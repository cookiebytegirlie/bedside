/** @type {import('tailwindcss').Config} */
import { colors, borderRadius, letterSpacing, fontFamily, boxShadow } from './src/theme/tokens.js'

// All design tokens live in src/theme/tokens.js — this file only wires them
// into Tailwind. Add or change tokens there, not here or in components.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors,
      fontFamily,
      boxShadow,
      borderRadius,
      letterSpacing,
    },
  },
  plugins: [],
}
