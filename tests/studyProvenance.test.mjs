// tests/studyProvenance.test.mjs — F3 source reveal and honest page wording
// (src/study/provenance.js, src/study/template.js).
import { test } from "node:test";
import assert from "node:assert/strict";

import { SOURCE_HIDDEN_NOTE, cardPageLabel, cardProvenance, sourceView } from "../src/study/provenance.js";
import { buildTemplateFromCards, isReconstructed, templateCounts, templateRangeLabel } from "../src/study/template.js";

// A card shaped like the backend's FakeOpenAI output: the excerpt is the
// sentence the answer came from, so it contains the answer verbatim.
const leaky = {
  id: 1,
  front: "What is the marker for page 3 item 2?",
  back: "token3x2",
  excerpt: "Fact P3-2: The marker for page 3 item 2 is token3x2.",
  section: "Cells",
  page: 3,
  context: "concept",
};

const template = {
  version: "study-template/llm-v1",
  title: "uneven-toc",
  sections: [
    { title: "Cells", page_start: 1, page_end: 4, page_source: "toc", items: [] },
    { title: "Photosynthesis", page_start: 5, page_end: 5, page_source: "toc", items: [] },
    { title: "Guesswork", page_start: 3, page_end: 4, page_source: "estimated", items: [] },
  ],
};

// ── source excerpt leak (verified bug) ──────────────────────────────────────
test("source excerpt is hidden before the answer is revealed", () => {
  const v = sourceView({ card: leaky, revealed: false });
  assert.equal(v.excerpt, null);
  assert.equal(v.note, SOURCE_HIDDEN_NOTE);
  // Nothing shown before reveal (metadata + note) contains the answer.
  const shown = [v.note, ...Object.values(cardProvenance(leaky, template))].join(" | ");
  assert.ok(!shown.includes(leaky.back), shown);
});

test("source excerpt is shown after reveal, as supporting evidence", () => {
  const v = sourceView({ card: leaky, revealed: true });
  assert.equal(v.excerpt, leaky.excerpt);
  assert.ok(v.excerpt.includes(leaky.back));
  assert.equal(v.note, null);
});

test("after reveal the learner can still hide the excerpt; long excerpts are clipped", () => {
  assert.equal(sourceView({ card: leaky, revealed: true, showSource: false }).excerpt, null);
  const long = { ...leaky, excerpt: "x".repeat(500) };
  const v = sourceView({ card: long, revealed: true, limit: 360 });
  assert.equal(v.excerpt.length, 360);
  assert.ok(v.excerpt.endsWith("…"));
});

test("cards without an excerpt say so after reveal and show no note before", () => {
  const bare = { ...leaky, excerpt: "" };
  assert.equal(sourceView({ card: bare, revealed: false }).note, null);
  assert.match(sourceView({ card: bare, revealed: true }).note, /No source excerpt/);
});

// ── honest page provenance ──────────────────────────────────────────────────
test("exact page: 'Page 5'", () => {
  assert.equal(cardPageLabel(5), "Page 5");
  assert.equal(cardProvenance({ ...leaky, page: 5 }, template).pageLabel, "Page 5");
  assert.equal(cardProvenance({ ...leaky, page: 5 }, template).rangeLabel, null, "no range when the page is exact");
});

test("unknown page is 'Page unknown', never page 1", () => {
  for (const p of [null, undefined, 0, -2, "5", 1.5, NaN]) {
    assert.equal(cardPageLabel(p), "Page unknown", String(p));
  }
  const pv = cardProvenance({ ...leaky, page: null, section: "Mixed topics" }, template);
  assert.equal(pv.pageLabel, "Page unknown");
  assert.equal(pv.rangeLabel, null, "Mixed topics has no section range");
  assert.ok(!JSON.stringify(pv).includes("Page 1"));
});

test("unknown card page in a known section: the section range, clearly labelled as such", () => {
  const pv = cardProvenance({ ...leaky, page: null }, template);
  assert.equal(pv.pageLabel, "Page unknown");
  assert.equal(pv.rangeLabel, "Section covers pages 1–4");
});

test("estimated section ranges are qualified with 'about'", () => {
  const pv = cardProvenance({ ...leaky, page: null, section: "Guesswork" }, template);
  assert.equal(pv.rangeLabel, "Section covers about pages 3–4");
});

test("single-page section range", () => {
  const pv = cardProvenance({ ...leaky, page: null, section: "  photosynthesis " }, template);
  assert.equal(pv.rangeLabel, "Section covers page 5");
});

// ── template ────────────────────────────────────────────────────────────────
test("rebuilt template keeps unknown pages unknown (pre-F3 used page 1)", () => {
  const tpl = buildTemplateFromCards(
    [
      { front: "q1", back: "a1", section: "Mixed topics", page: null },
      { front: "q2", back: "a2", section: "Cells", page: 2 },
      { front: "q3", back: "a3", section: "Cells", page: null },
      { front: "q4", back: "a4", section: "Cells", page: 4 },
    ],
    "uneven-toc"
  );
  assert.ok(isReconstructed(tpl));
  const mixed = tpl.sections.find((s) => s.title === "Mixed topics");
  assert.equal(mixed.page_start, null);
  assert.equal(mixed.items[0].page, null);
  assert.equal(templateRangeLabel(mixed), "Pages unknown");
  const cells = tpl.sections.find((s) => s.title === "Cells");
  assert.deepEqual([cells.page_start, cells.page_end], [2, 4]);
  assert.deepEqual(cells.items.map((i) => i.page), [2, null, 4]);
  assert.equal(templateRangeLabel(cells), "Cards from pages 2–4");
  assert.deepEqual(templateCounts(tpl), { sections: 2, points: 4 });
  // A rebuilt range is never presented as a section's page range on a card.
  assert.equal(cardProvenance({ section: "Cells", page: null }, tpl).rangeLabel, null);
});

test("template section ranges: real, estimated, unknown", () => {
  assert.equal(templateRangeLabel(template.sections[0]), "Pages 1–4");
  assert.equal(templateRangeLabel(template.sections[1]), "Page 5");
  assert.equal(templateRangeLabel(template.sections[2]), "About pages 3–4");
  assert.equal(templateRangeLabel({ page_start: null, page_end: null }), "Pages unknown");
});
