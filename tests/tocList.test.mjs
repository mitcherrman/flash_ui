// tests/tocList.test.mjs — F4 TOC rows, search and current-card positioning.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CURRENT_ROW_VIEW_POSITION,
  currentRowIndex,
  filterTocRows,
  initialRenderCount,
  scrollAfterQueryChange,
  tocCountLine,
  tocRows,
} from "../src/study/tocList.js";

// A 30-card deck (the backend's maximum) in three sections.
const DECK = Array.from({ length: 30 }, (_, i) => ({
  id: 100 + i,
  ordinal: i + 1,
  front: `Question ${i + 1} about ${i < 10 ? "cells" : i < 20 ? "photosynthesis" : "respiration"}`,
  section: i < 10 ? "Cells" : i < 20 ? "Photosynthesis" : "Cellular Respiration",
  page: i < 25 ? 1 + Math.floor(i / 5) : null,
}));

test("rows keep the server ordinal, else document position", () => {
  const rows = tocRows(DECK);
  assert.equal(rows.length, 30);
  assert.equal(rows[24].ordinal, 25);
  const noOrd = tocRows([{ front: "a" }, { front: "b", ordinal: 0 }, { front: "c", ordinal: 7 }]);
  assert.deepEqual(noOrd.map((r) => r.ordinal), [1, 2, 7]);
  assert.deepEqual(tocRows(null), []);
});

test("search: section or question, case-insensitive; filtering keeps ordinals", () => {
  const rows = tocRows(DECK);
  assert.equal(filterTocRows(rows, "").length, 30);
  assert.equal(filterTocRows(rows, "   ").length, 30);
  const resp = filterTocRows(rows, "RESPIRATION");
  assert.equal(resp.length, 10);
  assert.equal(resp[0].ordinal, 21, "a filtered row still opens its own card");
  assert.equal(filterTocRows(rows, "question 7").length, 1);
  assert.equal(filterTocRows(rows, "zzz").length, 0);
});

test("current card index, including rows far beyond the first render batch", () => {
  const rows = tocRows(DECK);
  assert.equal(currentRowIndex(rows, 25), 24, "card 25 of 30 (not among the first 10 rendered)");
  assert.equal(currentRowIndex(rows, "25"), 24, "route params may carry strings");
  assert.equal(currentRowIndex(rows, 1), 0);
  assert.equal(currentRowIndex(rows, null), null, "opened from the Picker: no current card");
  assert.equal(currentRowIndex(rows, 99), null);
  assert.equal(currentRowIndex(rows, "x"), null);
  const filtered = filterTocRows(rows, "cells");
  assert.equal(currentRowIndex(filtered, 25), null, "current card filtered out");
});

test("the first render batch already includes the current row", () => {
  assert.equal(initialRenderCount(30, null), 10, "Picker: default batch, list at the top");
  assert.ok(initialRenderCount(30, 24) >= 25);
  assert.equal(initialRenderCount(30, 28), 30);
  assert.equal(initialRenderCount(4, 3), 4);
  assert.equal(initialRenderCount(0, null), 0);
});

test("search and auto-scroll don't fight; clearing restores the current card", () => {
  assert.equal(scrollAfterQueryChange("", "", 24), null, "no change → leave the list alone");
  assert.equal(scrollAfterQueryChange("re", "re ", 24), null, "whitespace isn't a new search");
  assert.deepEqual(scrollAfterQueryChange("", "r", 24), { to: "top" }, "typing: results from the top");
  assert.deepEqual(scrollAfterQueryChange("r", "re", 24), { to: "top" });
  assert.deepEqual(scrollAfterQueryChange("resp", "", 24), { to: "index", index: 24 }, "cleared → back to the current card");
  assert.deepEqual(scrollAfterQueryChange("resp", "", null), { to: "top" }, "cleared, no current card → top");
  assert.ok(CURRENT_ROW_VIEW_POSITION > 0 && CURRENT_ROW_VIEW_POSITION < 0.5, "context above the current row");
});

test("count line", () => {
  assert.equal(tocCountLine(30, 30, ""), "30 cards in document order");
  assert.equal(tocCountLine(1, 1, ""), "1 card in document order");
  assert.equal(tocCountLine(2, 30, "resp"), "2 of 30 cards match");
});
