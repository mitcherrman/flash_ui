// tests/responsive.test.mjs — F4 layout classification and study-screen
// geometry over the whole verification matrix (pure; no React Native).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getLayoutClass } from "../src/theme/breakpoints.js";
import {
  FACE_CHROME,
  STUDY_TEXT,
  flipCardHeight,
  flipDrillLayout,
  isHorizontalSwipe,
  mcLayout,
  studyText,
  swipeDirection,
  swipeThreshold,
} from "../src/study/layout.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MATRIX = [
  [390, 844, "phone"],
  [740, 360, "short"],
  [844, 390, "short"],
  [896, 414, "short"],
  [768, 1024, "tablet"],
  [1024, 768, "desktop"],
  [1280, 720, "desktop"],
  [1280, 800, "desktop"],
  [1440, 900, "desktop"],
  [1600, 900, "desktop"],
  [1920, 1080, "desktop"],
];

test("layout class for every viewport in the F4 matrix", () => {
  for (const [w, h, expected] of MATRIX) {
    assert.equal(getLayoutClass(w, h), expected, `${w}×${h}`);
  }
});

test("layout class edges: constrained desktop height, tiny landscape, portrait, bad input", () => {
  assert.equal(getLayoutClass(1280, 480), "short", "short desktop window → side by side");
  assert.equal(getLayoutClass(1920, 500), "short");
  assert.equal(getLayoutClass(1280, 520), "desktop", "520 tall is no longer short");
  assert.equal(getLayoutClass(568, 320), "short", "iPhone SE landscape");
  assert.equal(getLayoutClass(520, 320), "phone", "too narrow for two columns");
  assert.equal(getLayoutClass(360, 640), "phone");
  assert.equal(getLayoutClass(599, 900), "phone");
  assert.equal(getLayoutClass(600, 960), "tablet");
  assert.equal(getLayoutClass(1023, 700), "tablet");
  assert.equal(getLayoutClass(1024, 1366), "desktop", "tablet portrait at desktop width");
  assert.equal(getLayoutClass(400, 400), "phone", "square is not landscape");
  assert.equal(getLayoutClass(undefined, undefined), "phone");
});

test("classification uses geometry only (no hover / pointer input)", () => {
  assert.equal(getLayoutClass.length, 2);
  const src = readFileSync(join(ROOT, "src/theme/breakpoints.js"), "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "");
  assert.doesNotMatch(src, /hover|matchMedia|pointer|Platform/);
});

test("study screens no longer classify by (hover: hover) or isDesktopWeb", () => {
  const files = [];
  const walk = (d) =>
    readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    });
  walk(join(ROOT, "src"));
  for (const f of files) {
    const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code, /\(hover: hover\)|isDesktopWeb/, f);
  }
});

const NOTCH = { top: 0, bottom: 21, left: 47, right: 47 }; // phone on its side

for (const [w, h, cls] of MATRIX) {
  test(`Flip Drill geometry fits ${w}×${h} (${cls})`, () => {
    for (const insets of [{}, cls === "short" ? NOTCH : {}]) {
      const L = flipDrillLayout({ layoutClass: cls, width: w, height: h, insets });
      const availW = w - (insets.left || 0) - (insets.right || 0) - 2 * L.gutter;
      assert.ok(L.rowW <= availW, `row ${L.rowW} > ${availW}`);
      assert.ok(L.cardW >= 200, "card stays usable");
      assert.ok(L.cardW <= 720, "lines never get too long");
      assert.ok(L.baseCardH >= 160);
      if (cls === "short") {
        assert.equal(L.columns, 2);
        assert.equal(L.navPlacement, "side");
        assert.equal(L.templatePlacement, "header", "no bottom bar over the card");
        assert.ok(L.baseCardH <= h - 60 - 8, "card fits under the header and body padding");
        assert.ok(L.sideW >= 220, "room for source + Previous/Next");
      } else if (cls === "desktop") {
        assert.equal(L.columns, 2);
        assert.equal(L.navPlacement, "underCard");
        // card + Previous/Next + hint + header fit without scrolling
        assert.ok(80 + 48 + L.baseCardH + 60 + 28 <= h, `${L.baseCardH} too tall for ${h}`);
        assert.ok(L.sideW >= 300 && L.sideW <= 400);
      } else {
        assert.equal(L.columns, 1);
        assert.equal(L.navPlacement, "footer");
        assert.equal(L.templatePlacement, "bar");
      }
    }
  });

  test(`Multiple Choice geometry fits ${w}×${h} (${cls})`, () => {
    const L = mcLayout({ layoutClass: cls, width: w, height: h, insets: {} });
    assert.ok(L.rowW <= w - 2 * L.gutter, `row ${L.rowW} > ${w - 2 * L.gutter}`);
    assert.ok(L.optionMinH >= 44, "options keep a 44px target (F1's 40px exception is gone)");
    assert.ok(L.leftW >= 220 && L.rightW >= 240);
    assert.equal(L.columns, cls === "short" || cls === "desktop" ? 2 : 1);
    assert.equal(L.navPlacement, L.columns === 2 ? "side" : "footer");
  });
}

test("tablet keeps the touch column; desktop starts at 1024 with the same 44px controls", () => {
  const t = flipDrillLayout({ layoutClass: "tablet", width: 768, height: 1024 });
  assert.equal(t.cardW, 640);
  assert.equal(t.columns, 1);
  const d = flipDrillLayout({ layoutClass: "desktop", width: 1024, height: 768 });
  assert.equal(d.columns, 2);
  assert.ok(d.cardW >= 500, `1024×768 card ${d.cardW}`);
});

test("long text grows the card instead of clipping it", () => {
  assert.equal(flipCardHeight(300, 0), 300, "before measuring: the base height");
  assert.equal(flipCardHeight(300, 100), 300, "short text: unchanged");
  assert.equal(flipCardHeight(300, 600), 600 + FACE_CHROME, "long text: all of it fits");
  assert.ok(flipCardHeight(200, 1000.4) >= 1000.4 + FACE_CHROME);
});

test("study text is never shrunk below 16px", () => {
  for (const [cls, sizes] of Object.entries(STUDY_TEXT)) {
    for (const [role, [size, line]] of Object.entries(sizes)) {
      assert.ok(size >= 16, `${cls}.${role} ${size}px`);
      assert.ok(line >= size, `${cls}.${role} line height`);
    }
  }
  assert.deepEqual(studyText("unknown"), studyText("phone"));
});

test("swipe thresholds scale with the card and ignore vertical scrolls", () => {
  assert.equal(swipeThreshold(358), 72);
  assert.equal(swipeThreshold(100), 64, "narrow cards still need a deliberate drag");
  assert.equal(swipeThreshold(2000), 120, "wide cards don't need a huge drag");
  for (const w of [200, 358, 496, 720]) {
    const t = swipeThreshold(w);
    assert.equal(swipeDirection(-60, t), null, "−60px springs back (F3 behaviour)");
    assert.equal(swipeDirection(-300, t), "next");
    assert.equal(swipeDirection(300, t), "prev");
  }
  assert.equal(isHorizontalSwipe(15, 0), false, "below the activation distance");
  assert.equal(isHorizontalSwipe(40, 10), true);
  assert.equal(isHorizontalSwipe(30, 60), false, "mostly vertical: let the column scroll");
  assert.equal(isHorizontalSwipe(-40, -5), true);
});

test("the template bar sits in the column, not over the card", () => {
  const css = readFileSync(join(ROOT, "src/styles/components/TemplateBar.styles.js"), "utf8");
  const bar = css.slice(css.indexOf("bar: {"), css.indexOf("},", css.indexOf("bar: {")));
  assert.doesNotMatch(bar, /position:\s*"absolute"/);
  const g2 = readFileSync(join(ROOT, "src/Screens/Game2Screen.js"), "utf8");
  assert.match(g2, /hidden=\{!barShown\}/);
});

test("web card-count slider is a native range input with the same props", () => {
  const web = readFileSync(join(ROOT, "src/components/source/CardCountSlider.web.js"), "utf8");
  const native = readFileSync(join(ROOT, "src/components/source/CardCountSlider.js"), "utf8");
  const control = readFileSync(join(ROOT, "src/components/source/CardCountControl.js"), "utf8");
  assert.match(web, /type: "range"/);
  assert.match(web, /onChange\(Math\.round/);
  assert.match(native, /@react-native-community\/slider/);
  assert.match(native, /onChange\(Math\.round/);
  assert.doesNotMatch(control, /@react-native-community\/slider/, "the control picks per platform");
  const sig = (t) => t.match(/export default function CardCountSlider\(\{([^}]*)\}/)[1].replace(/\s/g, "");
  assert.equal(sig(web), sig(native), "same props on web and native");
});
