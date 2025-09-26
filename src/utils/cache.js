// src/utils/cache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const VERSION = 1; // bump when you change cache shape
const PREFIX = `fcache:v${VERSION}:`;

function key(s) {
  return `${PREFIX}${s}`;
}

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
  } catch {
    return null;
  }
}

export async function delCache(k) {
  try {
    await AsyncStorage.removeItem(key(k));
  } catch {}
}

export async function clearAllCache() {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((x) => x.startsWith(PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}

// Canonical cache keys
export function deckHandKey(deckId, order = "doc", n = "all") {
  return `deck:${deckId}:hand:${order}:${n}`;
}
export function deckTocKey(deckId) {
  return `deck:${deckId}:toc`;
}

// Generic helper: fetch with cache (pass your fetcher)
export async function fetchWithCache({ key, fetcher, ttlMs = 6 * 60 * 60 * 1000, force = false }) {
  if (!force) {
    const cached = await getCache(key);
    if (cached) return cached;
  }
  const data = await fetcher();
  await setCache(key, data, ttlMs);
  return data;
}
