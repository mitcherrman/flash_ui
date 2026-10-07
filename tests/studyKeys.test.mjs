// tests/studyKeys.test.mjs — F4 web keyboard shortcuts: mapping and guards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isActivatableTarget, isTypingTarget, shortcutHint, studyShortcut } from "../src/study/shortcuts.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal stand-ins for DOM targets.
const el = (tagName, attrs = {}) => ({
  tagName,
  type: attrs.type,
  isContentEditable: !!attrs.contentEditable,
  getAttribute: (n) => (n === "role" ? attrs.role ?? null : null),
});
const BODY = el("BODY");
const DIV = el("DIV");
const key = (k, extra = {}) => ({ key: k, target: BODY, ...extra });
const FLIP = { mode: "flip" };
const MC = { mode: "mc", optionCount: 4, answered: false };

test("Flip Drill: Space/Enter flip, arrows move", () => {
  assert.deepEqual(studyShortcut(key(" "), FLIP), { type: "flip" });
  assert.deepEqual(studyShortcut(key("Spacebar"), FLIP), { type: "flip" }, "old Edge/IE key name");
  assert.deepEqual(studyShortcut(key("Enter"), FLIP), { type: "flip" });
  assert.deepEqual(studyShortcut(key("ArrowRight"), FLIP), { type: "next" });
  assert.deepEqual(studyShortcut(key("ArrowLeft"), FLIP), { type: "prev" });
  assert.deepEqual(studyShortcut(key(" ", { target: DIV }), FLIP), { type: "flip" });
  for (const k of ["1", "t", "ArrowUp", "ArrowDown", "Escape", "Tab", "a"]) {
    assert.equal(studyShortcut(key(k), FLIP), null, `${k} is not a Flip Drill shortcut`);
  }
});

test("Multiple Choice: 1–4 answer the visible options once, arrows move", () => {
  assert.deepEqual(studyShortcut(key("1"), MC), { type: "answer", option: 0 });
  assert.deepEqual(studyShortcut(key("4"), MC), { type: "answer", option: 3 });
  assert.equal(studyShortcut(key("5"), MC), null, "no fifth option");
  assert.equal(studyShortcut(key("3"), { ...MC, optionCount: 2 }), null, "only the options shown");
  assert.equal(studyShortcut(key("1"), { ...MC, answered: true }), null, "one answer per visit");
  assert.equal(studyShortcut(key("0"), MC), null);
  assert.deepEqual(studyShortcut(key("ArrowRight"), MC), { type: "next" });
  assert.deepEqual(studyShortcut(key("ArrowLeft"), MC), { type: "prev" });
  assert.equal(studyShortcut(key(" "), MC), null, "Space does nothing special in MC");
  assert.equal(studyShortcut(key("Enter"), MC), null);
});

test("never while typing", () => {
  const typing = [
    el("INPUT"),
    el("INPUT", { type: "search" }),
    el("INPUT", { type: "text" }),
    el("TEXTAREA"),
    el("SELECT"),
    el("DIV", { contentEditable: true }),
    el("DIV", { role: "textbox" }),
    el("DIV", { role: "searchbox" }),
  ];
  for (const target of typing) {
    assert.equal(isTypingTarget(target), true, `${target.tagName}`);
    for (const k of [" ", "Enter", "ArrowLeft", "ArrowRight", "1"]) {
      assert.equal(studyShortcut({ key: k, target }, FLIP), null);
      assert.equal(studyShortcut({ key: k, target }, MC), null);
    }
  }
  assert.equal(isTypingTarget(el("INPUT", { type: "range" })), false, "a range input is a control");
  assert.equal(isTypingTarget(el("INPUT", { type: "checkbox" })), false);
  assert.equal(isTypingTarget(null), false);
});

test("never with modifiers, auto-repeat, IME composition, or an open dialog", () => {
  for (const mod of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) {
    assert.equal(studyShortcut(key("ArrowRight", { [mod]: true }), FLIP), null, mod);
    assert.equal(studyShortcut(key("1", { [mod]: true }), MC), null, mod);
  }
  assert.equal(studyShortcut(key(" ", { repeat: true }), FLIP), null, "holding Space doesn't machine-gun flips");
  assert.equal(studyShortcut(key("ArrowRight", { repeat: true }), FLIP), null, "holding → doesn't skip cards");
  assert.equal(studyShortcut(key("1", { isComposing: true }), MC), null);
  assert.equal(studyShortcut(key("ArrowRight", { defaultPrevented: true }), FLIP), null);
  assert.equal(studyShortcut(key(" "), { ...FLIP, modalOpen: true }), null);
  assert.equal(studyShortcut(key("2"), { ...MC, modalOpen: true }), null);
  assert.equal(studyShortcut(null, FLIP), null);
});

test("Space/Enter on a focused control activate that control, not a flip", () => {
  const controls = [
    el("BUTTON"),
    el("A"),
    el("DIV", { role: "button" }),
    el("DIV", { role: "switch" }),
    el("DIV", { role: "radio" }),
    el("DIV", { role: "link" }),
    el("INPUT", { type: "range" }),
  ];
  for (const target of controls) {
    assert.equal(isActivatableTarget(target), true);
    assert.equal(studyShortcut({ key: " ", target }, FLIP), null);
    assert.equal(studyShortcut({ key: "Enter", target }, FLIP), null);
  }
  // …but arrows still move cards from an ordinary button (Previous / Next)
  assert.deepEqual(studyShortcut({ key: "ArrowRight", target: el("DIV", { role: "button" }) }, FLIP), { type: "next" });
  assert.equal(isActivatableTarget(DIV), false);
});

test("arrows are left to sliders and radio groups", () => {
  for (const target of [el("DIV", { role: "slider" }), el("DIV", { role: "radio" }), el("INPUT", { type: "range" })]) {
    assert.equal(studyShortcut({ key: "ArrowRight", target }, FLIP), null);
    assert.equal(studyShortcut({ key: "ArrowLeft", target }, MC), null);
  }
});

test("hints describe exactly the shortcuts that exist", () => {
  assert.equal(shortcutHint("flip"), "Keyboard: Space to flip · ← → previous / next");
  assert.equal(shortcutHint("mc", 4), "Keyboard: 1–4 to answer · ← → previous / next");
  assert.equal(shortcutHint("mc", 3), "Keyboard: 1–3 to answer · ← → previous / next");
  assert.equal(shortcutHint("mc", 1), "Keyboard: 1 to answer · ← → previous / next");
});

test("study screens listen only while focused, and only on web", () => {
  const hook = readFileSync(join(ROOT, "src/study/useStudyKeys.js"), "utf8");
  assert.match(hook, /Platform\.OS !== "web" \|\| !enabled/);
  assert.match(hook, /removeEventListener\("keydown"/);
  for (const f of ["src/components/FlipDrill.js", "src/Screens/GameMC.js"]) {
    const t = readFileSync(join(ROOT, f), "utf8");
    assert.match(t, /useStudyKeys\(\{\s*enabled: isFocused/, `${f} gates keys on navigator focus`);
  }
  // Every shortcut repeats a visible control.
  const fd = readFileSync(join(ROOT, "src/components/FlipDrill.js"), "utf8");
  assert.match(fd, /title="Previous"/);
  assert.match(fd, /title="Next"/);
  assert.match(fd, /onPress=\{toggleFlip\}/);
});
