// src/study/mc.js
// Multiple Choice state machine, answer options and the auto-advance timer
// (F3). Pure: no React / React Native imports.
//
// The verified bug: after an answer, a 700 ms setTimeout(next) was started
// and never cleared. Pressing Next inside that window advanced once by hand
// and once more when the timer fired, skipping a card (2 → 4).
//
// The fix has two independent guards:
//   1. createAdvanceTimer keeps at most one pending timer; every manual move
//      (Next, Previous, TOC jump, new deck, unmount, leaving the screen)
//      cancels it.
//   2. Every position change bumps `step`. The timer's action carries the
//      `step` it was scheduled for, and the reducer ignores it if the learner
//      has moved since. A stale timer can never move a later card.

export const AUTO_ADVANCE_MS = 700;

export function initialMcState() {
  return { total: 0, idx: 0, picked: null, step: 0, right: 0, wrong: 0 };
}

function clampIdx(idx, total) {
  if (!total) return 0;
  return Number.isInteger(idx) && idx >= 0 && idx < total ? idx : 0;
}

function moveTo(state, idx) {
  return { ...state, idx, picked: null, step: state.step + 1 };
}

/**
 * Actions:
 *   load   { total, idx }   new card list (initial load, resume); score resets
 *   jump   { idx }          TOC jump; score kept
 *   next / prev             manual navigation (wraps, as before)
 *   answer { option, correct, keepScore }
 *                           first answer per card visit wins; later presses
 *                           (rapid taps) are ignored and never counted twice
 *   auto   { step }         timer-driven advance for the card answered at `step`
 *   resetScore              scoring mode switched
 */
export function mcReducer(state, action) {
  switch (action?.type) {
    case "load":
      return {
        ...initialMcState(),
        total: action.total,
        idx: clampIdx(action.idx, action.total),
        step: state.step + 1,
      };
    case "jump":
      if (!state.total) return state;
      return moveTo(state, clampIdx(action.idx, state.total));
    case "next":
      if (!state.total) return state;
      return moveTo(state, (state.idx + 1) % state.total);
    case "prev":
      if (!state.total) return state;
      return moveTo(state, (state.idx - 1 + state.total) % state.total);
    case "answer":
      if (!state.total || state.picked != null) return state;
      if (!Number.isInteger(action.option) || action.option < 0) return state;
      if (!action.keepScore) return { ...state, picked: action.option };
      return action.correct
        ? { ...state, picked: action.option, right: state.right + 1 }
        : { ...state, picked: action.option, wrong: state.wrong + 1 };
    case "resetScore":
      return { ...state, right: 0, wrong: 0 };
    case "auto":
      // Only the card that was answered, only once, and never past the end.
      if (action.step !== state.step || state.picked == null) return state;
      if (state.idx >= state.total - 1) return state;
      return moveTo(state, state.idx + 1);
    default:
      return state;
  }
}

export function isLastCard(state) {
  return state.total > 0 && state.idx === state.total - 1;
}

/**
 * Auto-advance after a correct answer, except on the last card (no silent
 * wrap to card 1). After a wrong answer the card stays so the correct answer
 * and its source can be read; Next continues.
 */
export function shouldAutoAdvance(state, correctIndex) {
  return state.picked != null && state.picked === correctIndex && !isLastCard(state);
}

/**
 * One pending timer at most. schedule() replaces any pending timer; cancel()
 * is idempotent. Timer functions are injected so tests use a fake clock.
 */
export function createAdvanceTimer({
  delayMs = AUTO_ADVANCE_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (h) => clearTimeout(h),
} = {}) {
  let handle = null;
  return {
    schedule(fn) {
      if (handle != null) clearTimer(handle);
      handle = setTimer(() => {
        handle = null;
        fn();
      }, delayMs);
    },
    cancel() {
      if (handle != null) clearTimer(handle);
      handle = null;
    },
    get pending() {
      return handle != null;
    },
  };
}

// ── options ──────────────────────────────────────────────────────────────────

const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

/**
 * The answer options for a card: its own distractors first (deduped, never
 * equal to the answer), topped up from other cards' answers to 3, then
 * shuffled with the answer. Same rule as before F3, now testable.
 */
export function buildOptions(card, cards, { pickDistractors, shuffle }) {
  const correct = norm(card?.back);
  const key = (s) => s.toLowerCase();
  const seen = new Set([key(correct)]);
  const d = [];
  for (const raw of Array.isArray(card?.distractors) ? card.distractors : []) {
    const c = norm(raw);
    if (!c || seen.has(key(c))) continue;
    seen.add(key(c));
    d.push(c);
  }
  if (d.length < 3) {
    const needed = 3 - d.length;
    for (const cand of pickDistractors(card, cards, Math.max(needed * 2, 3))) {
      const c = norm(cand);
      if (!c || seen.has(key(c))) continue;
      seen.add(key(c));
      d.push(c);
      if (d.length >= 3) break;
    }
  }
  const options = shuffle([correct, ...d.slice(0, 3)]);
  return { options, correctIndex: options.findIndex((o) => key(norm(o)) === key(correct)) };
}

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Per-option result after answering; colour is never the only signal. */
export function optionState({ index, picked, correctIndex }) {
  if (picked == null) return { state: "idle", tag: null };
  if (index === correctIndex) return { state: "correct", tag: index === picked ? "Correct — your answer" : "Correct answer" };
  if (index === picked) return { state: "wrong", tag: "Your answer — incorrect" };
  return { state: "dim", tag: null };
}

/** Accessible name for an option button. */
export function optionLabel({ index, text, picked, correctIndex }) {
  const letter = OPTION_LETTERS[index] ?? String(index + 1);
  const { tag } = optionState({ index, picked, correctIndex });
  return `Option ${letter}: ${text}${tag ? `. ${tag}` : ""}`;
}

/** Scoring modes — what each one actually does. */
export const SCORE_MODES = Object.freeze([
  { id: "normal", label: "Practice", description: "Practice: answers are not counted" },
  { id: "endless", label: "Keep score", description: "Keep score: counts right and wrong answers on this device" },
]);
