// tests/studyNav.test.mjs — F3 TOC navigation (run through React Navigation 7's
// real StackRouter), template ownership, and printable export order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { StackRouter } from "@react-navigation/routers";
import { backToPickerAction, openTocAction, studyParams, tocJumpAction } from "../src/study/tocNav.js";
import { deckToPrintableHTML, mirroredBackCells } from "../src/study/printable.js";
import { colors } from "../src/theme/tokens.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = ["Upload", "Build", "Picker", "Game1", "Game2", "TOC", "GameMC"];
const OPTS = { routeNames: ROUTES, routeParamList: {}, routeGetIdList: {} };

function stack(initial = "Picker", params = { deckId: 7 }) {
  const router = StackRouter({ initialRouteName: initial });
  let state = router.getInitialState({ ...OPTS, routeParamList: { [initial]: params } });
  return {
    dispatch(action) {
      const next = router.getStateForAction(state, action, OPTS);
      assert.ok(next, `router rejected ${action.type}`);
      state = next;
    },
    get state() {
      return state;
    },
    get names() {
      return state.routes.map((r) => r.name);
    },
    get top() {
      return state.routes[state.index];
    },
  };
}

const navigate = (name, params) => ({ type: "NAVIGATE", payload: { name, params } });

// ── TOC stack growth (verified bug) ─────────────────────────────────────────
test("reproduces the pre-F3 stack growth: navigate() pushed a study screen per jump", () => {
  const s = stack();
  s.dispatch(navigate("Game2", { deckId: 7 }));
  for (let i = 1; i <= 5; i++) {
    s.dispatch(navigate("TOC", { deckId: 7, returnTo: "Game2" }));
    s.dispatch(navigate("Game2", { deckId: 7, startOrdinal: i })); // old TOCScreen.openAt
  }
  assert.equal(s.state.routes.length, 12, s.names.join(" → "));
});

test("fixed: five open/jump cycles keep Picker → Flip Drill, reusing the same screen", () => {
  const s = stack();
  s.dispatch(navigate("Game2", studyParams({ route: "Game2", deckId: 7 })));
  const drillKey = s.top.key;
  for (let i = 1; i <= 5; i++) {
    s.dispatch(openTocAction({ from: "Game2", deckId: 7, currentOrdinal: i }));
    assert.deepEqual(s.names, ["Picker", "Game2", "TOC"]);
    s.dispatch(tocJumpAction({ returnTo: "Game2", deckId: 7, ordinal: i + 1, jump: `j${i}` }));
    assert.deepEqual(s.names, ["Picker", "Game2"]);
  }
  assert.equal(s.top.key, drillKey, "same Flip Drill instance (no remount)");
  assert.equal(s.top.params.startOrdinal, 6);
  assert.equal(s.top.params.deckId, 7);
  // One Back returns to the Picker.
  s.dispatch({ type: "GO_BACK" });
  assert.deepEqual(s.names, ["Picker"]);
});

test("fixed: Multiple Choice returns to Multiple Choice", () => {
  const s = stack();
  s.dispatch(navigate("GameMC", studyParams({ route: "GameMC", deckId: 7 })));
  for (let i = 0; i < 5; i++) {
    s.dispatch(openTocAction({ from: "GameMC", deckId: 7, currentOrdinal: 1 }));
    s.dispatch(tocJumpAction({ returnTo: "GameMC", deckId: 7, ordinal: 3, jump: i }));
  }
  assert.deepEqual(s.names, ["Picker", "GameMC"]);
  assert.equal(s.top.params.mode, "mc");
});

test("TOC opened from the Picker: a jump replaces the TOC with the study screen", () => {
  const s = stack();
  s.dispatch(navigate("TOC", { deckId: 7, returnTo: "Game2" }));
  s.dispatch(tocJumpAction({ returnTo: "Game2", deckId: 7, ordinal: 4, jump: 1 }));
  assert.deepEqual(s.names, ["Picker", "Game2"]);
  assert.equal(s.top.params.startOrdinal, 4);
  s.dispatch({ type: "GO_BACK" });
  assert.deepEqual(s.names, ["Picker"]);
});

test("jumping to the same card twice still delivers a new jump token", () => {
  const s = stack();
  s.dispatch(navigate("Game2", studyParams({ route: "Game2", deckId: 7 })));
  s.dispatch(openTocAction({ from: "Game2", deckId: 7 }));
  s.dispatch(tocJumpAction({ returnTo: "Game2", deckId: 7, ordinal: 2, jump: "a" }));
  const first = s.top.params;
  s.dispatch(openTocAction({ from: "Game2", deckId: 7 }));
  s.dispatch(tocJumpAction({ returnTo: "Game2", deckId: 7, ordinal: 2, jump: "b" }));
  assert.equal(s.top.params.startOrdinal, first.startOrdinal);
  assert.notEqual(s.top.params.jump, first.jump);
});

test("unknown returnTo falls back to the Flip Drill; Back to deck resets to one Picker", () => {
  assert.equal(tocJumpAction({ returnTo: "Game1", deckId: 7, ordinal: 1, jump: 1 }).payload.name, "Game2");
  const s = stack("Upload", undefined);
  s.dispatch(navigate("Picker", { deckId: 7 }));
  s.dispatch(navigate("Game2", { deckId: 7 }));
  s.dispatch(backToPickerAction(7));
  assert.deepEqual(s.names, ["Picker"]);
});

// ── template ownership (verified bug: duplicate modals) ─────────────────────
function src(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}
function count(text, needle) {
  return text.split(needle).length - 1;
}
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

test("no global template event bus: nothing can open a template it doesn't own", () => {
  assert.equal(existsSync(join(ROOT, "src/utils/TemplateBus.js")), false);
  for (const f of walk(join(ROOT, "src"))) {
    const t = readFileSync(f, "utf8");
    assert.ok(!/TemplateBus|onTemplateOpen|requestTemplateOpen/.test(t), f);
  }
});

test("each template surface has exactly one owner and one sheet", () => {
  assert.equal(count(src("src/Screens/GamePicker.js"), "<TemplateSheet"), 1);
  assert.equal(count(src("src/Screens/TOCScreen.js"), "<TemplateSheet"), 1);
  assert.equal(count(src("src/Screens/TOCScreen.js"), "<TemplateBar"), 0, "no hidden TemplateBar in the TOC");
  assert.equal(count(src("src/components/TemplateBar.js"), "<TemplateSheet"), 1);
  assert.equal(count(src("src/Screens/Game2Screen.js"), "<TemplateBar"), 1);
  assert.equal(count(src("src/Screens/Game2Screen.js"), "<TemplateSheet"), 0);
  // The only template <Modal> is the sheet itself.
  for (const f of ["src/Screens/GamePicker.js", "src/Screens/TOCScreen.js", "src/components/TemplateBar.js"]) {
    assert.equal(count(src(f), "<Modal"), 0, f);
  }
  assert.equal(count(src("src/components/study/TemplateSheet.js"), "<Modal"), 1);
});

// ── printable export (duplex) ───────────────────────────────────────────────
test("duplex: back rows are mirrored so each answer prints behind its question", () => {
  assert.deepEqual(mirroredBackCells([1, 2, 3, 4, 5, 6]), [2, 1, 4, 3, 6, 5]);
  assert.deepEqual(mirroredBackCells([1, 2, 3, 4, 5]), [2, 1, 4, 3, null, 5]);
  assert.deepEqual(mirroredBackCells([1]), [null, 1]);
});

const cards = Array.from({ length: 8 }, (_, i) => ({ front: `Question ${i + 1}`, back: `Answer ${i + 1}` }));

test("duplex: sheets alternate questions/answers (pre-F3 printed all fronts first)", () => {
  const html = deckToPrintableHTML({ deckName: "uneven-toc", cards });
  const order = [...html.matchAll(/<header class="page-hint">(Questions|Answers) — sheet (\d)/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(order, ["Questions 1", "Answers 1", "Questions 2", "Answers 2"]);
  // Back of sheet 1: row 1 is Answer 2 then Answer 1.
  const answers = [...html.matchAll(/>Answer (\d)</g)].map((m) => Number(m[1]));
  assert.deepEqual(answers.slice(0, 6), [2, 1, 4, 3, 6, 5]);
  assert.deepEqual(answers.slice(6), [8, 7]);
});

test("printable export: deck name, escaping, F1 colours, no legacy gold", () => {
  const html = deckToPrintableHTML({ deckName: "Cells <&> \"Notes\"", cards: [{ front: "<b>x</b>", back: "y" }] });
  assert.ok(html.includes("<title>Cells &lt;&amp;&gt; &quot;Notes&quot; — Printable cards</title>"));
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(html.includes(colors.cardBack));
  assert.ok(!/#ffcd00|#FDB515|#003262/i.test(html));
  assert.ok(!/\bPDF\b/.test(html), "the HTML never calls itself a PDF");
});

test("export labels tell the truth: web offers HTML only; PDF only on native", () => {
  const picker = src("src/Screens/GamePicker.js");
  assert.ok(picker.includes('"Download printable cards (HTML)"'));
  assert.ok(!picker.includes("Export / Share PDF"));
  assert.match(picker, /\{!IS_WEB && \(\s*<Button\s+title=\{busy === "pdf" \? "Preparing PDF…" : "Export PDF"\}/);
});
