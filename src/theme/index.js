// src/theme/index.js
// Public theme entry point: tokens + platform-aware helpers.
//
//   import { colors, spacing, radius, text, elevation } from "../theme";
//
// Screens should take every colour, size and duration from here rather than
// writing raw values (enforced for hex colours by tests/theme.test.mjs).
import { Easing, Platform } from "react-native";
import { colors, layout, motion, palette, radius, spacing, typeScale } from "./tokens";

export { colors, layout, motion, palette, radius, spacing, typeScale };
export { getBreakpoint, resolveGutter, resolveMaxWidth } from "./breakpoints";

// Ready-to-use text styles (type scale + default colour).
export const text = {
  display: { ...typeScale.display, color: colors.text },
  title: { ...typeScale.title, color: colors.text },
  heading: { ...typeScale.heading, color: colors.text },
  body: { ...typeScale.body, color: colors.text },
  bodyStrong: { ...typeScale.bodyStrong, color: colors.text },
  secondary: { ...typeScale.body, color: colors.textSecondary },
  small: { ...typeScale.small, color: colors.textSecondary },
  muted: { ...typeScale.small, color: colors.textMuted },
  label: { ...typeScale.label, color: colors.text },
  meta: { ...typeScale.meta, color: colors.textMuted, textTransform: "uppercase" },
  cardFront: { ...typeScale.cardFront, color: colors.cardText },
  cardBack: { ...typeScale.cardBack, color: colors.cardText },
  excerpt: { ...typeScale.excerpt, color: colors.textSecondary },
};

// Restrained, cross-platform elevation. Web uses `boxShadow` (avoids the
// react-native-web `shadow*` deprecation); native uses shadow*/elevation.
function shadow(y, blur, opacity, androidElevation) {
  return Platform.select({
    web: {
      boxShadow: `0 1px 2px rgba(26, 34, 49, ${(opacity * 0.6).toFixed(3)}), 0 ${y}px ${blur}px rgba(26, 34, 49, ${opacity})`,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: opacity * 1.6,
      shadowRadius: blur / 2,
      shadowOffset: { width: 0, height: Math.max(1, Math.round(y / 2)) },
      elevation: androidElevation,
    },
  });
}

export const elevation = {
  none: Platform.select({ web: { boxShadow: "none" }, default: { elevation: 0, shadowOpacity: 0 } }),
  low: shadow(2, 6, 0.06, 1), // rows, quiet panels
  medium: shadow(6, 16, 0.08, 3), // mode cards, study card, hovered surfaces
  high: shadow(16, 40, 0.14, 8), // dialogs
};

// RN Easing curves matching motion.cssEasing.
export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
};

// Web-only CSS transition for interactive surfaces (no-op on native).
export function webTransition(properties = ["background-color", "border-color", "box-shadow", "transform", "opacity"]) {
  if (Platform.OS !== "web") return null;
  return {
    transitionProperty: properties.join(", "),
    transitionDuration: `${motion.duration.fast}ms`,
    transitionTimingFunction: motion.cssEasing.standard,
  };
}
