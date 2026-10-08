// src/demo/demoSource.js
// The offline portfolio demo's deck source (F6). Pure: no React / React
// Native imports and no network or storage, so `npm test` drives it.
//
// It implements the same contract as the real `deckSource` in
// src/study/useDeck.js, from one fixture deck shaped exactly like the
// backend's responses (src/demo/fixture/harbor-point-deck.json):
//   loadHand(deckId)     → { items: hand }        (GET hand?order=doc&n=all)
//   loadToc(deckId)      → { items: toc }         (GET toc)
//   verifyDeck(deckId)   → { items: toc, droppedStaleHand: false }
//   loadIdentity(deckId) → { meta, template }     (resume entry + saved template)
//   loadTemplate(deckId) → template               (generate.template)
// Any other deck id behaves like the real server's 404 deck_not_found, so the
// screens' "missing" state is the only outcome; there is no fallback to the
// network. Every call returns a fresh copy, so a screen can't change the
// fixture for the next one.

import { RequestError } from "../source/api.js";

const copy = (x) => JSON.parse(JSON.stringify(x));

export function createDemoSource(fixture) {
  const deckId = fixture?.generate?.deck_id;
  if (typeof deckId !== "string" || !Array.isArray(fixture?.hand) || !Array.isArray(fixture?.toc)) {
    throw new Error("Demo fixture is missing generate.deck_id, hand or toc");
  }
  const own = (id) => id === deckId;
  const notFound = () =>
    new RequestError({ kind: "http", status: 404, code: "deck_not_found", detail: "Not the demo deck" });

  const list = (items) => async (id) => {
    if (!own(id)) throw notFound();
    return { items: copy(items), source: "fixture" };
  };

  return {
    deckId,
    loadHand: list(fixture.hand),
    loadToc: list(fixture.toc),
    verifyDeck: async (id) => {
      if (!own(id)) throw notFound();
      return { items: copy(fixture.toc), droppedStaleHand: false };
    },
    // What Build would have saved for resume (name = deck_name); no build
    // time, because the fixture wasn't built by a timed model run.
    loadIdentity: async (id) =>
      own(id)
        ? {
            meta: { deckId, name: fixture.plan?.deck_name ?? null, cardsCount: fixture.hand.length, buildMs: null },
            template: copy(fixture.template ?? null),
          }
        : { meta: null, template: null },
    loadTemplate: async (id) => (own(id) && fixture.template ? copy(fixture.template) : null),
  };
}

/** Replace the app's deck source with the demo's (only the demo entry calls this). */
export function installDemoSource(target, fixture) {
  const demo = createDemoSource(fixture);
  for (const k of ["loadHand", "loadToc", "verifyDeck", "loadIdentity", "loadTemplate"]) target[k] = demo[k];
  return demo;
}

// ── Facts the demo's source screen shows (derived, never hand-typed) ──────

const isPage = (p) => Number.isInteger(p) && p >= 1;

/** Section rows: title, real page range and how many cards came from it. */
export function demoSections(fixture) {
  const counts = new Map();
  for (const c of fixture.hand) counts.set(c.section, (counts.get(c.section) ?? 0) + 1);
  return (fixture.template?.sections ?? []).map((s) => ({
    title: s.title,
    page_start: s.page_start,
    page_end: s.page_end,
    page_source: s.page_source,
    cards: counts.get(s.title) ?? 0,
  }));
}

/** How many cards have an exact page vs. an unknown one. */
export function provenanceCounts(fixture) {
  const exact = fixture.hand.filter((c) => isPage(c.page)).length;
  return { total: fixture.hand.length, exact, unknown: fixture.hand.length - exact };
}

/**
 * One worked "source → card" example: the first card whose excerpt appears
 * verbatim in its page's text, split around the excerpt for highlighting.
 */
export function groundingExample(fixture) {
  const pages = new Map((fixture.document?.pages ?? []).map((p) => [p.page, p.text]));
  for (const card of fixture.hand) {
    const text = pages.get(card.page);
    if (!isPage(card.page) || !text || !card.excerpt) continue;
    const paragraph = text.split(/\n\s*\n/).find((para) => para.includes(card.excerpt));
    if (!paragraph) continue;
    const at = paragraph.indexOf(card.excerpt);
    return {
      card,
      page: card.page,
      before: paragraph.slice(0, at),
      match: card.excerpt,
      after: paragraph.slice(at + card.excerpt.length),
    };
  }
  return null;
}
