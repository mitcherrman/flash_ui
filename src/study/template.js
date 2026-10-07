// src/study/template.js
// Study-template helpers (F3). Pure: no React / React Native imports.
//
// The template comes from the generate response and is saved per deck on
// this device by Build. When it isn't saved (another device, cleared
// storage), a readable outline is rebuilt from the deck's cards. The rebuilt
// outline keeps unknown pages unknown: before F3 it turned a missing page
// into "page 1" and a section with no known pages into "p.1".

import { formatPageRange } from "../source/plan.js";

export const RECONSTRUCTED_VERSION = "study-template/reconstructed-v1";

export function isReconstructed(template) {
  return template?.version === RECONSTRUCTED_VERSION;
}

const isPage = (p) => Number.isInteger(p) && p >= 1;

/** Outline from cards in document order, grouped by section (first appearance). */
export function buildTemplateFromCards(cards = [], title = null) {
  const bySection = new Map();
  for (const c of Array.isArray(cards) ? cards : []) {
    const sec = String(c?.section || "").trim() || "Untitled section";
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec).push(c);
  }

  const sections = [];
  const toc = [];
  let ordinal = 1;
  for (const [secTitle, arr] of bySection.entries()) {
    const pages = arr.map((x) => x?.page).filter(isPage);
    const ps = pages.length ? Math.min(...pages) : null;
    const pe = pages.length ? Math.max(...pages) : null;
    const firstOrd = ordinal;
    const items = arr.map((c) => {
      const item = {
        type: "concept",
        term: String(c?.front || "").trim(),
        definition: String(c?.back || "").trim(),
        page: isPage(c?.page) ? c.page : null,
        ordinal,
      };
      ordinal += 1;
      return item;
    });
    // The range spans only the pages of cards that could be grounded; it is
    // labelled as rebuilt from cards, not as the document's outline.
    sections.push({ title: secTitle, page_start: ps, page_end: pe, page_source: "cards", items });
    toc.push({ title: secTitle, page_start: ps, page_end: pe, ordinal_first: firstOrd });
  }

  return { version: RECONSTRUCTED_VERSION, title, pages: null, sections, toc };
}

/** Counts for the TemplateBar button. */
export function templateCounts(template) {
  const sections = Array.isArray(template?.sections) ? template.sections : [];
  const points = sections.reduce((n, s) => n + (Array.isArray(s?.items) ? s.items.length : 0), 0);
  return { sections: sections.length, points };
}

/**
 * Range line for a template section: "Pages 1–4", "About pages 3–4"
 * (estimated), "Cards from pages 1–2" (rebuilt outline) or "Pages unknown".
 */
export function templateRangeLabel(section) {
  if (!isPage(section?.page_start)) return "Pages unknown";
  const range = formatPageRange(section);
  if (section.page_source === "cards") return `Cards from ${range.charAt(0).toLowerCase()}${range.slice(1)}`;
  return range;
}
