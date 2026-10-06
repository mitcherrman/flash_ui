// src/theme/tokens.js
//
// Flashcard Maker design tokens: the single source of truth for colour,
// type, spacing, radius, motion and layout values.
//
// This file is intentionally pure data (no React Native imports) so it can be
// checked by `node --test` (see tests/theme.test.mjs). Platform-dependent
// helpers (elevation, focus ring, transitions) live in ./index.js.
//
// Identity: a warm, light study surface with dark ink, one restrained teal
// accent for actions, and a soft "highlighter" amber reserved for the back of
// study cards. Neutral by design; no institutional palette.

export const palette = {
  // Neutrals: warm paper → ink
  paper: "#F5F3EE",
  white: "#FFFFFF",
  sand100: "#FAF8F3",
  sand200: "#EEEBE4",
  sand300: "#E3DED4",
  sand500: "#8A8375",
  slate500: "#5C6575",
  slate700: "#434D5F",
  ink: "#1A2231",

  // Accent: deep study teal
  teal50: "#E3F0EC",
  teal200: "#B7D9D1",
  teal600: "#0F6B5E",
  teal700: "#0C5A4F",
  teal800: "#094A41",

  // Secondary: highlighter amber (card backs, emphasis only)
  amber50: "#FFF6DF",
  amber200: "#F0D9A2",
  amber800: "#7A4D0B",

  // Status
  green50: "#E5F3EA",
  green200: "#A9D8BC",
  green700: "#1B6E44",
  yellow50: "#FFF3D6",
  yellow200: "#EBCF8B",
  yellow800: "#7F5300",
  red50: "#FCEBE9",
  red200: "#F0B7B1",
  red700: "#A8231B",

  // Focus
  blue600: "#3157CF",
};

export const colors = {
  // Surfaces
  bg: palette.paper, // app background
  surface: palette.white, // panels, list rows
  surfaceRaised: palette.white, // dialogs, mode cards (paired with elevation)
  surfaceSunken: palette.sand200, // wells, disabled fills, inactive toggles
  sourceSurface: palette.sand100, // source/context panel (connected to the card)
  sourceRule: palette.sand500, // left rule on source panels

  // Text
  text: palette.ink,
  textSecondary: palette.slate700,
  textMuted: palette.slate500,
  textOnAccent: palette.white,

  // Lines
  border: palette.sand300, // decorative separators / panel outlines
  borderStrong: palette.sand500, // input + control boundaries (≥3:1)

  // Accent
  accent: palette.teal600,
  accentHover: palette.teal700,
  accentPressed: palette.teal800,
  accentSoft: palette.teal50,
  accentText: palette.teal700, // accent-coloured text on light surfaces

  // Study card
  cardFront: palette.white,
  cardBack: palette.amber50,
  cardBackBorder: palette.amber200,
  cardBorder: palette.sand300,
  cardText: palette.ink,
  highlightText: palette.amber800,

  // Status
  success: palette.green700,
  successSoft: palette.green50,
  successBorder: palette.green200,
  warning: palette.yellow800,
  warningSoft: palette.yellow50,
  warningBorder: palette.yellow200,
  error: palette.red700,
  errorSoft: palette.red50,
  errorBorder: palette.red200,
  info: palette.teal700,
  infoSoft: palette.teal50,
  infoBorder: palette.teal200,

  // States
  focus: palette.blue600,
  disabledBg: palette.sand200,
  disabledText: palette.slate500,
  scrim: "rgba(26, 34, 49, 0.45)",
  shadow: palette.ink,
};

// 4-pt scale
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8, // chips' inner parts, inputs
  md: 12, // buttons, rows
  lg: 16, // panels
  xl: 24, // study cards
  pill: 999, // chips, badges
};

// System fonts only: no font loading. Hierarchy comes from size + weight.
export const typeScale = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "700", letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" }, // controls
  meta: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.6 }, // uppercase metadata
  cardFront: { fontSize: 26, lineHeight: 34, fontWeight: "600", letterSpacing: -0.2 },
  cardBack: { fontSize: 22, lineHeight: 30, fontWeight: "500" },
  excerpt: { fontSize: 15, lineHeight: 22, fontWeight: "400", fontStyle: "italic" },
};

export const motion = {
  duration: {
    instant: 0,
    fast: 120, // press feedback, hovers
    standard: 200, // surface/panel transitions, modals
    deliberate: 300, // card flip (owned by F3)
  },
  // CSS equivalents of the RN Easing curves exported from ./index.js
  cssEasing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
};

export const layout = {
  // Breakpoints (window width, dp/px)
  breakpoints: { tablet: 600, desktop: 1024, wide: 1280 },
  // Page gutters per breakpoint
  gutter: { phone: 16, tablet: 24, desktop: 32 },
  // Content column max widths (web/tablet)
  maxWidth: { narrow: 640, content: 880, wide: 1120 },
  // Study card max width
  cardMaxWidth: 900,
  // Minimum interactive size (iOS HIG / WCAG 2.5.5-ish)
  touchTarget: 44,
};
