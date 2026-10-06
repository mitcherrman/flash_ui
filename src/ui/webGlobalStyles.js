// src/ui/webGlobalStyles.js
// Web-only global CSS that React Native styles cannot express:
//   • a visible keyboard focus ring (:focus-visible) on every focusable
//     element, including Pressables not yet migrated to ui/Button;
//   • page background matching the app (no white overscroll / flashes);
//   • reduced-motion handling for CSS transitions.
// Native: no-op.
import { Platform } from "react-native";
import { colors } from "../theme";

const STYLE_ID = "flashcard-maker-global";

const CSS = `
html, body, #root { background-color: ${colors.bg}; }
body {
  color: ${colors.text};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
* { -webkit-tap-highlight-color: transparent; }
:focus { outline: none; }
:focus-visible {
  outline: 2px solid ${colors.focus} !important;
  outline-offset: 2px !important;
}
input:focus-visible, textarea:focus-visible { outline-offset: 0 !important; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`;

export function installWebGlobalStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}
