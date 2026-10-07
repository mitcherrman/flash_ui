// src/study/provenance.js
// Honest page/section wording and the source-reveal rule for study cards (F3).
// Pure: no React / React Native imports.
//
// Page policy (backend F0.5 §31.4): a card's `page` is an exact PDF page only
// when the pipeline could ground it, otherwise null. null is never shown as a
// page number. Section ranges come from the saved study template and carry
// `page_source` ("toc" | "page" | "estimated"); estimated ranges are
// qualified with "About".

import { formatPageRange } from "../source/plan.js";

const isPage = (p) => Number.isInteger(p) && p >= 1;

/** "Page 5" or "Page unknown". */
export function cardPageLabel(page) {
  return isPage(page) ? `Page ${page}` : "Page unknown";
}

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** The template section a card came from (cards carry the exact title). */
export function findSection(template, sectionTitle) {
  const want = norm(sectionTitle);
  if (!want || !Array.isArray(template?.sections)) return null;
  return template.sections.find((s) => norm(s?.title) === want) ?? null;
}

/** "Pages 1–4" / "Page 5" / "About pages 3–4", or null when the range is unknown. */
export function sectionRangeLabel(section) {
  // A rebuilt outline's range only spans its cards' pages: not a section range.
  if (!section || !isPage(section.page_start) || section.page_source === "cards") return null;
  return formatPageRange(section);
}

/**
 * Everything the source panel shows for a card.
 *   pageLabel   – the card's own page ("Page 5" / "Page unknown")
 *   rangeLabel  – the originating section's range, shown only when the card's
 *                 page is unknown ("Section covers pages 1–4"), never as if
 *                 it were the card's page
 */
export function cardProvenance(card, template = null) {
  const section = typeof card?.section === "string" ? card.section.trim() : card?.section?.title ?? "";
  const pageLabel = cardPageLabel(card?.page);
  let rangeLabel = null;
  if (!isPage(card?.page)) {
    const range = sectionRangeLabel(findSection(template, section));
    if (range) rangeLabel = `Section covers ${range.charAt(0).toLowerCase()}${range.slice(1)}`;
  }
  const context = typeof card?.context === "string" ? card.context.trim() : "";
  return { section, pageLabel, rangeLabel, context };
}

export const SOURCE_HIDDEN_NOTE = "The source excerpt appears after you reveal the answer.";

/**
 * The source-reveal rule. Before the learner commits (flip, or an MC answer)
 * only section/page metadata may show: the excerpt is the passage the answer
 * was written from, so it usually contains the answer.
 *   revealed   – the answer has been shown on this card visit
 *   showSource – the learner's "Show source excerpt" preference
 */
export function sourceView({ card, revealed, showSource = true, limit = 360 }) {
  const raw = typeof card?.excerpt === "string" ? card.excerpt.trim() : "";
  if (!revealed) return { excerpt: null, note: raw ? SOURCE_HIDDEN_NOTE : null };
  if (!raw) return { excerpt: null, note: "No source excerpt was saved for this card." };
  if (!showSource) return { excerpt: null, note: null };
  return { excerpt: raw.length > limit ? `${raw.slice(0, limit - 1)}…` : raw, note: null };
}
