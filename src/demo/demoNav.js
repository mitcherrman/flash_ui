// src/demo/demoNav.js
// Navigation actions for the offline demo's source screen (F6). Pure: plain
// React Navigation 7 StackRouter actions, so tests run them through the real
// router (tests/f6Demo.test.mjs).
//
// The demo registers its source screen under the app's "Upload" route name,
// so the study screens' own "New deck" / "Back to Upload" actions return to
// it unchanged. From there:
//   • Start a mode → [Picker, mode]: the mode's Back resets to the Picker,
//     exactly as after a real build.
//   • Open the deck → [Picker].

import { studyParams } from "../study/tocNav.js";

export const DEMO_SOURCE_ROUTE = "Upload";

export function startStudyAction(deckId, route = "Game2") {
  return {
    type: "RESET",
    payload: {
      index: 1,
      routes: [
        { name: "Picker", params: { deckId } },
        { name: route, params: studyParams({ route, deckId }) },
      ],
    },
  };
}

export function openDeckAction(deckId) {
  return { type: "RESET", payload: { index: 0, routes: [{ name: "Picker", params: { deckId } }] } };
}
