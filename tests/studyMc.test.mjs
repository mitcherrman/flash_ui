// tests/studyMc.test.mjs — F3 Multiple Choice state machine and the
// double-advance fix (src/study/mc.js).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AUTO_ADVANCE_MS,
  SCORE_MODES,
  buildOptions,
  createAdvanceTimer,
  initialMcState,
  mcReducer,
  optionLabel,
  optionState,
  shouldAutoAdvance,
} from "../src/study/mc.js";
import { pickDistractors } from "../src/utils/PickDistractors.js";

// ── fake clock ──────────────────────────────────────────────────────────────
function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    setTimer(fn, ms) {
      const id = ++seq;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = until;
    },
    get pending() {
      return timers.size;
    },
  };
}

/**
 * The component's wiring, minus React: the reducer, one timer, and the
 * effect rule "schedule when the answered card should auto-advance; cancel
 * when the step changes or the screen goes away". Mirrors GameMC.js.
 */
function session(total, { correctIndex = 0, keepScore = false } = {}) {
  const clock = fakeClock();
  const timer = createAdvanceTimer({ setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  let state = mcReducer(initialMcState(), { type: "load", total, idx: 0 });
  let scheduledFor = null;
  const dispatch = (action) => {
    const prev = state;
    state = mcReducer(state, action);
    if (state.step !== prev.step) {
      timer.cancel(); // effect cleanup
      scheduledFor = null;
    }
    if (shouldAutoAdvance(state, correctIndex) && scheduledFor !== state.step) {
      scheduledFor = state.step;
      const step = state.step;
      timer.schedule(() => dispatch({ type: "auto", step }));
    }
  };
  return {
    clock,
    timer,
    get state() {
      return state;
    },
    answer: (option) => dispatch({ type: "answer", option, correct: option === correctIndex, keepScore }),
    next: () => {
      timer.cancel();
      dispatch({ type: "next" });
    },
    prev: () => {
      timer.cancel();
      dispatch({ type: "prev" });
    },
    jump: (idx) => {
      timer.cancel();
      dispatch({ type: "jump", idx });
    },
    unmount: () => timer.cancel(),
    dispatch,
  };
}

// ── reproduction of the old bug ─────────────────────────────────────────────
test("reproduces the pre-F3 skip: Next during the 700 ms delay advanced twice", () => {
  // The old GameMC: pick() → setTimeout(next, 700), never cleared.
  const clock = fakeClock();
  let idx = 1; // on card 2
  const next = () => {
    idx = (idx + 1) % 10;
  };
  const oldPick = () => clock.setTimer(next, 700);
  oldPick();
  clock.advance(300);
  next(); // learner presses Next → card 3
  clock.advance(500); // old timer fires → card 4
  assert.equal(idx, 3, "old behaviour: card 2 → 4, card 3 skipped");
});

test("fixed: Next before auto-advance moves exactly one card", () => {
  const s = session(10);
  s.answer(0); // correct → auto-advance scheduled
  assert.equal(s.timer.pending, true);
  s.clock.advance(300);
  s.next();
  assert.equal(s.state.idx, 1);
  s.clock.advance(2000);
  assert.equal(s.state.idx, 1, "no second advance");
  assert.equal(s.clock.pending, 0);
});

test("fixed: auto-advance alone moves exactly one card", () => {
  const s = session(10);
  s.answer(0);
  s.clock.advance(AUTO_ADVANCE_MS - 1);
  assert.equal(s.state.idx, 0);
  s.clock.advance(1);
  assert.equal(s.state.idx, 1);
  s.clock.advance(5000);
  assert.equal(s.state.idx, 1);
});

test("a stale timer that somehow survives cannot move a later card", () => {
  let state = mcReducer(initialMcState(), { type: "load", total: 10, idx: 0 });
  state = mcReducer(state, { type: "answer", option: 0, correct: true });
  const staleStep = state.step;
  state = mcReducer(state, { type: "next" }); // manual Next, timer NOT cancelled
  state = mcReducer(state, { type: "answer", option: 1, correct: true }); // answers card 2
  const before = state;
  state = mcReducer(state, { type: "auto", step: staleStep }); // old timer fires
  assert.equal(state, before, "ignored: it belongs to card 1's visit");
  assert.equal(state.idx, 1);
});

test("Previous cancels a pending advance", () => {
  const s = session(10);
  s.next(); // card 2
  s.answer(0);
  s.prev();
  assert.equal(s.state.idx, 0);
  s.clock.advance(5000);
  assert.equal(s.state.idx, 0);
});

test("TOC jump during a pending advance cancels it", () => {
  const s = session(10);
  s.answer(0);
  s.clock.advance(200);
  s.jump(6);
  s.clock.advance(5000);
  assert.equal(s.state.idx, 6);
  assert.equal(s.state.picked, null, "the jumped-to card starts unanswered");
});

test("unmount / leaving the screen cancels the timer", () => {
  const s = session(10);
  s.answer(0);
  s.unmount();
  s.clock.advance(5000);
  assert.equal(s.state.idx, 0);
  assert.equal(s.clock.pending, 0);
});

test("a new answer replaces, never stacks, a pending timer", () => {
  const clock = fakeClock();
  const t = createAdvanceTimer({ setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  let fired = 0;
  t.schedule(() => fired++);
  t.schedule(() => fired++);
  assert.equal(clock.pending, 1);
  clock.advance(AUTO_ADVANCE_MS);
  assert.equal(fired, 1);
  t.cancel();
  t.cancel(); // idempotent
});

// ── answer state ────────────────────────────────────────────────────────────
test("rapid repeated answers: the first wins and is scored once", () => {
  const s = session(10, { correctIndex: 2, keepScore: true });
  s.answer(1); // wrong
  s.answer(2); // rapid second press (would have been 'correct')
  s.answer(1);
  assert.equal(s.state.picked, 1);
  assert.equal(s.state.wrong, 1);
  assert.equal(s.state.right, 0);
  assert.equal(s.timer.pending, false, "wrong answers wait for Next");
});

test("practice mode never counts", () => {
  const s = session(10, { correctIndex: 0, keepScore: false });
  s.answer(0);
  assert.deepEqual([s.state.right, s.state.wrong], [0, 0]);
});

test("score survives TOC jumps; resets on deck load and on mode switch", () => {
  let st = mcReducer(initialMcState(), { type: "load", total: 5, idx: 0 });
  st = mcReducer(st, { type: "answer", option: 0, correct: true, keepScore: true });
  st = mcReducer(st, { type: "jump", idx: 3 });
  assert.equal(st.right, 1);
  assert.equal(mcReducer(st, { type: "resetScore" }).right, 0);
  assert.equal(mcReducer(st, { type: "load", total: 5, idx: 0 }).right, 0);
});

test("wrong answer: no auto-advance; the card waits for Next", () => {
  const s = session(10, { correctIndex: 0 });
  s.answer(3);
  s.clock.advance(5000);
  assert.equal(s.state.idx, 0);
  s.next();
  assert.equal(s.state.idx, 1);
});

test("final card: no auto-advance and no silent wrap; Next still wraps to card 1", () => {
  const s = session(3);
  s.jump(2);
  s.answer(0);
  assert.equal(shouldAutoAdvance(s.state, 0), false);
  s.clock.advance(5000);
  assert.equal(s.state.idx, 2);
  assert.equal(mcReducer(s.state, { type: "auto", step: s.state.step }), s.state);
  s.next();
  assert.equal(s.state.idx, 0);
});

test("empty deck: actions are no-ops", () => {
  const st = mcReducer(initialMcState(), { type: "load", total: 0, idx: 0 });
  for (const a of [{ type: "next" }, { type: "prev" }, { type: "answer", option: 0 }, { type: "jump", idx: 2 }]) {
    assert.equal(mcReducer(st, a), st);
  }
});

// ── options and labels ─────────────────────────────────────────────────────
const identity = (a) => [...a];

test("options: own distractors first, never the answer, topped up to four", () => {
  const cards = [
    { id: 1, back: "Mitochondria", section: "Cells", distractors: ["Ribosome", "mitochondria", "Ribosome", ""] },
    { id: 2, back: "Chloroplast", section: "Cells" },
    { id: 3, back: "Nucleus", section: "Cells" },
    { id: 4, back: "ATP", section: "Energy" },
  ];
  const { options, correctIndex } = buildOptions(cards[0], cards, { pickDistractors, shuffle: identity });
  assert.equal(options.length, 4);
  assert.equal(options[correctIndex], "Mitochondria");
  assert.equal(new Set(options.map((o) => o.toLowerCase())).size, 4);
  assert.equal(options[1], "Ribosome");
});

test("answer feedback is not colour-only", () => {
  assert.deepEqual(optionState({ index: 0, picked: null, correctIndex: 0 }), { state: "idle", tag: null });
  assert.equal(optionState({ index: 0, picked: 2, correctIndex: 0 }).tag, "Correct answer");
  assert.equal(optionState({ index: 2, picked: 2, correctIndex: 0 }).tag, "Your answer — incorrect");
  assert.equal(optionState({ index: 0, picked: 0, correctIndex: 0 }).tag, "Correct — your answer");
  assert.equal(optionState({ index: 1, picked: 2, correctIndex: 0 }).state, "dim");
  assert.equal(optionLabel({ index: 1, text: "ATP", picked: null, correctIndex: 0 }), "Option B: ATP");
  assert.equal(optionLabel({ index: 1, text: "ATP", picked: 1, correctIndex: 0 }), "Option B: ATP. Your answer — incorrect");
});

test("scoring modes have meaningful labels, not '1' / '2'", () => {
  assert.deepEqual(SCORE_MODES.map((m) => m.id), ["normal", "endless"]);
  for (const m of SCORE_MODES) {
    assert.ok(!/^\d+$/.test(m.label), m.label);
    assert.ok(m.description.length > m.label.length);
  }
});
