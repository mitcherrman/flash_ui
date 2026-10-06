// tests/plan.test.mjs — F2 source → structure → plan logic (src/source/plan.js).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CARD_LIMITS,
  allocate,
  buildParams,
  capAllocation,
  formatPageRange,
  initialPlanState,
  isChangedFromRecommendation,
  maxTotalFor,
  planReducer,
  planSummary,
  roundHalfEven,
  shareAllocation,
  validatePlan,
} from "../src/source/plan.js";

// Output of the backend's own allocation block (flashcards/ai/analysis.py at
// b3cc888, executed verbatim in Python for each (words, total)). Regenerate
// only if the backend rule changes.
const BACKEND_ALLOCATIONS = [
  { words: [100, 200, 300], total: 3, cards: [1, 1, 1] },
  { words: [100, 200, 300], total: 4, cards: [2, 1, 1] },
  { words: [100, 200, 300], total: 7, cards: [2, 2, 3] },
  { words: [100, 200, 300], total: 12, cards: [3, 4, 5] },
  { words: [100, 200, 300], total: 24, cards: [5, 8, 11] },
  { words: [881], total: 3, cards: [3] },
  { words: [500, 500], total: 3, cards: [2, 1] },
  { words: [500, 500], total: 5, cards: [2, 3] }, // 1.5 → 2 (Python rounds half to even)
  { words: [10, 10, 10, 10], total: 6, cards: [2, 2, 1, 1] },
  { words: [0, 0, 0], total: 5, cards: [1, 2, 2] },
  { words: [150, 150, 150, 150, 150], total: 7, cards: [2, 2, 1, 1, 1] },
  { words: [120, 40, 640, 200], total: 9, cards: [2, 1, 4, 2] },
  { words: [1, 2, 3, 4, 5, 6], total: 30, cards: [2, 3, 4, 6, 7, 8] },
  { words: [300, 100], total: 13, cards: [9, 4] },
  { words: Array(40).fill(50), total: 30, cards: [...Array(10).fill(0), ...Array(30).fill(1)] },
  { words: [250, 250, 250, 250], total: 10, cards: [2, 2, 3, 3] },
  { words: [333, 333, 334], total: 8, cards: [2, 3, 3] },
];

const secs = (words) => words.map((w, i) => ({ title: `S${i}`, page_start: i + 1, page_end: i + 1, words: w }));

// A realistic analyze response (shape from views.analyze / analyze_document).
function stats({ sections = [[1, 4, 400, 1], [5, 5, 120, 1], [6, 6, 130, 1]], rec = 3, lo = 3, hi = 4 } = {}) {
  return {
    pages: 6,
    words: sections.reduce((s, x) => s + x[2], 0),
    words_per_page: [100, 100, 100, 100, 120, 130],
    sections_count: sections.length,
    toc_sections: [],
    recommended_cards: rec,
    suggested_range: { lo, hi },
    per_section_allocation: sections.map(([a, b, w, c], i) => ({
      title: ["Cells", "Photosynthesis", "Cellular Respiration", "Genetics", "Ecology"][i] ?? `Section ${i + 1}`,
      page_start: a,
      page_end: b,
      words: w,
      cards: c,
    })),
  };
}

function ready(s = stats()) {
  let st = planReducer(initialPlanState, { type: "pick", file: { name: "bio.pdf", uri: "blob:x" }, requestId: 1 });
  st = planReducer(st, { type: "analyzed", requestId: 1, stats: s });
  return st;
}
const cardsOf = (st) => st.sections.map((s) => s.cards);
const sumCards = (st) => cardsOf(st).reduce((a, b) => a + b, 0);

// ── backend rule mirror ─────────────────────────────────────────────────────
test("roundHalfEven matches Python round()", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 3.5, 2.4, 2.6, 0].map(roundHalfEven), [0, 2, 2, 4, 2, 3, 0]);
});

test("shareAllocation reproduces the backend allocation for every fixture", () => {
  for (const { words, total, cards } of BACKEND_ALLOCATIONS) {
    assert.deepEqual(shareAllocation(secs(words), total), cards, `words=${words} total=${total}`);
  }
});

test("capAllocation keeps the total and never exceeds 8 per section", () => {
  assert.deepEqual(capAllocation([5, 8, 11]), [8, 8, 8]);
  assert.deepEqual(capAllocation([5, 6, 11]), [7, 7, 8]);
  assert.deepEqual(capAllocation([9, 4]), [8, 5]);
  for (const { cards } of BACKEND_ALLOCATIONS) {
    const capped = capAllocation(cards);
    const total = cards.reduce((a, b) => a + b, 0);
    if (total <= 8 * cards.length) {
      assert.equal(capped.reduce((a, b) => a + b, 0), total);
      assert.ok(capped.every((c) => c <= 8));
    }
  }
});

test("maxTotalFor: 8 per section, 30 per deck, never below 3", () => {
  assert.equal(maxTotalFor(0), 30);
  assert.equal(maxTotalFor(1), 8);
  assert.equal(maxTotalFor(2), 16);
  assert.equal(maxTotalFor(4), 30);
  assert.equal(maxTotalFor(40), 30);
});

// ── analysis → snapshot ─────────────────────────────────────────────────────
test("analysis keeps real page ranges and snapshots the recommendation", () => {
  const st = ready();
  assert.equal(st.status, "ready");
  assert.equal(st.total, 3);
  assert.deepEqual(
    st.sections.map((s) => [s.title, s.page_start, s.page_end, s.cards]),
    [["Cells", 1, 4, 1], ["Photosynthesis", 5, 5, 1], ["Cellular Respiration", 6, 6, 1]]
  );
  assert.deepEqual(st.recommendation, { total: 3, range: { lo: 3, hi: 4 }, cards: [1, 1, 1] });
  assert.equal(st.manual, false);
  assert.equal(isChangedFromRecommendation(st), false);
});

test("stale analysis results (older request id) are ignored", () => {
  let st = planReducer(initialPlanState, { type: "pick", file: { name: "a.pdf" }, requestId: 1 });
  st = planReducer(st, { type: "pick", file: { name: "b.pdf" }, requestId: 2 });
  const after = planReducer(st, { type: "analyzed", requestId: 1, stats: stats() });
  assert.equal(after, st);
  assert.equal(planReducer(st, { type: "analyzeFailed", requestId: 1, error: {} }), st);
});

test("no-outline PDF: total only, empty allocations", () => {
  const st = ready({ ...stats({ sections: [], rec: 7, lo: 5, hi: 9 }) });
  assert.equal(st.total, 7);
  assert.deepEqual(st.sections, []);
  assert.deepEqual(buildParams(st), { cardsWanted: 7, allocations: [] });
  const moved = planReducer(st, { type: "setTotal", total: 12 });
  assert.equal(moved.total, 12);
  assert.equal(planReducer(moved, { type: "reset" }).total, 7);
});

// ── reset to recommendation (verified F0 bug) ───────────────────────────────
test("reset restores the recommended total and per-section allocation after slider moves", () => {
  let st = ready();
  st = planReducer(st, { type: "setTotal", total: 12 });
  assert.equal(st.total, 12);
  assert.notDeepEqual(cardsOf(st), [1, 1, 1]);
  assert.equal(isChangedFromRecommendation(st), true);
  st = planReducer(st, { type: "reset" });
  assert.equal(st.total, 3);
  assert.deepEqual(cardsOf(st), [1, 1, 1]);
  assert.equal(st.manual, false);
  assert.equal(isChangedFromRecommendation(st), false);
});

test("reset restores the plan after manual section edits and re-enables the slider", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 0, delta: +3 });
  st = planReducer(st, { type: "setSectionCards", index: 2, value: "0" });
  assert.deepEqual(cardsOf(st), [4, 1, 0]);
  assert.equal(st.manual, true);
  st = planReducer(st, { type: "reset" });
  assert.deepEqual(cardsOf(st), [1, 1, 1]);
  assert.equal(st.total, 3);
  assert.equal(st.manual, false);
  // slider works again
  st = planReducer(st, { type: "setTotal", total: 6 });
  assert.equal(st.total, 6);
  assert.equal(sumCards(st), 6);
});

test("reset is a real state change (not setCardsWanted(prev => prev))", () => {
  const changed = planReducer(ready(), { type: "setTotal", total: 9 });
  const reset = planReducer(changed, { type: "reset" });
  assert.notEqual(reset, changed);
  assert.notEqual(reset.total, changed.total);
});

// ── redistribution and manual preservation ──────────────────────────────────
test("slider redistributes by the backend rule and the plan sum always equals the total", () => {
  let st = ready(stats({ sections: [[1, 2, 100, 1], [3, 4, 200, 1], [5, 6, 300, 1]] }));
  for (let t = 3; t <= 24; t++) {
    st = planReducer(st, { type: "setTotal", total: t });
    assert.equal(st.total, t);
    assert.equal(sumCards(st), t, `total ${t}`);
    assert.ok(cardsOf(st).every((c) => c <= 8));
  }
  st = planReducer(st, { type: "setTotal", total: 12 });
  assert.deepEqual(cardsOf(st), [3, 4, 5]); // backend fixture
  // back at the recommendation → the exact snapshot
  st = planReducer(st, { type: "setTotal", total: 3 });
  assert.deepEqual(cardsOf(st), [1, 1, 1]);
});

test("slider is clamped to 3..min(30, 8 × sections)", () => {
  const one = ready(stats({ sections: [[1, 3, 881, 3]] }));
  assert.equal(planReducer(one, { type: "setTotal", total: 30 }).total, 8);
  assert.equal(planReducer(one, { type: "setTotal", total: 1 }).total, 3);
  const many = ready();
  assert.equal(planReducer(many, { type: "setTotal", total: 99 }).total, 24);
});

test("manual edits are never overwritten by the slider", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 1, delta: +2 });
  assert.equal(st.manual, true);
  const before = st;
  st = planReducer(st, { type: "setTotal", total: 20 });
  assert.equal(st, before);
  assert.deepEqual(cardsOf(st), [1, 3, 1]);
});

test("manual edits update the total deterministically", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 0, delta: +1 });
  assert.equal(st.total, 4);
  st = planReducer(st, { type: "setSectionCards", index: 2, value: "5" });
  assert.equal(st.total, 8);
  assert.deepEqual(cardsOf(st), [2, 1, 5]);
});

test("section edits clamp to 0..8 and keep the deck at ≤ 30", () => {
  let st = ready(stats({ sections: [[1, 1, 10, 1], [2, 2, 10, 1], [3, 3, 10, 1], [4, 4, 10, 1], [5, 6, 10, 0]], rec: 4 }));
  assert.equal(st.total, 4);
  st = planReducer(st, { type: "setSectionCards", index: 0, value: "12" });
  assert.equal(cardsOf(st)[0], 8);
  st = planReducer(st, { type: "bumpSection", index: 0, delta: -20 });
  assert.equal(cardsOf(st)[0], 0);
  st = planReducer(st, { type: "setSectionCards", index: 1, value: "abc" });
  assert.equal(cardsOf(st)[1], 0);
  for (const i of [0, 1, 2, 3]) st = planReducer(st, { type: "setSectionCards", index: i, value: "8" });
  assert.equal(st.total, 30);
  assert.deepEqual(cardsOf(st), [8, 8, 8, 6, 0]); // the last one capped at 6 so the deck stays at 30
  const full = planReducer(st, { type: "bumpSection", index: 4, delta: +1 });
  assert.equal(full, st); // no room left
});

test("editing back to the recommendation clears the manual flag", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 0, delta: +1 });
  assert.equal(st.manual, true);
  st = planReducer(st, { type: "bumpSection", index: 0, delta: -1 });
  assert.equal(st.manual, false);
  assert.equal(isChangedFromRecommendation(st), false);
});

test("a new document discards manual choices; nothing else resets them", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 0, delta: +2 });
  st = planReducer(st, { type: "setTotal", total: 10 }); // ignored
  assert.deepEqual(cardsOf(st), [3, 1, 1]);
  st = planReducer(st, { type: "pick", file: { name: "other.pdf" }, requestId: 2 });
  assert.equal(st.status, "analyzing");
  assert.equal(st.manual, false);
  assert.deepEqual(st.sections, []);
});

// ── build gating and params ─────────────────────────────────────────────────
test("build is blocked until analysis succeeds and while the plan is under 3", () => {
  assert.equal(validatePlan(initialPlanState).ok, false);
  const analyzing = planReducer(initialPlanState, { type: "pick", file: { name: "a.pdf" }, requestId: 1 });
  assert.equal(validatePlan(analyzing).ok, false);
  const failed = planReducer(analyzing, { type: "analyzeFailed", requestId: 1, error: { title: "x" } });
  assert.equal(failed.status, "error");
  assert.equal(validatePlan(failed).ok, false);

  let st = ready();
  assert.deepEqual(validatePlan(st), { ok: true, reason: null });
  st = planReducer(st, { type: "setSectionCards", index: 0, value: "0" });
  assert.equal(st.total, 2);
  assert.equal(validatePlan(st).ok, false);
  assert.match(validatePlan(st).reason, /at least 3/);
});

test("buildParams keeps the allocations contract: title, real page range, cards", () => {
  let st = ready();
  st = planReducer(st, { type: "bumpSection", index: 1, delta: +1 });
  assert.deepEqual(buildParams(st), {
    cardsWanted: 4,
    allocations: [
      { title: "Cells", page_start: 1, page_end: 4, cards: 1 },
      { title: "Photosynthesis", page_start: 5, page_end: 5, cards: 2 },
      { title: "Cellular Respiration", page_start: 6, page_end: 6, cards: 1 },
    ],
  });
});

test("planSummary counts sections that get no cards", () => {
  let st = ready();
  st = planReducer(st, { type: "setSectionCards", index: 2, value: "0" });
  assert.deepEqual(planSummary(st), { total: 2, sectionCount: 3, sectionsWithCards: 2, sectionsWithout: 1 });
});

test("allocate uses the snapshot at the recommended total", () => {
  const rec = { total: 3, cards: [2, 0, 1] };
  assert.deepEqual(allocate(secs([1, 1, 1]), 3, rec), [2, 0, 1]);
  assert.deepEqual(allocate(secs([1, 1, 1]), 6, rec), [2, 2, 2]);
});

// ── honest page provenance ──────────────────────────────────────────────────
test("formatPageRange never invents page precision", () => {
  assert.equal(formatPageRange({ page_start: 1, page_end: 4 }), "Pages 1–4");
  assert.equal(formatPageRange({ page_start: 5, page_end: 5 }), "Page 5");
  assert.equal(formatPageRange({ page_start: 5, page_end: null }), "Page 5");
  assert.equal(formatPageRange({ page_start: null, page_end: null }), "Page unknown");
  assert.equal(formatPageRange({}), "Page unknown");
  assert.equal(formatPageRange({ page_start: 3, page_end: 4, page_source: "estimated" }), "About pages 3–4");
  assert.equal(formatPageRange({ page_start: 3, page_end: 3, page_source: "estimated" }), "About page 3");
  assert.equal(formatPageRange({ page_start: null, page_end: 4, page_source: "estimated" }), "Page unknown");
});

test("null page ranges pass through to the request untouched", () => {
  const s = stats();
  s.per_section_allocation[1] = { ...s.per_section_allocation[1], page_start: null, page_end: null, page_source: "estimated" };
  const st = ready(s);
  assert.equal(st.sections[1].page_start, null);
  assert.equal(st.sections[1].page_source, "estimated");
  assert.deepEqual(buildParams(st).allocations[1], { title: "Photosynthesis", page_start: null, page_end: null, cards: 1 });
});

test("limits are the backend's", () => {
  assert.deepEqual({ ...CARD_LIMITS }, { min: 3, max: 30, perSection: 8 });
});

test("formatters and the PDF guard", async () => {
  const { formatCount, formatFileSize, isPdfFile } = await import("../src/source/plan.js");
  assert.equal(formatCount(881), "881");
  assert.equal(formatCount(1234567), "1,234,567");
  assert.equal(formatFileSize(null), null);
  assert.equal(formatFileSize(800), "800 B");
  assert.equal(formatFileSize(840000), "820 KB");
  assert.equal(formatFileSize(1468006), "1.4 MB");
  assert.equal(isPdfFile({ name: "a.pdf", mimeType: "application/pdf" }), true);
  assert.equal(isPdfFile({ name: "A.PDF" }), true);
  assert.equal(isPdfFile({ name: "notes.txt", mimeType: "text/plain" }), false);
  assert.equal(isPdfFile({ name: "notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), false);
  assert.equal(isPdfFile({ name: "fake.pdf", mimeType: "image/png" }), false);
});
