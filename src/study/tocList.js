// src/study/tocList.js
// Table-of-contents rows, search and "where to scroll" decisions (F4).
// Pure: the TOC screen asks these functions what to do; FlatList does it.
//
// Positioning rules:
//   • Opened from a study screen: the current card is brought into view
//     once, without animation, about a third of the way down the list so
//     the cards before it stay visible.
//   • Opened from the Picker (no current card): the list starts at the top.
//   • Typing a search never scrolls to the current card (results start at
//     the top). Clearing the search returns to the current card, or to the
//     top when there is none.

/** Rows with a stable 1-based ordinal (the server's, else document position). */
export function tocRows(items) {
  return (Array.isArray(items) ? items : []).map((item, i) => ({
    item,
    ordinal: Number.isInteger(item?.ordinal) && item.ordinal > 0 ? item.ordinal : i + 1,
  }));
}

/** Same matching as before F4: section or question, case-insensitive substring. */
export function filterTocRows(rows, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    ({ item }) =>
      String(item?.section || "").toLowerCase().includes(needle) ||
      String(item?.front || "").toLowerCase().includes(needle)
  );
}

/** Index of the current card in a (possibly filtered) row list, or null. */
export function currentRowIndex(rows, currentOrdinal) {
  const ord = Number(currentOrdinal);
  if (currentOrdinal == null || !Number.isFinite(ord)) return null;
  const i = rows.findIndex((r) => r.ordinal === ord);
  return i === -1 ? null : i;
}

/** Where the current card should sit in the viewport (0 top … 1 bottom). */
export const CURRENT_ROW_VIEW_POSITION = 0.3;

/**
 * Scroll decision after the search text changes.
 * → { to: "index", index } | { to: "top" } | null (leave the list alone)
 */
export function scrollAfterQueryChange(prevQuery, nextQuery, currentIndexUnfiltered) {
  const prev = String(prevQuery ?? "").trim();
  const next = String(nextQuery ?? "").trim();
  if (prev === next) return null;
  if (!next) return currentIndexUnfiltered != null ? { to: "index", index: currentIndexUnfiltered } : { to: "top" };
  return { to: "top" };
}

/**
 * How many rows the list renders on its first pass, so the current row is
 * already laid out when we scroll to it (decks are at most 30 cards today;
 * the scroll also has a fallback for rows that are not rendered yet).
 */
export function initialRenderCount(total, currentIndex) {
  const base = 10;
  if (currentIndex == null) return Math.min(total, base);
  return Math.min(total, Math.max(base, currentIndex + 8));
}

/** Count line under the search field. */
export function tocCountLine(matchCount, total, query) {
  if (String(query ?? "").trim()) return `${matchCount} of ${total} cards match`;
  return `${total} ${total === 1 ? "card" : "cards"} in document order`;
}
