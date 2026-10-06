// tests/theme.test.mjs
// Deterministic checks for the F1 design foundation. No dependencies:
//   npm test   (→ node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { colors, layout, spacing, radius, typeScale } from "../src/theme/tokens.js";
import { getBreakpoint, resolveGutter, resolveMaxWidth } from "../src/theme/breakpoints.js";

// ── WCAG 2.x relative luminance / contrast ─────────────────────────────────
function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS = [
  // [foreground, background, label]
  ["text", "bg"], ["text", "surface"], ["text", "surfaceSunken"], ["text", "sourceSurface"],
  ["textSecondary", "bg"], ["textSecondary", "surface"], ["textSecondary", "sourceSurface"],
  ["textMuted", "bg"], ["textMuted", "surface"], ["textMuted", "surfaceSunken"], ["textMuted", "sourceSurface"],
  ["textOnAccent", "accent"], ["textOnAccent", "accentHover"], ["textOnAccent", "accentPressed"],
  ["accentText", "surface"], ["accentText", "bg"], ["accentText", "accentSoft"],
  ["cardText", "cardFront"], ["cardText", "cardBack"], ["highlightText", "cardBack"],
  ["success", "successSoft"], ["warning", "warningSoft"], ["error", "errorSoft"], ["info", "infoSoft"],
  ["success", "surface"], ["error", "surface"],
  ["disabledText", "disabledBg"],
];

for (const [fg, bg] of TEXT_PAIRS) {
  test(`text contrast ${fg} on ${bg} ≥ 4.5:1`, () => {
    const ratio = contrast(colors[fg], colors[bg]);
    assert.ok(ratio >= 4.5, `${fg} ${colors[fg]} on ${bg} ${colors[bg]} = ${ratio.toFixed(2)}`);
  });
}

// WCAG 1.4.11: control boundaries and focus indicators need ≥3:1
const UI_PAIRS = [
  ["borderStrong", "surface"], ["borderStrong", "bg"],
  ["focus", "bg"], ["focus", "surface"],
  ["accent", "bg"], ["sourceRule", "sourceSurface"],
];
for (const [fg, bg] of UI_PAIRS) {
  test(`non-text contrast ${fg} on ${bg} ≥ 3:1`, () => {
    const ratio = contrast(colors[fg], colors[bg]);
    assert.ok(ratio >= 3, `${fg} on ${bg} = ${ratio.toFixed(2)}`);
  });
}

test("token scales are numeric and ordered", () => {
  const s = Object.values(spacing);
  assert.deepEqual([...s].sort((a, b) => a - b), s);
  assert.ok(radius.sm < radius.md && radius.md < radius.lg && radius.lg < radius.xl);
  for (const [k, v] of Object.entries(typeScale)) {
    assert.ok(v.lineHeight >= v.fontSize, `${k} lineHeight < fontSize`);
  }
  assert.ok(typeScale.body.fontSize >= 16, "body text must be ≥16");
  assert.equal(layout.touchTarget, 44);
});

test("breakpoints classify the verification viewports", () => {
  assert.equal(getBreakpoint(390), "phone");
  assert.equal(getBreakpoint(844), "tablet"); // 844×390 landscape phone
  assert.equal(getBreakpoint(768), "tablet");
  assert.equal(getBreakpoint(1280), "desktop");
  assert.equal(getBreakpoint(1440), "desktop");
});

test("gutters and max widths never exceed the window", () => {
  for (const w of [320, 390, 600, 844, 1024, 1280, 1440]) {
    const g = resolveGutter(w);
    for (const size of ["narrow", "content", "wide"]) {
      const inner = Math.min(resolveMaxWidth(size), w - 2 * g);
      assert.ok(inner > 0 && inner + 2 * g <= w, `w=${w} size=${size}`);
    }
  }
  assert.equal(resolveGutter(390), layout.gutter.phone);
  assert.equal(resolveGutter(1440), layout.gutter.desktop);
  assert.equal(resolveMaxWidth(500), 500);
});

// ── Single token module: no raw hex colours in app source ──────────────────
// Allowed: src/theme/** (the tokens) and src/utils/exportHTML.js (standalone
// printable HTML document, not app UI).
test("no raw hex colours outside src/theme", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const allowed = [join("src", "theme") + sep, join("src", "utils", "exportHTML.js")];
  const hex = /["'`]#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?["'`]/;
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) {
        const rel = relative(root, p);
        if (allowed.some((a) => rel === a || rel.startsWith(a))) continue;
        readFileSync(p, "utf8").split("\n").forEach((line, i) => {
          if (hex.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
      }
    }
  };
  walk(join(root, "src"));
  for (const f of ["App.js"]) {
    readFileSync(join(root, f), "utf8").split("\n").forEach((line, i) => {
      if (hex.test(line)) offenders.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
