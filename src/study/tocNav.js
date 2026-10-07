// src/study/tocNav.js
// Navigation actions between the study screens and the Table of Contents
// (F3). Pure: plain action objects understood by React Navigation 7's
// StackRouter, so tests can run them through the real router.
//
// The verified bug: TOC jumps used navigation.navigate(returnTo, …). In
// React Navigation 7, navigate() to a route that isn't the focused one
// pushes a new copy, so every jump stacked Study → TOC → Study → TOC → …
//
// A jump now dispatches POP_TO:
//   • the study screen is below the TOC → pop back to it and replace its
//     params (same screen instance, no remount);
//   • it isn't (TOC opened from the Picker) → the TOC route is replaced by it.
// Either way the stack never grows from TOC use.

export const STUDY_ROUTES = Object.freeze({ Game2: "basic", GameMC: "mc" });

export function studyRouteFor(returnTo) {
  return Object.prototype.hasOwnProperty.call(STUDY_ROUTES, returnTo) ? returnTo : "Game2";
}

/** Params a study screen is opened with, at an optional 1-based ordinal. */
export function studyParams({ route, deckId, ordinal = null, jump = null }) {
  const params = { deckId, mode: STUDY_ROUTES[route], n: "all", order: "doc" };
  if (ordinal != null) params.startOrdinal = ordinal;
  // A fresh token per jump, so jumping to the ordinal already in the params
  // (after moving away from it by hand) still moves the card.
  if (jump != null) params.jump = jump;
  return params;
}

/** TOC row pressed → back to the study screen at that card. */
export function tocJumpAction({ returnTo, deckId, ordinal, jump }) {
  const name = studyRouteFor(returnTo);
  return { type: "POP_TO", payload: { name, params: studyParams({ route: name, deckId, ordinal, jump }) } };
}

/** Study screen → TOC (pushed on top; one TOC at most because jumps pop it). */
export function openTocAction({ from, deckId, currentOrdinal }) {
  return {
    type: "NAVIGATE",
    payload: { name: "TOC", params: { deckId, returnTo: studyRouteFor(from), currentOrdinal } },
  };
}

/** Leave study for the Picker (Back), keeping one Picker at the root. */
export function backToPickerAction(deckId) {
  return { type: "RESET", payload: { index: 0, routes: [{ name: "Picker", params: { deckId } }] } };
}

/** Back to Upload (missing deck, "New deck"). */
export function backToUploadAction() {
  return { type: "RESET", payload: { index: 0, routes: [{ name: "Upload" }] } };
}
