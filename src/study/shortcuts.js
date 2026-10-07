// src/study/shortcuts.js
// Keyboard shortcuts for the study screens on web (F4). Pure: the key event
// and its target are read as plain objects, so the mapping and every guard
// are unit-tested without a DOM.
//
// The set is deliberately small, and every shortcut repeats a visible control:
//   Flip Drill        Space / Enter  flip the card
//                     ← / →          previous / next card
//   Multiple Choice   1–4            choose that option (until answered)
//                     ← / →          previous / next card
//
// A key is left alone (returns null) when:
//   • a modifier is held (Ctrl/⌘/Alt/Shift: browser and system shortcuts);
//   • it is an auto-repeat from a held key (no rapid-fire flips or skips);
//   • an IME composition is in progress, or another handler already took it;
//   • the focus is in a text field, select or contenteditable;
//   • a dialog is open (template sheet, notice);
//   • Space/Enter are aimed at a focused control (a button, switch, radio…),
//     which activates that control instead; arrows are left to sliders,
//     radios and other controls that use them.

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const TEXT_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton"]);
const CONTROL_TAGS = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"]);
const CONTROL_ROLES = new Set([
  "button",
  "link",
  "switch",
  "checkbox",
  "radio",
  "tab",
  "menuitem",
  "option",
  "slider",
]);
const ARROW_ROLES = new Set(["slider", "radio", "radiogroup", "tab", "tablist", "menuitem", "option", "listbox", "spinbutton"]);

function roleOf(target) {
  if (!target) return "";
  const r = typeof target.getAttribute === "function" ? target.getAttribute("role") : target.role;
  return String(r || "").toLowerCase();
}

function tagOf(target) {
  return String(target?.tagName || "").toUpperCase();
}

/** Focus is somewhere the user types text. */
export function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = tagOf(target);
  if (tag === "INPUT") {
    // range, checkbox and buttons are controls, not text
    const type = String(target.type || "text").toLowerCase();
    return !["range", "checkbox", "radio", "button", "submit", "reset", "color", "file"].includes(type);
  }
  return TEXT_TAGS.has(tag) || TEXT_ROLES.has(roleOf(target));
}

/** Focus is on a control that Space/Enter would activate itself. */
export function isActivatableTarget(target) {
  if (!target) return false;
  return CONTROL_TAGS.has(tagOf(target)) || CONTROL_ROLES.has(roleOf(target));
}

function wantsArrows(target) {
  if (!target) return false;
  if (tagOf(target) === "INPUT" && String(target.type || "").toLowerCase() === "range") return true;
  return ARROW_ROLES.has(roleOf(target));
}

const isSpace = (key) => key === " " || key === "Spacebar";

/**
 * Map a keydown to a study action, or null to leave it alone.
 *
 *   event: { key, target, repeat, ctrlKey, metaKey, altKey, shiftKey,
 *            isComposing, defaultPrevented }
 *   ctx:   { mode: "flip" | "mc", modalOpen, optionCount, answered }
 *
 * Actions: { type: "flip" } | { type: "next" } | { type: "prev" }
 *        | { type: "answer", option }
 */
export function studyShortcut(event, ctx = {}) {
  if (!event || event.defaultPrevented || event.isComposing) return null;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null;
  if (event.repeat) return null;
  if (ctx.modalOpen) return null;
  const { key, target } = event;
  if (isTypingTarget(target)) return null;

  if (key === "ArrowRight" || key === "ArrowLeft") {
    if (wantsArrows(target)) return null;
    return { type: key === "ArrowRight" ? "next" : "prev" };
  }

  if (ctx.mode === "flip" && (isSpace(key) || key === "Enter")) {
    // On the card itself (a button) the Pressable flips it; on Previous,
    // Next or Contents the key belongs to that button.
    if (isActivatableTarget(target)) return null;
    return { type: "flip" };
  }

  if (ctx.mode === "mc" && /^[1-9]$/.test(key || "")) {
    const option = Number(key) - 1;
    if (ctx.answered || option >= (ctx.optionCount || 0)) return null;
    return { type: "answer", option };
  }

  return null;
}

/** Short, visible description of the shortcuts (desktop hint line). */
export function shortcutHint(mode, optionCount = 4) {
  if (mode === "mc") {
    const last = Math.max(1, Math.min(9, optionCount));
    return `Keyboard: ${last > 1 ? `1–${last}` : "1"} to answer · ← → previous / next`;
  }
  return "Keyboard: Space to flip · ← → previous / next";
}
