// src/theme/breakpoints.js
// Pure responsive helpers (no React Native imports; unit-tested).
import { layout } from "./tokens.js";

/** "phone" (<600) | "tablet" (600–1023) | "desktop" (≥1024) */
export function getBreakpoint(width) {
  if (width >= layout.breakpoints.desktop) return "desktop";
  if (width >= layout.breakpoints.tablet) return "tablet";
  return "phone";
}

/**
 * Layout intent for screens that compose around the viewport (the study
 * screens), from the window's geometry only (F4):
 *
 *   "short"   landscape, shorter than 520 and at least 560 wide: phones on
 *             their side (740×360, 844×390, 896×414) and very short desktop
 *             windows. Height is the constraint, so content goes side by side.
 *   "desktop" ≥1024 wide with enough height (1024×768 tablets included).
 *   "tablet"  600–1023 wide.
 *   "phone"   narrower (and tiny landscape windows under 560 wide).
 *
 * Pointer capability ((hover: hover), touch) is deliberately not an input:
 * a touch laptop or an emulator reporting hover must still get a layout that
 * fits its window, and every class keeps 44px targets, so a touchscreen is
 * never stranded by a "desktop" layout.
 */
export function getLayoutClass(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w > h && h < layout.shortMaxHeight && w >= layout.shortMinWidth) return "short";
  if (w >= layout.breakpoints.desktop) return "desktop";
  if (w >= layout.breakpoints.tablet) return "tablet";
  return "phone";
}

/** Horizontal page gutter for a window width. */
export function resolveGutter(width) {
  return layout.gutter[getBreakpoint(width)];
}

/** Content column max width: a named size ("narrow" | "content" | "wide") or a number. */
export function resolveMaxWidth(size = "content") {
  if (typeof size === "number") return size;
  return layout.maxWidth[size] ?? layout.maxWidth.content;
}
