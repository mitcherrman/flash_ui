import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "custom_decks:v1";

export async function loadCustomDecks() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomDecks(decks) {
  await AsyncStorage.setItem(KEY, JSON.stringify(decks || []));
}

export async function createCustomDeck({ title, cards }) {
  const decks = await loadCustomDecks();
  const id = `custom_${Date.now()}`;
  const deck = {
    id,
    source: "custom",
    title: title || "Custom Deck",
    createdAt: Date.now(),
    cards: (cards || []).map((c, idx) => ({
      id: c.id || `${id}_card_${idx}`,
      front: c.front || "",
      back: c.back || "",
      imageUri: c.imageUri || null,
    })),
  };
  decks.unshift(deck);
  await saveCustomDecks(decks);
  return deck;
}

export async function getCustomDeck(deckId) {
  const decks = await loadCustomDecks();
  return decks.find((d) => d.id === deckId) || null;
}

