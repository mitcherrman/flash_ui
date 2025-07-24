import React from "react";
import FlipDrill from "../components/FlipDrill";

export default function Game2({ route }) {
  const { deckId, mode } = route.params;     // mode: "basic" | "mc"
  return <FlipDrill deckId={deckId} mode={mode} />;
}
