// src/utils/cache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * VERSION: bump if you change cache format/shape.
 * Everything is namespaced under PREFIX so we can clear safely.
 */
const VERSION = 2;
const PREFIX = `fcache:v${VERSION}:`;

const LAST_DECK_KEY = `${PREFIX}lastDeckMeta`; // stores {deckId, name?, cardsCount?}

/* ---------------- helpers ---------------- */
const nsKey = (s) => `${PREFIX}${s}`;

async function _getRaw(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ---------------- generic KV with TTL ---------------- */
export async function setCache(k, data, ttlMs = 6 * 60 * 60 * 1000) {
  const payload = { savedAt: Date.now(), ttlMs, data };
  await AsyncStorage.setItem(nsKey(k), JSON.stringify(payload));
}

export async function getCache(k) {
  try {
    const obj = await _getRaw(nsKey(k));
    if (!obj) return null;
    const { savedAt, ttlMs, data } = obj;
    if (!savedAt || !ttlMs) return null;
    if (Date.now() - savedAt > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

export async function delCache(k) {
  try {
    await AsyncStorage.removeItem(nsKey(k));
  } catch {}
}

export async function clearAllCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((x) => x.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {}
}

/**
 * Fetch with cache:
 *  fetchWithCache({ key, fetcher, ttlMs?, force? })
 */
export async function fetchWithCache({ key, fetcher, ttlMs = 6 * 60 * 60 * 1000, force = false }) {
  if (!force) {
    const cached = await getCache(key);
    if (cached !== null && cached !== undefined) return cached;
  }
  const data = await fetcher();
  await setCache(key, data, ttlMs);
  return data;
}

/* ---------------- canonical cache keys ---------------- */
export function deckHandKey(deckId, order = "doc", n = "all") {
  return `deck:${deckId}:hand:${order}:${n}`;
}
export function deckTocKey(deckId) {
  return `deck:${deckId}:toc`;
}

/* ---------------- last deck meta (resume prompt) ---------------- */
const LAST_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function saveLastDeck(meta) {
  if (!meta || meta.deckId == null) return;
  const payload = { savedAt: Date.now(), ttlMs: LAST_TTL, data: meta };
  await AsyncStorage.setItem(LAST_DECK_KEY, JSON.stringify(payload));
}

export async function loadLastDeck() {
  try {
    const obj = await _getRaw(LAST_DECK_KEY);
    if (!obj) return null;
    const { savedAt, ttlMs, data } = obj;
    if (!savedAt || !ttlMs) return null;
    if (Date.now() - savedAt > ttlMs) {
      await AsyncStorage.removeItem(LAST_DECK_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Clear everything, including last-deck meta. */
export async function clearCache() {
  await clearAllCache(); // removes all PREFIXed entries (incl. LAST_DECK_KEY)
}
