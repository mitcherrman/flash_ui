import React from "react";
import FlipDrill from "../components/FlipDrill";

export default function Game2Screen({ route, navigation }) {
  const { deckId, mode = "basic", startOrdinal = null } = route.params || {};

  const openTOC = () => {
    navigation.navigate("TOC", { deckId, returnTo: "Game2", mode });
  };

  return (
    <FlipDrill
      deckId={deckId}
      n="all"                // fetch whole deck so ordinals are consistent
      order="doc"            // important: document order for TOC/jumps
      startOrdinal={startOrdinal}
      onOpenTOC={openTOC}
    />
  );
}
