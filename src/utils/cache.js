// src/utils/cache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const VERSION = 2; // bump when cache shape changes
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
export async function saveLastDeck({ deckId, name, cardsCount = null, buildMs = null, builtAt = Date.now() }) {
  const meta = { deckId, name, cardsCount, buildMs, builtAt };
  await AsyncStorage.setItem(LAST_DECK_KEY, JSON.stringify(meta));
}

export async function loadLastDeck() {
  try {
    const raw = await AsyncStorage.getItem(LAST_DECK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearCache() {
  try { await AsyncStorage.removeItem(LAST_DECK_KEY); } catch {}
  // keep the rest in case you also want a full nuke:
  await clearAllCache();
}
