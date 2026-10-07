// src/study/deck.js
// Deck identity and load-state rules for the study screens (F3).
// Pure: no React / React Native imports, so `npm test` covers it.
//
// The backend cannot tell "deck deleted" from "deck has no cards": `hand` and
// `toc` both answer 200 [] for an unknown deck id. A deck row is only created
// once cards exist (views.generate_deck), so in practice [] means the deck is
// not on this server. Local evidence (resume metadata or a saved template for
// this id) lets the UI say "no longer available" instead of a bare "empty".

import { formatDuration } from "../source/buildRun.js";

/** A usable deck id: a positive integer, as a number or numeric string. */
export function isValidDeckId(deckId) {
  if (typeof deckId === "number") return Number.isInteger(deckId) && deckId > 0;
  return typeof deckId === "string" && /^[1-9]\d*$/.test(deckId.trim());
}

/** Resume metadata that belongs to this deck, or null. */
export function metaForDeck(meta, deckId) {
  if (!meta || meta.deckId == null || deckId == null) return null;
  return String(meta.deckId) === String(deckId) ? meta : null;
}

// Pre-F0.5 decks were titled with the server's temp-file stem (tmpgy0tbwcp);
// the reconstructed fallback uses "Deck <id>". Neither is a document name.
const TEMP_STEM = /^tmp[a-z0-9_]{5,}$/i;
const GENERIC = /^deck(\s*#?\s*\d+)?$/i;

/** A title that names the document, not a server artefact. */
export function isTrustworthyTitle(title) {
  if (typeof title !== "string") return false;
  const t = title.trim();
  return t.length > 0 && !TEMP_STEM.test(t) && !GENERIC.test(t);
}

/**
 * What to call a deck. Resume metadata (the PDF's name, saved by Build) wins,
 * then the saved template's title (= deck_name since F0.5). Nothing is
 * invented: with neither, `title` is null and the UI says "Untitled deck".
 */
export function resolveDeckIdentity({ deckId, meta = null, template = null, buildMs = null } = {}) {
  const own = metaForDeck(meta, deckId);
  const candidates = [own?.name, template?.title];
  const title = candidates.find(isTrustworthyTitle)?.trim() ?? null;
  const ms = typeof buildMs === "number" ? buildMs : typeof own?.buildMs === "number" ? own.buildMs : null;
  const cardsCount = Number.isInteger(own?.cardsCount) ? own.cardsCount : null;
  return {
    deckId,
    title,
    displayTitle: title ?? "Untitled deck",
    idLabel: deckId != null ? `Deck #${deckId}` : null,
    cardsCount,
    buildMs: ms,
    /** True when this device has reason to believe the deck had cards. */
    expectsCards: (cardsCount ?? 0) > 0 || !!template,
  };
}

/** "Built in under a second" / "Built in 42 seconds" — never "0:00". */
export function formatBuildTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return null;
  return `Built in ${formatDuration(ms)}`;
}

/** Secondary line under the deck title. */
export function deckSubtitle(identity, cardCount = null) {
  const parts = [];
  const n = Number.isInteger(cardCount) ? cardCount : identity?.cardsCount;
  if (Number.isInteger(n)) parts.push(`${n} ${n === 1 ? "card" : "cards"}`);
  const built = formatBuildTime(identity?.buildMs);
  if (built) parts.push(built);
  if (identity?.idLabel) parts.push(identity.idLabel);
  return parts.join(" · ");
}

// ── load states ────────────────────────────────────────────────────────────
// loading | ready | empty | missing | error (reason: network | http | malformed | no-deck)

export const LOADING = Object.freeze({ status: "loading" });

/**
 * Normalise a load outcome into a state.
 *   { items }            → ready (non-empty) / missing or empty ([])
 *   { error }            → error with a reason; aborted → null (ignore)
 */
export function deckStateFrom({ items, error, expectsCards = false } = {}) {
  if (error) {
    if (error.kind === "aborted" || error.name === "AbortError") return null;
    const reason =
      error.kind === "http" ? "http" : error.kind === "response" ? "malformed" : "network";
    return { status: "error", reason, httpStatus: error.status ?? null };
  }
  if (!Array.isArray(items)) return { status: "error", reason: "malformed", httpStatus: null };
  if (items.length === 0) return { status: expectsCards ? "missing" : "empty" };
  return { status: "ready", items };
}

/** Human copy for a non-ready state. Never includes raw server text. */
export function describeDeckState(state, { deckId } = {}) {
  const ref = deckId != null ? `deck #${deckId}` : "this deck";
  switch (state?.status) {
    case "loading":
      return { title: "Loading deck…", message: "" };
    case "missing":
      return {
        title: "This saved deck is no longer available",
        message: `The server has no cards for ${ref}. It may have been deleted, or the server's data was reset. The copy saved on this device is out of date.`,
      };
    case "empty":
      return {
        title: "This deck has no cards",
        message: `The server returned no cards for ${ref}.`,
      };
    case "error":
      if (state.reason === "no-deck") {
        return { title: "No deck selected", message: "Build a deck or resume one from the Upload screen." };
      }
      if (state.reason === "network") {
        return {
          title: "Couldn't reach the flashcard server",
          message: "Check that the server is running and reachable, then try again.",
        };
      }
      if (state.reason === "malformed") {
        return {
          title: "The server sent an unexpected response",
          message: "This deck couldn't be read. Try again, or go back to Upload.",
        };
      }
      return {
        title: "The server couldn't load this deck",
        message: "Try again in a moment.",
        detail: state.httpStatus ? `Server response: HTTP ${state.httpStatus}` : "",
      };
    default:
      return { title: "", message: "" };
  }
}

/** The deck's cards on the server differ from a cached hand (by id, in order). */
export function isStaleHand(cachedCards, serverItems) {
  if (!Array.isArray(cachedCards) || !Array.isArray(serverItems)) return false;
  if (cachedCards.length !== serverItems.length) return true;
  return cachedCards.some((c, i) => c?.id !== serverItems[i]?.id);
}

/** 1-based ordinal → index, or null when out of range. */
export function indexForOrdinal(ordinal, total) {
  const n = typeof ordinal === "number" ? ordinal : ordinal != null ? parseInt(String(ordinal), 10) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > total) return null;
  return n - 1;
}

/** Safe file stem for exports: the deck title, else deck-<id>. */
export function exportStem({ title, deckId }) {
  const slug = String(title || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return slug || `deck-${deckId}`;
}
