// src/Screens/Game2Screen.js
import React from "react";
import FlipDrill from "../components/FlipDrill";

export default function Game2Screen({ route }) {
  const { deckId, mode } = route.params ?? {};
  console.log("🛫 Game2Screen mounted", { deckId, mode });   // <‑‑ add

  return <FlipDrill deckId={deckId} mode={mode} />;
}
