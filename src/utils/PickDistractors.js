// src/utils/pickDistractors.js
export function pickDistractors(currentCard, deckCards, count = 3) {
  const correct = String(currentCard.back || "").trim();
  if (!correct) return [];

  const poolSameSection = deckCards.filter(
    c =>
      c.id !== currentCard.id &&
      (c.section || "") === (currentCard.section || "") &&
      String(c.back || "").trim()
  );

  const poolOther = deckCards.filter(
    c =>
      c.id !== currentCard.id &&
      (c.section || "") !== (currentCard.section || "") &&
      String(c.back || "").trim()
  );

  const pickFrom = [...poolSameSection, ...poolOther];

  const answers = [];
  const seen = new Set([correct]);

  for (const c of pickFrom) {
    const a = String(c.back).trim();
    if (!a || seen.has(a)) continue;
    answers.push(a);
    seen.add(a);
    if (answers.length === count) break;
  }

  // pad if needed
  while (answers.length < count && poolOther.length) {
    const a = String(poolOther.pop().back || "").trim();
    if (a && !seen.has(a)) {
      answers.push(a);
      seen.add(a);
    }
  }

  return answers.slice(0, count);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
