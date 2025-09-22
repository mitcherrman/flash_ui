// src/Screens/Game2Screen.js
import React from "react";
import FlipDrill from "../components/FlipDrill";

export default function Game2Screen({ route, navigation }) {
  const {
    deckId,
    mode = "basic",
    n = "all",
    order = "doc",
    startOrdinal, // may be undefined unless coming from TOC
  } = route.params || {};

  const openTOC = () =>
    navigation.navigate("TOC", { deckId, returnTo: "Game2", mode });

  return (
    <FlipDrill
      deckId={deckId}
      n={n}
      order={order}
      startOrdinal={startOrdinal}
      onOpenTOC={openTOC}
    />
  );
}
