// tests/f6Demo.test.mjs — F6 offline portfolio demo: fixture validity, the
// demo deck source (same contract as the real one), no network, isolation
// from the normal app, and the demo's routes (run through React Navigation
// 7's real StackRouter).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { StackRouter } from "@react-navigation/routers";
import { createDemoSource, demoSections, groundingExample, installDemoSource, provenanceCounts } from "../src/demo/demoSource.js";
import { blockNetwork, OFFLINE_MESSAGE } from "../src/demo/network.js";
import { DEMO_SOURCE_ROUTE, openDeckAction, startStudyAction } from "../src/demo/demoNav.js";
import { deckStateFrom, deckSubtitle, isValidDeckId, resolveDeckIdentity } from "../src/study/deck.js";
import { normalizeHand, normalizeToc } from "../src/study/deckApi.js";
import { cardPageLabel, cardProvenance, sourceView } from "../src/study/provenance.js";
import { isReconstructed, templateRangeLabel } from "../src/study/template.js";
import { backToPickerAction, backToUploadAction, openTocAction, tocJumpAction } from "../src/study/tocNav.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const FIXTURE_PATH = "src/demo/fixture/harbor-point-deck.json";
const fixture = () => JSON.parse(read(FIXTURE_PATH));
const F = fixture();
const DECK = F.generate.deck_id;

// Backend response shapes (CardSerializer and views.toc, backend F5).
const HAND_KEYS = ["context", "deck", "distractors", "back", "excerpt", "front", "id", "ordinal", "page", "right", "section", "wrong"].sort();
const TOC_KEYS = ["context", "front", "id", "ordinal", "page", "section"].sort();

// The backend's grounding normalisation (core._words / _locate_excerpt).
const words = (s) => (String(s).toLowerCase().match(/\w+/gu) ?? []);
const norm = (s) => ` ${words(s).join(" ")} `;
const pageText = (n) => F.document.pages.find((p) => p.page === n)?.text ?? "";
function foundVerbatim(excerpt, pages) {
  const w = words(excerpt);
  const needles = w.length <= 8 ? [w] : [w.slice(0, 8), w.slice(-8)];
  return needles.some((needle) => pages.some((p) => norm(pageText(p)).includes(` ${needle.join(" ")} `)));
}
const sectionOf = (title) => F.template.sections.find((s) => s.title === title);
const range = (s) => Array.from({ length: s.page_end - s.page_start + 1 }, (_, i) => s.page_start + i);

// ── fixture validity ────────────────────────────────────────────────────────
test("fixture: synthetic, labelled as such, with a deck id the app accepts", () => {
  assert.equal(F.fixture.synthetic, true);
  assert.equal(F.fixture.schema, "flash-demo-fixture/v1");
  assert.match(F.fixture.notice, /synthetic|fictional/i);
  assert.match(F.document.notice, /fictional/i);
  assert.ok(isValidDeckId(DECK), DECK);
  assert.match(DECK, /^demo-/, "an obviously-demo id, never a real deck's token");
  // Nothing that looks like a person, an address or a live endpoint.
  const raw = read(FIXTURE_PATH);
  assert.doesNotMatch(raw, /https?:\/\/|@[a-z0-9-]+\.[a-z]|api[_-]?key|sk-[A-Za-z0-9]/i);
});

test("fixture: 8–12 cards over at least 3 sections, at least one unknown page", () => {
  assert.ok(F.hand.length >= 8 && F.hand.length <= 12, `${F.hand.length} cards`);
  assert.ok(F.template.sections.length >= 3);
  assert.ok(F.hand.some((c) => c.page === null));
  assert.ok(F.hand.filter((c) => Number.isInteger(c.page)).length >= 3);
});

test("fixture: hand and toc have the backend's exact response shapes", () => {
  for (const c of F.hand) {
    assert.deepEqual(Object.keys(c).sort(), HAND_KEYS);
    assert.equal(c.deck, DECK);
  }
  for (const r of F.toc) assert.deepEqual(Object.keys(r).sort(), TOC_KEYS);
  assert.equal(normalizeHand(F.hand).length, F.hand.length);
  assert.equal(normalizeToc(F.toc).length, F.toc.length);
  assert.equal(F.generate.cards_created, F.hand.length);
  assert.equal(F.generate.partial, false);
  assert.deepEqual(F.generate.warnings, []);
});

test("fixture: dense ordinals 1..N in document order (page ascending, unknown last), equal in hand and toc", () => {
  F.hand.forEach((c, i) => assert.equal(c.ordinal, i + 1));
  assert.equal(new Set(F.hand.map((c) => c.id)).size, F.hand.length, "unique card ids");
  F.toc.forEach((r, i) => {
    const c = F.hand[i];
    assert.deepEqual([r.id, r.ordinal, r.front, r.section, r.page, r.context], [c.id, i + 1, c.front, c.section, c.page, c.context]);
  });
  const keys = F.hand.map((c) => (c.page === null ? Infinity : c.page));
  assert.deepEqual(keys, [...keys].sort((a, b) => a - b));
});

test("fixture: sections are the PDF outline's real ranges, in the analysis, template and plan alike", () => {
  const analysis = F.analysis.per_section_allocation.map((s) => [s.title, s.page_start, s.page_end]);
  const template = F.template.sections.map((s) => [s.title, s.page_start, s.page_end]);
  const plan = F.plan.allocations.map((s) => [s.title, s.page_start, s.page_end]);
  assert.deepEqual(template, analysis);
  assert.deepEqual(plan, analysis);
  assert.ok(F.template.sections.every((s) => s.page_source === "toc"));
  assert.ok(F.template.sections.every((s) => s.items.length >= 5 && s.items.length <= 6));
  assert.equal(F.analysis.pages, F.document.pages.length);
  assert.equal(F.analysis.sections_count, F.template.sections.length);
  assert.equal(F.template.title, F.plan.deck_name);
  assert.equal(F.plan.deck_name, F.document.filename.replace(/\.pdf$/i, ""));
  assert.equal(F.plan.cards_wanted, F.hand.length);
});

test("fixture: every exact page is grounded — the excerpt is on that page, inside its section's range", () => {
  for (const c of F.hand.filter((x) => x.page !== null)) {
    const sec = sectionOf(c.section);
    assert.ok(sec, `card ${c.ordinal}: unknown section ${c.section}`);
    assert.ok(c.page >= sec.page_start && c.page <= sec.page_end, `card ${c.ordinal} page ${c.page} outside ${sec.page_start}-${sec.page_end}`);
    assert.ok(foundVerbatim(c.excerpt, [c.page]), `card ${c.ordinal}'s excerpt isn't on page ${c.page}`);
  }
});

test("fixture: the unknown page is honest — a multi-page section and an excerpt that isn't verbatim there", () => {
  for (const c of F.hand.filter((x) => x.page === null)) {
    const sec = sectionOf(c.section);
    assert.ok(sec.page_end > sec.page_start, "a single-page section would have grounded its page");
    assert.equal(foundVerbatim(c.excerpt, range(sec)), false);
  }
});

test("fixture: every card has three distinct distractors, none equal to the answer", () => {
  for (const c of F.hand) {
    assert.equal(c.distractors.length, 3, `card ${c.ordinal}`);
    const set = new Set(c.distractors.map((d) => d.trim().toLowerCase()));
    assert.equal(set.size, 3);
    assert.ok(!set.has(c.back.trim().toLowerCase()));
    assert.ok(c.excerpt.trim().length > 0 && c.context.length > 0);
  }
});

// ── the demo source: the real deckSource contract over the fixture ─────────
test("demo source: implements every function of the app's deckSource seam", () => {
  const useDeck = read("src/study/useDeck.js");
  const seam = useDeck.match(/export const deckSource = \{\r?\n([\s\S]*?)\r?\n\};/)[1];
  const keys = [...seam.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]).sort();
  assert.deepEqual(keys, ["loadHand", "loadIdentity", "loadTemplate", "loadToc", "verifyDeck"]);
  const demo = createDemoSource(fixture());
  for (const k of keys) assert.equal(typeof demo[k], "function", k);
  // The study screens read the saved template through the seam, not storage.
  assert.match(useDeck, /deckSource\s*\.loadTemplate\(deckId\)/);
  assert.match(useDeck, /const saved = await deckSource\.loadTemplate\(deckId\)/);
});

test("demo source: ready deck, identity, subtitle and template like a freshly built deck", async () => {
  const demo = createDemoSource(fixture());
  const hand = await demo.loadHand(DECK);
  assert.equal(deckStateFrom(hand).status, "ready");
  assert.equal(deckStateFrom(await demo.loadToc(DECK)).items.length, F.toc.length);
  assert.equal(deckStateFrom(await demo.verifyDeck(DECK)).status, "ready");
  const { meta, template } = await demo.loadIdentity(DECK);
  const id = resolveDeckIdentity({ deckId: DECK, meta, template });
  assert.equal(id.displayTitle, F.plan.deck_name);
  assert.equal(deckSubtitle(id, hand.items.length), `${F.hand.length} cards`, "no invented build time");
  const tpl = await demo.loadTemplate(DECK);
  assert.equal(isReconstructed(tpl), false);
  assert.deepEqual(tpl.sections.map(templateRangeLabel), ["Pages 1–2", "Pages 3–4", "Page 5", "Page 6"]);
});

test("demo source: another deck id is the server's 404 → the missing state (no fallback)", async () => {
  const demo = createDemoSource(fixture());
  for (const call of [demo.loadHand, demo.loadToc, demo.verifyDeck]) {
    const err = await call("someOtherDeckId123456").then(() => null, (e) => e);
    assert.equal(err?.status, 404);
    assert.equal(deckStateFrom({ error: err }).status, "missing");
  }
  assert.equal(await demo.loadTemplate("someOtherDeckId123456"), null);
  assert.deepEqual(await demo.loadIdentity("someOtherDeckId123456"), { meta: null, template: null });
});

test("demo source: returns copies, so a screen can't change the fixture", async () => {
  const demo = createDemoSource(fixture());
  const a = await demo.loadHand(DECK);
  a.items[0].front = "changed";
  a.items.pop();
  const b = await demo.loadHand(DECK);
  assert.equal(b.items.length, F.hand.length);
  assert.equal(b.items[0].front, F.hand[0].front);
});

test("demo source: installs exactly the five seam functions on the target", () => {
  const target = { loadHand: 1, loadToc: 1, verifyDeck: 1, loadIdentity: 1, loadTemplate: 1, other: "kept" };
  installDemoSource(target, fixture());
  assert.equal(target.other, "kept");
  for (const k of ["loadHand", "loadToc", "verifyDeck", "loadIdentity", "loadTemplate"]) assert.equal(typeof target[k], "function");
});

// ── provenance shown from the fixture ─────────────────────────────────────
test("provenance: exact pages, the honest unknown page with its section range, source after reveal", async () => {
  const demo = createDemoSource(fixture());
  const [{ items }, template] = await Promise.all([demo.loadHand(DECK), demo.loadTemplate(DECK)]);
  const exact = items.find((c) => c.page === 3);
  assert.deepEqual(cardProvenance(exact, template), { section: "Storage and Dispatch", pageLabel: "Page 3", rangeLabel: null, context: exact.context });
  const unknown = items.find((c) => c.page === null);
  const p = cardProvenance(unknown, template);
  assert.equal(p.pageLabel, "Page unknown");
  assert.equal(p.rangeLabel, "Section covers pages 3–4");
  assert.equal(cardPageLabel(unknown.page), "Page unknown", "never page 1");
  for (const c of items) {
    const before = sourceView({ card: c, revealed: false });
    assert.equal(before.excerpt, null);
    assert.ok(!JSON.stringify(before).includes(c.back), `card ${c.ordinal}: answer visible before reveal`);
    assert.equal(sourceView({ card: c, revealed: true }).excerpt, c.excerpt);
  }
});

test("source screen facts are derived from the fixture", () => {
  const f = fixture();
  assert.deepEqual(provenanceCounts(f), { total: 10, exact: 9, unknown: 1 });
  assert.deepEqual(demoSections(f).map((s) => [s.title, s.cards]), F.generate.per_section.map((s) => [s.title, s.created]));
  const ex = groundingExample(f);
  assert.ok(ex && Number.isInteger(ex.page));
  assert.equal(ex.before + ex.match + ex.after === pageText(ex.page).split(/\n\s*\n/).find((p) => p.includes(ex.match)), true);
  assert.equal(ex.match, ex.card.excerpt);
});

// ── no network ─────────────────────────────────────────────────────────────
test("no network: every demo source call completes with fetch and XMLHttpRequest made to fail the test", async () => {
  const saved = { fetch: globalThis.fetch, XHR: globalThis.XMLHttpRequest };
  let calls = 0;
  globalThis.fetch = () => {
    calls += 1;
    throw new Error("network used");
  };
  globalThis.XMLHttpRequest = function () {
    calls += 1;
    throw new Error("network used");
  };
  try {
    const demo = createDemoSource(fixture());
    await demo.loadHand(DECK);
    await demo.loadToc(DECK);
    await demo.verifyDeck(DECK);
    await demo.loadIdentity(DECK);
    await demo.loadTemplate(DECK);
    await demo.loadHand("someOtherDeckId123456").catch(() => {});
  } finally {
    globalThis.fetch = saved.fetch;
    globalThis.XMLHttpRequest = saved.XHR;
  }
  assert.equal(calls, 0);
});

test("no network: the demo's guard refuses fetch and XMLHttpRequest locally", async () => {
  const logged = [];
  const target = { fetch: () => "real", XMLHttpRequest: function Real() {} };
  blockNetwork(target, { error: (m) => logged.push(m) });
  await assert.rejects(target.fetch("http://127.0.0.1:8000/api/flashcards/hand/"), { message: OFFLINE_MESSAGE });
  assert.throws(() => new target.XMLHttpRequest(), { message: OFFLINE_MESSAGE });
  assert.equal(logged.length, 2);
  assert.match(logged[0], /blocked fetch/);
});

test("no network: demo modules never reach the API config, fetch, or device storage", () => {
  const dir = join(ROOT, "src/demo");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    const src = readFileSync(join(dir, f), "utf8").replace(/^\s*\/\/.*$/gm, ""); // code, not comments
    assert.doesNotMatch(src, /from\s+["']\.\.\/config["']|API_BASE|AsyncStorage|utils\/cache/, f);
    if (f !== "network.js") assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest/, f);
  }
  const app = read("src/demo/DemoApp.js");
  assert.match(app, /blockNetwork\(\);\s*\ninstallDemoSource\(deckSource, fixture\);/);
});

// ── isolation: the demo can never be the normal app's data source ──────────
test("isolation: index.js loads the demo only for an explicit EXPO_PUBLIC_FLASH_DEMO=1 build", () => {
  const idx = read("index.js").replace(/\/\/.*$/gm, "");
  assert.match(
    idx,
    /process\.env\.EXPO_PUBLIC_FLASH_DEMO === "1"\s*\?\s*require\("\.\/src\/demo\/DemoApp"\)\.default\s*:\s*require\("\.\/App"\)\.default/
  );
  assert.doesNotMatch(read(".env.example"), /^\s*EXPO_PUBLIC_FLASH_DEMO\s*=/m, "never enabled by an env file");
  const script = read("scripts/export-demo.mjs");
  assert.match(script, /EXPO_PUBLIC_FLASH_DEMO: "1"/);
  assert.match(script, /"--clear"/);
  assert.match(read("package.json"), /"export:demo": "node scripts\/export-demo\.mjs"/);
});

test("isolation: nothing in the app imports the demo; the demo doesn't import the app's routes", () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "demo") walk(p);
      } else if (p.endsWith(".js") && /from\s+["'][^"']*\/demo\/|require\(["'][^"']*\/demo\//.test(readFileSync(p, "utf8"))) {
        hits.push(relative(ROOT, p));
      }
    }
  };
  walk(join(ROOT, "src"));
  assert.deepEqual(hits, []);
  assert.doesNotMatch(read("App.js"), /demo/i);
  const demoApp = read("src/demo/DemoApp.js");
  assert.doesNotMatch(demoApp, /from\s+["']\.\.\/\.\.\/App["']|navigation\/Stack|UploadScreen|BuildScreen/);
  const routes = [...demoApp.matchAll(/<Stack\.Screen name=\{?["']?(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(routes, ["DEMO_SOURCE_ROUTE", "Picker", "Game2", "TOC", "GameMC"]);
});

test("isolation: Metro's transform cache is keyed on EXPO_PUBLIC_* values (a normal build never reuses a demo transform)", () => {
  const key = (demo) =>
    execFileSync(process.execPath, ["-e", "process.stdout.write(require('./metro.config.js').transformer.flashPublicEnvKey)"], {
      cwd: ROOT,
      env: { ...process.env, EXPO_PUBLIC_FLASH_DEMO: demo, EXPO_NO_TELEMETRY: "1" },
      encoding: "utf8",
    });
  const normal = key("");
  const demo = key("1");
  assert.notEqual(normal, demo);
  assert.match(demo, /^EXPO_PUBLIC_FLASH_DEMO=1$/m);
});

// ── web accessibility states (verified F6 bug) ────────────────────────────
// react-native-web 0.20 ignores `accessibilityState`; only aria-* props reach
// the DOM. Before F6 the MC scoring radios had no aria-checked, the flip card
// no aria-expanded, and busy buttons no aria-busy (verified in the live DOM).
test("a11y: every checked/expanded/busy accessibilityState also has its aria-* prop", () => {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    }
  };
  walk(join(ROOT, "src"));
  const missing = [];
  let seen = 0;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/accessibilityState=\{\{([^}]*)\}\}/g)) {
      // The rest of this JSX opening tag (up to its closing ">").
      const tag = src.slice(m.index, src.indexOf(">", m.index + m[0].length) + 1);
      for (const key of ["checked", "expanded", "busy"]) {
        if (!new RegExp(`\\b${key}\\s*:`).test(m[1])) continue;
        seen += 1;
        if (!new RegExp(`aria-${key}\\b`).test(tag)) missing.push(`${relative(ROOT, f)}: ${key}`);
      }
    }
  }
  // Chip checked, Button busy, Build busy, Flip Drill expanded.
  assert.ok(seen >= 4, `expected the known states, saw ${seen}`);
  assert.deepEqual(missing, []);
});

test("a11y: the Picker's template button keeps focus while loading, so Escape can return focus to it", () => {
  // Verified F6 bug: it was disabled while loading, dropped focus, and the
  // sheet's Escape left focus on a scroll container instead of the button.
  const picker = read("src/Screens/GamePicker.js");
  const button = picker.slice(picker.indexOf("onPress={onViewTemplate}") - 200, picker.indexOf("onPress={onViewTemplate}") + 80);
  assert.doesNotMatch(button, /disabled=\{tplLoading\}/);
  assert.match(picker, /async function onViewTemplate\(\) \{[\s\S]{0,200}if \(tplLoading\) return;/);
});

test("a11y: list roles have list items; the template dialog is named", () => {
  assert.match(read("src/ui/BrandMark.js"), /role="listitem"/);
  assert.doesNotMatch(read("src/Screens/GameMC.js"), /accessibilityRole="list"/);
  assert.match(read("src/components/study/TemplateSheet.js"), /aria-label="Study template"/);
});

// ── demo routes (real StackRouter) ─────────────────────────────────────────
const DEMO_ROUTES = [DEMO_SOURCE_ROUTE, "Picker", "Game2", "TOC", "GameMC"];
const OPTS = { routeNames: DEMO_ROUTES, routeParamList: {}, routeGetIdList: {} };
function demoStack() {
  const router = StackRouter({ initialRouteName: DEMO_SOURCE_ROUTE });
  let state = router.getInitialState(OPTS);
  return {
    go(action) {
      const next = router.getStateForAction(state, action, OPTS);
      assert.ok(next, `router rejected ${action.type} ${JSON.stringify(action.payload)}`);
      // RESET hands back a partial ("stale") state; the navigation container
      // rehydrates it before the next action, so do the same here.
      state = next.stale === false ? next : router.getRehydratedState(next, OPTS);
    },
    get names() {
      return state.routes.map((r) => r.name);
    },
    get top() {
      return state.routes[state.index];
    },
  };
}

test("demo routes: start a mode → Picker under it; Back, Contents and jumps behave as in the app", () => {
  const s = demoStack();
  assert.deepEqual(s.names, ["Upload"]);
  s.go(startStudyAction(DECK, "Game2"));
  assert.deepEqual(s.names, ["Picker", "Game2"]);
  assert.deepEqual(s.top.params, { deckId: DECK, mode: "basic", n: "all", order: "doc" });
  s.go(openTocAction({ from: "Game2", deckId: DECK, currentOrdinal: 1 }));
  s.go(tocJumpAction({ returnTo: "Game2", deckId: DECK, ordinal: 10, jump: "j1" }));
  assert.deepEqual(s.names, ["Picker", "Game2"]);
  assert.equal(s.top.params.startOrdinal, 10);
  s.go(backToPickerAction(DECK));
  assert.deepEqual(s.names, ["Picker"]);
  s.go(startStudyAction(DECK, "GameMC"));
  assert.deepEqual(s.names, ["Picker", "GameMC"]);
});

test("demo routes: the app's own New deck / Back to Upload land on the demo's source screen", () => {
  const s = demoStack();
  s.go(openDeckAction(DECK));
  assert.deepEqual(s.names, ["Picker"]);
  s.go(backToUploadAction());
  assert.deepEqual(s.names, ["Upload"]);
  assert.ok(!DEMO_ROUTES.includes("Build"), "the demo has no Build route: it can't make decks");
});
