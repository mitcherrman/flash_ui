// src/study/deck.js
// Deck identity and load-state rules for the study screens (F3).
// Pure: no React / React Native imports, so `npm test` covers it.
//
// Deck ids (backend F5) are opaque public ids: 22 URL-safe characters from
// `generate`'s `deck_id`. The server's integer key is never exposed, so there
// is no human "Deck #N" any more. The server answers 404 for a deck it
// doesn't have and 200 [] for a deck with no cards, so "missing" and "empty"
// come straight from the response — no local guessing.

import { formatDuration } from "../source/buildRun.js";
import { waitPhrase } from "../source/api.js";

const PUBLIC_ID = /^[A-Za-z0-9_-]{16,32}$/;

/** A usable deck id: the server's opaque public id. */
export function isValidDeckId(deckId) {
  return typeof deckId === "string" && PUBLIC_ID.test(deckId);
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
    cardsCount,
    buildMs: ms,
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
  return parts.join(" · ");
}

// ── load states ────────────────────────────────────────────────────────────
// loading | ready | empty | missing | error (reason: network | busy | http | malformed | no-deck)

export const LOADING = Object.freeze({ status: "loading" });

/**
 * Normalise a load outcome into a state.
 *   { items }            → ready (non-empty) / empty ([]: the deck exists, no cards)
 *   { error }            → missing (HTTP 404), or error with a reason;
 *                          aborted → null (ignore)
 */
export function deckStateFrom({ items, error } = {}) {
  if (error) {
    if (error.kind === "aborted" || error.name === "AbortError") return null;
    if (error.kind === "http" && error.status === 404) return { status: "missing" };
    if (error.kind === "http" && error.status === 429) {
      return { status: "error", reason: "busy", httpStatus: 429, retryAfter: error.retryAfter ?? null };
    }
    const reason =
      error.kind === "http" ? "http" : error.kind === "response" ? "malformed" : "network";
    return { status: "error", reason, httpStatus: error.status ?? null };
  }
  if (!Array.isArray(items)) return { status: "error", reason: "malformed", httpStatus: null };
  if (items.length === 0) return { status: "empty" };
  return { status: "ready", items };
}

/** Human copy for a non-ready state. Never includes raw server text. */
export function describeDeckState(state) {
  switch (state?.status) {
    case "loading":
      return { title: "Loading deck…", message: "" };
    case "missing":
      return {
        title: "This saved deck is no longer available",
        message:
          "The server doesn't have this deck. It may have been deleted, the server's data may have been reset, or the app is connected to a different server. The copy saved on this device is out of date.",
      };
    case "empty":
      return {
        title: "This deck has no cards",
        message: "The deck exists on the server, but it has no cards to study.",
      };
    case "error":
      if (state.reason === "no-deck") {
        return { title: "No deck selected", message: "Build a deck or resume one from the Upload screen." };
      }
      if (state.reason === "busy") {
        return {
          title: "The server is busy",
          message: `Too many requests from this device. Try again ${waitPhrase(state.retryAfter)}.`,
        };
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

/** Safe file stem for exports: the deck title, else deck-<first 8 id characters>. */
export function exportStem({ title, deckId }) {
  const slug = String(title || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return slug || `deck-${String(deckId ?? "").slice(0, 8) || "cards"}`;
}
