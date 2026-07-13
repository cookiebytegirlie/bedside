// ─────────────────────────────────────────────────────────────────────────
// Bedside design tokens — SINGLE SOURCE OF TRUTH.
//
// Every color, radius, letter-spacing, and font decision lives here and is
// consumed by tailwind.config.js. Components reference these ONLY through the
// semantic Tailwind classes they produce (e.g. `text-ink`, `bg-track`,
// `border-line`, `rounded-card`). Never hardcode a hex value or a pixel
// radius in a component — add or adjust it here instead.
//
// The system is strictly monochrome: pure-white surfaces, neutral-gray fills
// and hairlines, near-black ink as the single accent for primary actions and
// selected states. Color is spent in exactly one place — the vivid red /
// amber / green of a care status or safety flag — so what needs attention is
// the first thing the eye finds. Status color is never the only signal; it is
// always paired with a written label and a dot.
// ─────────────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces & separators — everything sits on pure white; grouped content is
  // separated with the hairline / soft fill below, never a colored background.
  surface: '#FFFFFF',
  track: '#F4F4F5', // subtle fills, segmented-control tracks, selected rows
  line: '#E5E5E6', // 1px hairline borders + inset separators

  // Text & the single dark accent (used for CTAs, active nav, selected pills).
  ink: '#18181B', // primary labels + solid dark fills
  muted: '#71717A', // secondary text
  faint: '#A1A1AA', // tertiary / captions / disabled
  icon: '#3F3F46', // neutral icon on a gray fill

  // Urgency — the only color. Soft `tint` + high-contrast `fg` for chips;
  // `dot` for the always-present redundant marker; `solid` for the saturated
  // fill behind white text on the segmented control's active state.
  // (`bg` is a legacy alias of `tint`, kept so not-yet-restyled screens that
  //  use `bg-routine-bg` etc. keep working.)
  routine: { tint: '#DCFCE7', bg: '#DCFCE7', fg: '#15803D', dot: '#22C55E', solid: '#16A34A' },
  watch: { tint: '#FEF1CC', bg: '#FEF1CC', fg: '#B45309', dot: '#F59E0B', solid: '#E08600' },
  attention: { tint: '#FEE2E2', bg: '#FEE2E2', fg: '#DC2626', dot: '#EF4444', solid: '#EF4444' },

  // ── Legacy aliases (retained until the remaining screens are restyled) ──
  // These keep not-yet-touched screens (Settings, ShiftEnd, MeetEllie, etc.)
  // compiling. As each screen moves to the monochrome system, its references
  // to these should be replaced with the semantic tokens above.
  cream: '#f6f1e9',
  mist: '#71717A', // was sage-gray; repointed to neutral so legacy accents read monochrome
  sage: {
    50: '#f4f4f5', 100: '#e5e5e6', 200: '#d4d4d8', 300: '#a1a1aa',
    400: '#71717a', 500: '#52525b', 600: '#3f3f46', 700: '#27272a',
    800: '#1f1f22', 900: '#18181b',
  },
  clay: {
    50: '#f4f4f5', 100: '#e5e5e6', 200: '#d4d4d8', 300: '#a1a1aa',
    400: '#71717a', 500: '#3f3f46', 600: '#27272a', 700: '#1f1f22',
  },
  brand: { green: '#8dbd8b', mist: '#aec6bb', peach: '#ffc4a1' },
}

export const borderRadius = {
  card: '14px', // cards & grouped lists
  btn: '14px', // buttons
  // legacy widget radius — remaining screens still lean on rounded-2xl/3xl
  xl: '10px',
  '2xl': '12px',
  '3xl': '14px',
  '4xl': '16px',
  '5xl': '18px',
}

export const letterSpacing = {
  tighter: '-0.03em', // large titles
  tight: '-0.02em', // headings / prominent labels
  normal: '0em',
}

export const fontFamily = {
  // SF Pro on Apple devices (iOS-native), Inter everywhere else — both are
  // tuned by the same tight tracking above.
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"SF Pro Text"',
    'Inter',
    'system-ui',
    'sans-serif',
  ],
}

// Flat by default. Retained only for the not-yet-restyled screens that still
// separate cards on the gradient wash; restyled screens use hairlines.
export const boxShadow = {
  soft: '0 6px 20px -10px rgba(20, 20, 22, 0.18)',
  card: '0 2px 10px rgba(20, 20, 22, 0.06)',
}
