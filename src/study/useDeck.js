// src/study/useDeck.js
// The study screens' data seam (F3): deck cards, table of contents and the
// saved study template, each as an explicit load state.
//
//   const deck = useDeckHand(deckId);   // { status, items, retry, ... }
//   status: loading | ready | empty (deck has no cards) | missing (server 404)
//           | error (reason)
//
// All network/caching rules live in the pure ./deckApi.js and ./deck.js.
// `deckSource` is the only way the study screens get deck data. The normal
// app uses the network/cache implementation below; the offline portfolio
// demo (src/demo, a separate build) swaps in a fixture source.
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../config";
import { deckStore, loadLastDeck, loadTemplate } from "../utils/cache";
import { LOADING, deckStateFrom, isValidDeckId, resolveDeckIdentity } from "./deck";
import { loadHand, loadToc, verifyDeck } from "./deckApi";
import { buildTemplateFromCards } from "./template";

export const deckSource = {
  loadHand: (deckId, signal, force) =>
    loadHand({ apiBase: API_BASE, deckId, store: deckStore, fetchImpl: fetch, signal, force }),
  loadToc: (deckId, signal, force) =>
    loadToc({ apiBase: API_BASE, deckId, store: deckStore, fetchImpl: fetch, signal, force }),
  verifyDeck: (deckId, signal) =>
    verifyDeck({ apiBase: API_BASE, deckId, store: deckStore, fetchImpl: fetch, signal }),
  loadIdentity: async (deckId) => {
    const [meta, template] = await Promise.all([loadLastDeck(), loadTemplate(deckId)]);
    return { meta, template };
  },
  // The study template Build saved on this device (no network), or null.
  loadTemplate: (deckId) => loadTemplate(deckId),
};

const NO_DECK = Object.freeze({ status: "error", reason: "no-deck" });

function useDeckList(deckId, load) {
  const [state, setState] = useState(() => (isValidDeckId(deckId) ? LOADING : NO_DECK));
  const [attempt, setAttempt] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    if (!isValidDeckId(deckId)) {
      setState(NO_DECK);
      return undefined;
    }
    let alive = true;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const force = forceRef.current;
    forceRef.current = false;
    setState(LOADING);
    (async () => {
      let next;
      try {
        const { items } = await load(deckId, controller?.signal, force);
        next = deckStateFrom({ items });
      } catch (error) {
        next = deckStateFrom({ error });
        if (next && error?.kind !== "aborted") console.warn("[study] deck load failed", error);
      }
      if (alive && next) setState(next);
    })();
    return () => {
      alive = false;
      controller?.abort();
    };
  }, [deckId, attempt, load]);

  // Retry asks the server again rather than re-reading the cache.
  const retry = useCallback(() => {
    forceRef.current = true;
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, items: state.items ?? [], retry };
}

const handLoader = (id, signal, force) => deckSource.loadHand(id, signal, force);
const tocLoader = (id, signal, force) => deckSource.loadToc(id, signal, force);

export function useDeckHand(deckId) {
  return useDeckList(deckId, handLoader);
}

export function useDeckToc(deckId) {
  return useDeckList(deckId, tocLoader);
}

/**
 * The Picker's check that a saved deck still exists on the server, plus what
 * to call it. Always asks the server (never answered from cache).
 */
export function useDeckCheck(deckId, buildMsParam = null) {
  const [state, setState] = useState(() => (isValidDeckId(deckId) ? LOADING : NO_DECK));
  const [identity, setIdentity] = useState(() => resolveDeckIdentity({ deckId, buildMs: buildMsParam }));
  const [template, setTemplate] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { meta, template: tpl } = await deckSource.loadIdentity(deckId);
        if (!alive) return;
        setTemplate(tpl || null);
        setIdentity(resolveDeckIdentity({ deckId, meta, template: tpl, buildMs: buildMsParam }));
      } catch {
        // identity stays "Untitled deck"
      }
    })();
    return () => {
      alive = false;
    };
  }, [deckId, buildMsParam]);

  useEffect(() => {
    if (!isValidDeckId(deckId)) {
      setState(NO_DECK);
      return undefined;
    }
    let alive = true;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    setState(LOADING);
    (async () => {
      let next;
      try {
        const { items } = await deckSource.verifyDeck(deckId, controller?.signal);
        next = deckStateFrom({ items });
      } catch (error) {
        next = deckStateFrom({ error });
        if (next) console.warn("[study] deck check failed", error);
      }
      if (alive && next) setState(next);
    })();
    return () => {
      alive = false;
      controller?.abort();
    };
  }, [deckId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, items: state.items ?? [], identity, template, retry };
}

/** The template saved on this device for the deck (no network), or null. */
export function useSavedTemplate(deckId) {
  const [template, setTemplate] = useState(null);
  useEffect(() => {
    let alive = true;
    setTemplate(null);
    if (!isValidDeckId(deckId)) return undefined;
    deckSource
      .loadTemplate(deckId)
      .then((t) => alive && setTemplate(t || null))
      .catch(() => alive && setTemplate(null));
    return () => {
      alive = false;
    };
  }, [deckId]);
  return template;
}

/**
 * The template to show when the learner opens it: the saved one, else an
 * outline rebuilt from the deck's cards (cache-first, so usually no request).
 */
export async function loadTemplateForViewing(deckId, title = null) {
  const saved = await deckSource.loadTemplate(deckId);
  if (saved) return saved;
  const { items } = await deckSource.loadHand(deckId);
  return items.length ? buildTemplateFromCards(items, title) : null;
}
