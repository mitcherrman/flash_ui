// src/study/useStudyKeys.js
// Web keyboard layer for a study screen (F4). Listens on the window only
// while the screen is focused in the navigator (a study screen stays mounted
// under the TOC), maps keys with the pure studyShortcut(), and prevents the
// browser default (page scroll on Space/arrows) only for keys it handles.
// Native: does nothing; no keyboard is required anywhere.
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { studyShortcut } from "./shortcuts.js";

/** An open dialog (react-native-web Modal: template sheet, notify dialog). */
export function isModalOpen() {
  if (typeof document === "undefined") return false;
  return !!document.querySelector('[aria-modal="true"]');
}

/**
 * useStudyKeys({ enabled, getContext, onAction })
 *   getContext() → { mode, optionCount, answered }  (read at key time)
 *   onAction(action)                                 (see studyShortcut)
 */
export function useStudyKeys({ enabled, getContext, onAction }) {
  const ref = useRef({ getContext, onAction });
  ref.current = { getContext, onAction };

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || typeof window === "undefined") return undefined;
    const onKeyDown = (e) => {
      const ctx = { ...(ref.current.getContext?.() || {}), modalOpen: isModalOpen() };
      const action = studyShortcut(e, ctx);
      if (!action) return;
      e.preventDefault();
      ref.current.onAction?.(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/**
 * Web: where focus went when a screen became visible again. True when it is
 * nowhere useful (body), or on an element that was removed or hidden with
 * its screen (TOC rows after a jump, the Picker under a study screen).
 */
export function focusIsLost() {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return true;
  if (!el.isConnected) return true;
  return el.offsetParent === null && getComputedStyle(el).position !== "fixed";
}

/** Web: move focus to a ref'd element without scrolling the page. */
export function focusRef(ref) {
  if (Platform.OS !== "web") return;
  const node = ref?.current;
  try {
    node?.focus?.({ preventScroll: true });
  } catch {}
}
