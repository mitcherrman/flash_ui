// src/utils/cache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Bump when the cache's shape or key meaning changes; older versions are
// purged at start-up (purgeOldCacheVersions), never migrated.
// v3 (F5): deck ids are the server's opaque public ids. v2 keys and resume
// entries used integer ids that the server no longer accepts.
const VERSION = 3;
const PREFIX  = `fcache:v${VERSION}:`;

function key(s) { return `${PREFIX}${s}`; }

const LAST_DECK_KEY = key("last_deck_meta");

// ---------- generic ----------
export async function setCache(k, data, ttlMs = 6 * 60 * 60 * 1000) {
  const payload = { savedAt: Date.now(), ttlMs, data };
  await AsyncStorage.setItem(key(k), JSON.stringify(payload));
}

export async function getCache(k) {
  try {
    const raw = await AsyncStorage.getItem(key(k));
    if (!raw) return null;
    const { savedAt, ttlMs, data } = JSON.parse(raw);
    if (!savedAt || !ttlMs) return null;
    if (Date.now() - savedAt > ttlMs) return null;
    return data;
  } catch { return null; }
}

export async function delCache(k) {
  try { await AsyncStorage.removeItem(key(k)); } catch {}
}

// Removes every key written by an older cache version (other apps' keys
// and the current version are left alone). Safe to call on every start.
export async function purgeOldCacheVersions() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const old = keys.filter((k) => /^fcache:v\d+:/.test(k) && !k.startsWith(PREFIX));
    if (old.length) await AsyncStorage.multiRemove(old);
    return old.length;
  } catch {
    return 0; // storage trouble never blocks the app
  }
}

export async function clearAllCache() {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((x) => x.startsWith(PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}

// ---------- canonical keys for hands / toc ----------
export function deckHandKey(deckId, order = "doc", n = "all") {
  return `deck:${deckId}:hand:${order}:${n}`;
}
export function deckTocKey(deckId) {
  return `deck:${deckId}:toc`;
}

// ---------- fetch with cache ----------
export async function fetchWithCache({ key, fetcher, ttlMs = 6*60*60*1000, force = false }) {
  if (!force) {
    const cached = await getCache(key);
    if (cached) return cached;
  }
  const data = await fetcher();
  await setCache(key, data, ttlMs);
  return data;
}

// ---------- simple “resume last deck” meta ----------
export async function saveLastDeck({
  deckId,
  name,
  cardsCount = null,
  buildMs = null,
  builtAt = Date.now(),
  metrics = null,            // ← NEW: full server-side breakdown if available
}) {
  const meta = { deckId, name, cardsCount, buildMs, builtAt, metrics };
  await AsyncStorage.setItem(LAST_DECK_KEY, JSON.stringify(meta));
}

export async function loadLastDeck() {
  try {
    const raw = await AsyncStorage.getItem(LAST_DECK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Clear just the "resume last deck" entry AND all fcache:* entries
export async function clearCache() {
  try { await AsyncStorage.removeItem(LAST_DECK_KEY); } catch {}
  await clearAllCache();
}

// ---------- template cache (per deck) ----------
function tplKey(deckId) {
  return key(`template:${deckId}`);
}

export async function saveTemplate(deckId, templateObj) {
  try {
    await AsyncStorage.setItem(tplKey(deckId), JSON.stringify(templateObj || {}));
  } catch {}
}

export async function loadTemplate(deckId) {
  try {
    const raw = await AsyncStorage.getItem(tplKey(deckId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function delTemplate(deckId) {
  try { await AsyncStorage.removeItem(tplKey(deckId)); } catch {}
}

// ---------- forget one deck (F3: stale / missing deck) ----------
// Removes everything this device saved for `deckId`: its hand and TOC, its
// template, and the resume entry if it points at this deck. Other decks'
// cache is left alone.
export async function forgetDeck(deckId) {
  await delCache(deckHandKey(deckId, "doc", "all"));
  await delCache(deckTocKey(deckId));
  await delTemplate(deckId);
  const meta = await loadLastDeck();
  if (meta && String(meta.deckId) === String(deckId)) {
    try { await AsyncStorage.removeItem(LAST_DECK_KEY); } catch {}
  }
}

// Adapter for src/study/deckApi.js (which takes its store as a parameter).
export const deckStore = {
  get: getCache,
  set: setCache,
  del: delCache,
};
