// src/study/deckApi.js
// Loading a deck's cards and table of contents (F3). Pure: `fetch` and the
// cache store are passed in, so `npm test` drives every path.
//
// Contract (backend F5):
//   GET /api/flashcards/hand/?deck_id&n=all&order=doc  → CardSerializer[]
//   GET /api/flashcards/toc/?deck_id                   → [{id, ordinal, front, section, page, context}]
// `deck_id` is the deck's opaque public id (from generate). An unknown deck
// is 404 `deck_not_found`; an existing deck with no cards is 200 [].
//
// Cache precedence (keys/TTL unchanged from F0 §11):
//   • hand / toc: a cached, NON-EMPTY list younger than 6 h is used first;
//     otherwise the server. Empty results are never cached, so a deck that
//     went missing can't be pinned as "empty" (or masked) for 6 hours.
//   • verifyDeck() (the Picker) always asks the server, refreshes the toc
//     cache, and drops a cached hand whose card ids no longer match.
//   • A 404 drops the cached list it was asked for (verifyDeck: both), so a
//     deck the server no longer has can't be studied from a stale copy.

import { RequestError, httpError } from "../source/api.js";
import { isStaleHand } from "./deck.js";

export const HAND_PATH = "/api/flashcards/hand/";
export const TOC_PATH = "/api/flashcards/toc/";
export const DECK_TTL_MS = 6 * 60 * 60 * 1000;

export const handKey = (deckId) => `deck:${deckId}:hand:doc:all`;
export const tocKey = (deckId) => `deck:${deckId}:toc`;

export function handUrl(apiBase, deckId) {
  const params = new URLSearchParams();
  params.set("deck_id", String(deckId));
  params.set("n", "all");
  params.set("order", "doc");
  return `${apiBase}${HAND_PATH}?${params.toString()}`;
}

export function tocUrl(apiBase, deckId) {
  return `${apiBase}${TOC_PATH}?deck_id=${encodeURIComponent(String(deckId))}`;
}

const isAbort = (e) => e?.name === "AbortError" || e?.kind === "aborted";

// A server that accepts the connection but never answers must not leave a
// study screen spinning: every GET gives up after this long.
export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * GET a JSON body or throw RequestError (network | http | response | aborted).
 * Times out after `timeoutMs` as a network error, even if the platform's
 * fetch ignores the abort signal.
 */
export async function getJSON({
  fetchImpl,
  url,
  signal,
  timeoutMs = REQUEST_TIMEOUT_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (h) => clearTimeout(h),
}) {
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const forward = () => ctrl?.abort();
  if (signal?.aborted) forward();
  signal?.addEventListener?.("abort", forward);
  let timer = null;
  const timeout = new Promise((_, reject) => {
    if (!(timeoutMs > 0)) return;
    timer = setTimer(() => {
      ctrl?.abort();
      reject(new RequestError({ kind: "network", detail: `No response after ${Math.round(timeoutMs / 1000)} s` }));
    }, timeoutMs);
  });
  const withTimeout = (p) => Promise.race([p, timeout]);

  try {
    let res;
    try {
      res = await withTimeout(fetchImpl(url, { signal: ctrl ? ctrl.signal : signal }));
    } catch (cause) {
      if (cause instanceof RequestError) throw cause;
      if (signal?.aborted || isAbort(cause)) throw new RequestError({ kind: "aborted", cause });
      throw new RequestError({ kind: "network", detail: String(cause?.message ?? cause), cause });
    }
    let body = "";
    try {
      body = await withTimeout(res.text());
    } catch (cause) {
      if (cause instanceof RequestError) throw cause;
      if (signal?.aborted || isAbort(cause)) throw new RequestError({ kind: "aborted", cause });
      throw new RequestError({ kind: "network", status: res.status, detail: String(cause?.message ?? cause), cause });
    }
    let json;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      if (!res.ok) throw httpError(res, null, body);
      throw new RequestError({ kind: "response", status: res.status, detail: "Response was not JSON" });
    }
    if (!res.ok) throw httpError(res, json, body);
    return json;
  } finally {
    if (timer != null) clearTimer(timer);
    signal?.removeEventListener?.("abort", forward);
  }
}

const isObj = (x) => !!x && typeof x === "object";

/** The server says this deck doesn't exist (as opposed to having no cards). */
export function isDeckNotFound(err) {
  return err?.kind === "http" && err.status === 404;
}

/** Cards with a question and an answer; null when the payload isn't a card list. */
export function normalizeHand(data) {
  if (!Array.isArray(data)) return null;
  const cards = data.filter((c) => isObj(c) && typeof c.front === "string" && typeof c.back === "string");
  return data.length && !cards.length ? null : cards;
}

/** TOC rows with a question; null when the payload isn't a TOC list. */
export function normalizeToc(data) {
  if (!Array.isArray(data)) return null;
  const rows = data.filter((r) => isObj(r) && typeof r.front === "string");
  return data.length && !rows.length ? null : rows;
}

async function quiet(fn) {
  try {
    return await fn();
  } catch {
    return undefined; // a storage failure never blocks studying
  }
}

/**
 * Cache-first load of a list. Returns { items, source: "cache" | "network" }.
 * `store` is { get(key), set(key, data, ttlMs), del(key) }.
 */
export async function loadList({ key, url, normalize, store, fetchImpl, signal, force = false }) {
  if (!force) {
    const cached = await quiet(() => store.get(key));
    const items = Array.isArray(cached) ? normalize(cached) : null;
    if (items && items.length) return { items, source: "cache" };
  }
  let data;
  try {
    data = await getJSON({ fetchImpl, url, signal });
  } catch (err) {
    if (isDeckNotFound(err)) await quiet(() => store.del(key));
    throw err;
  }
  const items = normalize(data);
  if (!items) throw new RequestError({ kind: "response", detail: "Unexpected response shape" });
  if (items.length) await quiet(() => store.set(key, items, DECK_TTL_MS));
  else await quiet(() => store.del(key));
  return { items, source: "network" };
}

export function loadHand({ apiBase, deckId, store, fetchImpl, signal, force }) {
  return loadList({ key: handKey(deckId), url: handUrl(apiBase, deckId), normalize: normalizeHand, store, fetchImpl, signal, force });
}

export function loadToc({ apiBase, deckId, store, fetchImpl, signal, force }) {
  return loadList({ key: tocKey(deckId), url: tocUrl(apiBase, deckId), normalize: normalizeToc, store, fetchImpl, signal, force });
}

/**
 * Ask the server whether the deck still exists (the Picker, before study).
 * `toc` is the narrowest endpoint: one row per card, no answers or excerpts.
 * Resolves to { items, droppedStaleHand }:
 *   • non-empty → refresh the toc cache; drop a cached hand whose ids differ
 *     (the deck was rebuilt, or a different server answered);
 *   • empty     → the deck exists but has no cards: drop both caches.
 * A 404 (the server doesn't have this deck) drops both caches and is thrown,
 * like any other failure; the caller maps it to the "missing" state.
 * Template/resume data is kept until the learner chooses "Forget this deck".
 */
export async function verifyDeck({ apiBase, deckId, store, fetchImpl, signal }) {
  let items;
  try {
    ({ items } = await loadToc({ apiBase, deckId, store, fetchImpl, signal, force: true }));
  } catch (err) {
    if (isDeckNotFound(err)) await quiet(() => store.del(handKey(deckId)));
    throw err;
  }
  let droppedStaleHand = false;
  if (items.length) {
    const cachedHand = await quiet(() => store.get(handKey(deckId)));
    if (Array.isArray(cachedHand) && isStaleHand(cachedHand, items)) {
      await quiet(() => store.del(handKey(deckId)));
      droppedStaleHand = true;
    }
  } else {
    await quiet(() => store.del(handKey(deckId)));
    droppedStaleHand = true;
  }
  return { items, droppedStaleHand };
}
