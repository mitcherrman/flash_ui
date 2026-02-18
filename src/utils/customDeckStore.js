// src/utils/customDeckStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "customdeck:v1:";

const deckKey = (deckId) => `${PREFIX}deck:${deckId}`;
const indexKey = () => `${PREFIX}index`;

export function isCustomDeckId(deckId) {
  return typeof deckId === "string" && deckId.startsWith("custom_");
}

export async function saveCustomDeck({ deckId, title, cards }) {
  const payload = {
    deckId,
    title: title || "Custom Deck",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: Array.isArray(cards) ? cards : [],
  };
  await AsyncStorage.setItem(deckKey(deckId), JSON.stringify(payload));

  // maintain an index for future “deck library” features
  try {
    const raw = await AsyncStorage.getItem(indexKey());
    const idx = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(idx) ? idx.filter((x) => x?.deckId !== deckId) : [];
    next.unshift({ deckId, title: payload.title, updatedAt: payload.updatedAt });
    await AsyncStorage.setItem(indexKey(), JSON.stringify(next.slice(0, 50)));
  } catch {}
}

export async function loadCustomDeck(deckId) {
  try {
    const raw = await AsyncStorage.getItem(deckKey(deckId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadCustomDeckCards(deckId) {
  const d = await loadCustomDeck(deckId);
  return Array.isArray(d?.cards) ? d.cards : [];
}

/**
 * Unified “hand” loader:
 * - custom_* deckId => local cards
 * - numeric deckId  => backend /hand/
 */
export async function getDeckHand({ deckId, n = "all", order = "doc", apiRoot }) {
  if (isCustomDeckId(deckId)) {
    let cards = await loadCustomDeckCards(deckId);

    // normalize shape so games don’t crash
    cards = cards.map((c, i) => ({
      id: c.id ?? `${deckId}:${i}`,
      front: c.front ?? "",
      back: c.back ?? "",
      imageUri: c.imageUri ?? null,
      section: c.section ?? "Custom",
      page: c.page ?? null,
      ...(c || {}),
    }));

    if (order === "random") {
      // quick shuffle
      const a = [...cards];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      cards = a;
    }

    if (n !== "all") {
      const nn = parseInt(String(n), 10);
      if (Number.isFinite(nn) && nn > 0) cards = cards.slice(0, nn);
    }
    return cards;
  }

  // backend deck
  const params = new URLSearchParams();
  params.set("deck_id", String(deckId));
  params.set("n", String(n));
  params.set("order", String(order));

  const r = await fetch(`${apiRoot}/hand/?${params.toString()}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status} • ${t.slice(0, 180)}`);
  }
  return r.json();
}
