// tests/studyDeck.test.mjs — F3 deck identity, load states, cache/validation
// (src/study/deck.js, src/study/deckApi.js).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deckStateFrom,
  deckSubtitle,
  describeDeckState,
  exportStem,
  formatBuildTime,
  indexForOrdinal,
  isStaleHand,
  isTrustworthyTitle,
  isValidDeckId,
  resolveDeckIdentity,
} from "../src/study/deck.js";
import {
  getJSON,
  handKey,
  handUrl,
  loadHand,
  loadToc,
  normalizeHand,
  tocKey,
  tocUrl,
  verifyDeck,
} from "../src/study/deckApi.js";
import { RequestError } from "../src/source/api.js";

const API = "http://127.0.0.1:8000";
const DID = "cA5OSbFx_UWsflkXNFyH-w"; // an opaque public deck id (backend F5)

// ── fakes ───────────────────────────────────────────────────────────────────
function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(k) {
      return data.has(k) ? data.get(k) : null;
    },
    async set(k, v) {
      data.set(k, v);
    },
    async del(k) {
      data.delete(k);
    },
  };
}

function response(status, body) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

/** fetch that answers by path, recording every URL. */
function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(url);
    const path = new URL(url).pathname;
    const r = routes[path];
    if (r instanceof Error) throw r;
    if (typeof r === "function") return r(url);
    if (!r) throw new TypeError("Failed to fetch");
    return response(r.status ?? 200, r.body);
  };
}

const card = (id, extra = {}) => ({ id, front: `Q${id}`, back: `A${id}`, excerpt: `E${id}`, page: id, section: "S", ...extra });
const tocRow = (id, ordinal) => ({ id, ordinal, front: `Q${id}`, section: "S", page: id, context: "" });

// ── identity / Picker title ────────────────────────────────────────────────
test("Picker title: the document name from resume metadata; the opaque id is never shown", () => {
  const id = resolveDeckIdentity({
    deckId: DID,
    meta: { deckId: DID, name: "Cell Biology Notes", cardsCount: 10, buildMs: 420 },
    template: { title: "Cell Biology Notes" },
  });
  assert.equal(id.displayTitle, "Cell Biology Notes");
  assert.equal(deckSubtitle(id, 10), "10 cards · Built in under a second");
  assert.ok(!JSON.stringify([id.displayTitle, deckSubtitle(id, 10)]).includes(DID));
});

test("Picker title: falls back to the saved template title, never another deck's metadata", () => {
  const id = resolveDeckIdentity({ deckId: 7, meta: { deckId: 3, name: "Other deck" }, template: { title: "uneven-toc" } });
  assert.equal(id.displayTitle, "uneven-toc");
  assert.equal(id.cardsCount, null);
});

test("Picker title: untrustworthy titles are not used and no name is invented", () => {
  for (const bad of ["tmpgy0tbwcp", "Deck 12", "Deck #12", "deck", "   ", "", null, 42]) {
    assert.equal(isTrustworthyTitle(bad), false, String(bad));
  }
  const id = resolveDeckIdentity({ deckId: DID, template: { title: "tmpgy0tbwcp" } });
  assert.equal(id.title, null);
  assert.equal(id.displayTitle, "Untitled deck");
  assert.equal(deckSubtitle(id), "");
});

test("build time: sub-second is 'under a second', never 0:00", () => {
  assert.equal(formatBuildTime(0), "Built in under a second");
  assert.equal(formatBuildTime(420), "Built in under a second");
  assert.equal(formatBuildTime(1000), "Built in 1 second");
  assert.equal(formatBuildTime(42_000), "Built in 42 seconds");
  assert.equal(formatBuildTime(125_000), "Built in 2 min 05 s");
  assert.equal(formatBuildTime(null), null);
  assert.equal(formatBuildTime(undefined), null);
  for (const ms of [0, 1, 999]) assert.ok(!formatBuildTime(ms).includes("0:00"));
});

test("route buildMs (fresh build) wins over saved metadata", () => {
  const id = resolveDeckIdentity({ deckId: 1, meta: { deckId: 1, buildMs: 99_000 }, buildMs: 300 });
  assert.equal(formatBuildTime(id.buildMs), "Built in under a second");
});

test("identity no longer guesses whether the deck should have cards (the server says)", () => {
  const id = resolveDeckIdentity({ deckId: DID, meta: { deckId: DID, cardsCount: 4 } });
  assert.equal("expectsCards" in id, false);
  assert.equal("idLabel" in id, false);
});

test("deck ids are the server's opaque public ids", () => {
  assert.ok(isValidDeckId(DID));
  assert.ok(isValidDeckId("A".repeat(16)) && isValidDeckId("a-b_c".repeat(6)));
  // Integer ids (pre-F5) and anything that isn't a public id are refused.
  for (const bad of [3, "12", 0, -1, 1.5, "", "abc", "x".repeat(40), "has spaces 12345678", "../../etc/passwd!", null, undefined, NaN]) {
    assert.equal(isValidDeckId(bad), false, String(bad));
  }
});

// ── load states ─────────────────────────────────────────────────────────────
test("load states: ready / empty / missing / error reasons / aborted ignored", () => {
  assert.equal(deckStateFrom({ items: [card(1)] }).status, "ready");
  assert.equal(deckStateFrom({ items: [] }).status, "empty");
  assert.deepEqual(deckStateFrom({ error: new RequestError({ kind: "http", status: 404, code: "deck_not_found" }) }), { status: "missing" });
  assert.deepEqual(deckStateFrom({ error: new RequestError({ kind: "http", status: 429, retryAfter: 120 }) }),
    { status: "error", reason: "busy", httpStatus: 429, retryAfter: 120 });
  assert.deepEqual(deckStateFrom({ error: new RequestError({ kind: "network" }) }), { status: "error", reason: "network", httpStatus: null });
  assert.deepEqual(deckStateFrom({ error: new RequestError({ kind: "http", status: 500 }) }), { status: "error", reason: "http", httpStatus: 500 });
  assert.equal(deckStateFrom({ error: new RequestError({ kind: "response" }) }).reason, "malformed");
  assert.equal(deckStateFrom({ items: { not: "a list" } }).reason, "malformed");
  assert.equal(deckStateFrom({ error: new RequestError({ kind: "aborted" }) }), null);
});

test("state copy is human and never carries server text", () => {
  const err = deckStateFrom({ error: new RequestError({ kind: "http", status: 500, detail: "Traceback C:\\tmp\\x.py" }) });
  const copy = describeDeckState(err);
  assert.equal(copy.title, "The server couldn't load this deck");
  assert.equal(copy.detail, "Server response: HTTP 500");
  assert.ok(!JSON.stringify(copy).includes("Traceback"));
  assert.match(describeDeckState({ status: "missing" }).title, /no longer available/);
  assert.match(describeDeckState({ status: "missing" }).message, /server doesn't have this deck/);
  assert.equal(describeDeckState({ status: "empty" }).title, "This deck has no cards");
  assert.match(describeDeckState({ status: "empty" }).message, /exists on the server/);
  const busy = describeDeckState({ status: "error", reason: "busy", retryAfter: 120 });
  assert.equal(busy.title, "The server is busy");
  assert.match(busy.message, /in about 2 minutes/);
  assert.equal(describeDeckState({ status: "error", reason: "no-deck" }).title, "No deck selected");
  assert.equal(describeDeckState({ status: "error", reason: "network" }).title, "Couldn't reach the flashcard server");
});

test("ordinals and stale-hand detection", () => {
  assert.equal(indexForOrdinal(1, 5), 0);
  assert.equal(indexForOrdinal("5", 5), 4);
  assert.equal(indexForOrdinal(6, 5), null);
  assert.equal(indexForOrdinal(0, 5), null);
  assert.equal(indexForOrdinal(null, 5), null);
  assert.equal(isStaleHand([card(1), card(2)], [tocRow(1, 1), tocRow(2, 2)]), false);
  assert.equal(isStaleHand([card(1), card(2)], [tocRow(9, 1), tocRow(10, 2)]), true);
  assert.equal(isStaleHand([card(1)], [tocRow(1, 1), tocRow(2, 2)]), true);
});

test("export file names use the deck title, else a short deck-<id> prefix", () => {
  assert.equal(exportStem({ title: "Cell Biology: Notes (v2)", deckId: DID }), "Cell-Biology-Notes-v2");
  assert.equal(exportStem({ title: null, deckId: DID }), "deck-cA5OSbFx");
  assert.equal(exportStem({ title: "///", deckId: DID }), "deck-cA5OSbFx");
  assert.equal(exportStem({ title: null, deckId: null }), "deck-cards");
});

// ── request contract ────────────────────────────────────────────────────────
test("hand/toc URLs are the existing contract (deck_id carries the public id)", () => {
  assert.equal(handUrl(API, DID), `${API}/api/flashcards/hand/?deck_id=${DID}&n=all&order=doc`);
  assert.equal(tocUrl(API, DID), `${API}/api/flashcards/toc/?deck_id=${DID}`);
  assert.equal(handUrl(API, 7), `${API}/api/flashcards/hand/?deck_id=7&n=all&order=doc`);
  assert.equal(tocUrl(API, 7), `${API}/api/flashcards/toc/?deck_id=7`);
  assert.equal(handKey(7), "deck:7:hand:doc:all");
  assert.equal(tocKey(7), "deck:7:toc");
});

test("getJSON maps failures to RequestError kinds", async () => {
  await assert.rejects(getJSON({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); }, url: API }), { kind: "network" });
  await assert.rejects(getJSON({ fetchImpl: async () => response(500, "boom"), url: API }), { kind: "http", status: 500 });
  await assert.rejects(getJSON({ fetchImpl: async () => response(200, "<html>"), url: API }), { kind: "response" });
  const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
  await assert.rejects(getJSON({ fetchImpl: async () => { throw abort; }, url: API }), { kind: "aborted" });
});

test("a server that never answers times out as a network error (no endless spinner)", async () => {
  let fire = null;
  const hang = (url, init) => new Promise(() => {}); // ignores abort, never settles
  const p = getJSON({ fetchImpl: hang, url: API, timeoutMs: 20_000, setTimer: (fn) => ((fire = fn), 1), clearTimer: () => {} });
  fire();
  await assert.rejects(p, { kind: "network", detail: "No response after 20 s" });
  assert.equal(deckStateFrom({ error: await p.catch((e) => e) }).reason, "network");
});

test("an unmount abort is reported as aborted (ignored), not as an error", async () => {
  const ctrl = new AbortController();
  const fetchImpl = (url, init) =>
    new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("x"), { name: "AbortError" }))));
  const p = getJSON({ fetchImpl, url: API, signal: ctrl.signal });
  ctrl.abort();
  const err = await p.catch((e) => e);
  assert.equal(err.kind, "aborted");
  assert.equal(deckStateFrom({ error: err }), null);
});

test("malformed card payloads are rejected, partial junk filtered", () => {
  assert.equal(normalizeHand({ detail: "x" }), null);
  assert.equal(normalizeHand([{ nope: 1 }]), null);
  assert.deepEqual(normalizeHand([card(1), null, { front: 1 }]).map((c) => c.id), [1]);
  assert.deepEqual(normalizeHand([]), []);
});

// ── cache precedence ────────────────────────────────────────────────────────
test("hand: a cached non-empty hand is used with zero requests", async () => {
  const calls = [];
  const store = memoryStore({ [handKey(7)]: [card(1), card(2)] });
  const { items, source } = await loadHand({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({}, calls) });
  assert.equal(source, "cache");
  assert.equal(items.length, 2);
  assert.equal(calls.length, 0);
});

test("empty deck: [] is not cached, and a cached [] never pins an empty state", async () => {
  const calls = [];
  const store = memoryStore({ [handKey(7)]: [] }); // written by the pre-F3 fetchWithCache
  const fetchImpl = fakeFetch({ "/api/flashcards/hand/": { body: [] } }, calls);
  const { items } = await loadHand({ apiBase: API, deckId: 7, store, fetchImpl });
  assert.deepEqual(items, []);
  assert.equal(calls.length, 1, "asked the server instead of trusting a cached []");
  assert.equal(store.data.has(handKey(7)), false);
  assert.equal(deckStateFrom({ items }).status, "empty");
});

test("hand: a fetched deck is cached for next time", async () => {
  const calls = [];
  const store = memoryStore();
  const fetchImpl = fakeFetch({ "/api/flashcards/hand/": { body: [card(1)] } }, calls);
  await loadHand({ apiBase: API, deckId: 7, store, fetchImpl });
  const again = await loadHand({ apiBase: API, deckId: 7, store, fetchImpl });
  assert.equal(again.source, "cache");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls, [`${API}/api/flashcards/hand/?deck_id=7&n=all&order=doc`]);
});

test("retry (force) asks the server even with a cache", async () => {
  const calls = [];
  const store = memoryStore({ [tocKey(7)]: [tocRow(1, 1)] });
  await loadToc({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({ "/api/flashcards/toc/": { body: [tocRow(1, 1)] } }, calls), force: true });
  assert.equal(calls.length, 1);
});

test("malformed server response is an error, not an empty deck", async () => {
  const store = memoryStore();
  await assert.rejects(
    loadHand({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({ "/api/flashcards/hand/": { body: { detail: "nope" } } }) }),
    { kind: "response" }
  );
});

test("a storage failure never blocks loading", async () => {
  const broken = { get: async () => { throw new Error("quota"); }, set: async () => { throw new Error("quota"); }, del: async () => {} };
  const { items } = await loadHand({ apiBase: API, deckId: 7, store: broken, fetchImpl: fakeFetch({ "/api/flashcards/hand/": { body: [card(1)] } }) });
  assert.equal(items.length, 1);
});

// ── deck validation (Picker) ────────────────────────────────────────────────
const NOT_FOUND = { status: 404, body: { detail: "This deck doesn't exist on the server.", code: "deck_not_found" } };

test("missing deck (404): a stale cached hand cannot mask it; the check uses one toc request", async () => {
  const calls = [];
  const store = memoryStore({ [handKey(7)]: [card(1), card(2)], [tocKey(7)]: [tocRow(1, 1), tocRow(2, 2)] });
  const fetchImpl = fakeFetch({ "/api/flashcards/toc/": NOT_FOUND }, calls);
  const err = await verifyDeck({ apiBase: API, deckId: 7, store, fetchImpl }).catch((e) => e);
  assert.deepEqual(calls, [`${API}/api/flashcards/toc/?deck_id=7`]);
  assert.equal(err.code, "deck_not_found");
  assert.deepEqual(deckStateFrom({ error: err }), { status: "missing" });
  assert.equal(store.data.has(handKey(7)), false, "stale hand dropped");
  assert.equal(store.data.has(tocKey(7)), false, "stale toc dropped");
  // A study screen opened afterwards asks the server rather than the stale cache.
  const studyCalls = [];
  const after = await loadHand({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({ "/api/flashcards/hand/": NOT_FOUND }, studyCalls) })
    .catch((e) => e);
  assert.equal(studyCalls.length, 1);
  assert.deepEqual(deckStateFrom({ error: after }), { status: "missing" });
});

test("a study screen's 404 drops that deck's cached list (no ambiguity with an empty deck)", async () => {
  // Cache-first study only reaches the server without a usable copy;
  // forcing (Try again) with a cached hand shows the drop.
  const store = memoryStore({ [handKey(7)]: [card(1)], [tocKey(8)]: [tocRow(1, 1)] });
  const err = await loadHand({ apiBase: API, deckId: 7, store, force: true, fetchImpl: fakeFetch({ "/api/flashcards/hand/": NOT_FOUND }) })
    .catch((e) => e);
  assert.equal(err.status, 404);
  assert.equal(store.data.has(handKey(7)), false);
  assert.equal(store.data.has(tocKey(8)), true, "other decks untouched");
});

test("empty deck ([]): the deck exists with no cards; caches dropped, state is empty", async () => {
  const store = memoryStore({ [handKey(7)]: [card(1)], [tocKey(7)]: [tocRow(1, 1)] });
  const { items } = await verifyDeck({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({ "/api/flashcards/toc/": { body: [] } }) });
  assert.deepEqual(deckStateFrom({ items }), { status: "empty" });
  assert.equal(store.data.has(handKey(7)), false);
  assert.equal(store.data.has(tocKey(7)), false);
});

test("other server errors leave healthy cache alone", async () => {
  const store = memoryStore({ [handKey(7)]: [card(1)], [tocKey(7)]: [tocRow(1, 1)] });
  for (const status of [429, 500, 502]) {
    await assert.rejects(
      verifyDeck({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({ "/api/flashcards/toc/": { status, body: { detail: "x", code: "y" } } }) }),
      { kind: "http", status }
    );
  }
  assert.equal(store.data.get(handKey(7)).length, 1);
  assert.equal(store.data.get(tocKey(7)).length, 1);
});

test("reused deck id: a cached hand whose card ids differ is dropped", async () => {
  const store = memoryStore({ [handKey(7)]: [card(1), card(2)] });
  const { droppedStaleHand } = await verifyDeck({
    apiBase: API, deckId: 7, store,
    fetchImpl: fakeFetch({ "/api/flashcards/toc/": { body: [tocRow(50, 1), tocRow(51, 2)] } }),
  });
  assert.equal(droppedStaleHand, true);
  assert.equal(store.data.has(handKey(7)), false);
  assert.deepEqual(store.data.get(tocKey(7)).map((r) => r.id), [50, 51]);
});

test("healthy deck: the cached hand is kept", async () => {
  const store = memoryStore({ [handKey(7)]: [card(1), card(2)] });
  const { items, droppedStaleHand } = await verifyDeck({
    apiBase: API, deckId: 7, store,
    fetchImpl: fakeFetch({ "/api/flashcards/toc/": { body: [tocRow(1, 1), tocRow(2, 2)] } }),
  });
  assert.equal(items.length, 2);
  assert.equal(droppedStaleHand, false);
  assert.equal(store.data.get(handKey(7)).length, 2);
});

test("network failure during the check leaves healthy cache alone", async () => {
  const store = memoryStore({ [handKey(7)]: [card(1)], [tocKey(7)]: [tocRow(1, 1)] });
  await assert.rejects(verifyDeck({ apiBase: API, deckId: 7, store, fetchImpl: fakeFetch({}) }), { kind: "network" });
  assert.equal(store.data.get(handKey(7)).length, 1);
  assert.equal(store.data.get(tocKey(7)).length, 1);
});
