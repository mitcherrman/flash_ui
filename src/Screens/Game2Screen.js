// src/Screens/Game2Screen.js
import React from "react";
import { View } from "react-native";
import FlipDrill from "../components/FlipDrill";

export default function Game2Screen({ route, navigation }) {
  const deckId = route.params?.deckId;
  const mode = route.params?.mode ?? "basic";
  const n = route.params?.n ?? "all";
  const order = route.params?.order ?? "doc";
  const startOrdinal = route.params?.startOrdinal ?? null;

  return (
    <View style={{ flex: 1 }}>
      <FlipDrill
        deckId={deckId}
        n={n}
        order={order}
        startOrdinal={startOrdinal}
        onOpenTOC={() =>
          navigation.navigate("TOC", {
            deckId,
            returnTo: "Game2",
            mode,
          })
        }
        onGoBack={() => navigation.navigate("Picker", { deckId })}
      />
    </View>
  );
}
