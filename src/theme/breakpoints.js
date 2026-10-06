// src/theme/breakpoints.js
// Pure responsive helpers (no React Native imports; unit-tested).
import { layout } from "./tokens.js";

/** "phone" (<600) | "tablet" (600–1023) | "desktop" (≥1024) */
export function getBreakpoint(width) {
  if (width >= layout.breakpoints.desktop) return "desktop";
  if (width >= layout.breakpoints.tablet) return "tablet";
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
