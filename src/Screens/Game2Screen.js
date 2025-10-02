// src/Screens/Game2Screen.js
import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import FlipDrill from "../components/FlipDrill";
import TemplateBar from "../components/TemplateBar";

export default function Game2Screen({ route, navigation }) {
  const deckId       = route.params?.deckId;
  const mode         = route.params?.mode ?? "basic";
  const n            = route.params?.n ?? "all";
  const order        = route.params?.order ?? "doc";
  const startOrdinal = route.params?.startOrdinal ?? null;

  // Height of the fixed bottom Template bar
  const [barH, setBarH] = useState(72);
  const drillRef = useRef(null);

  if (!deckId) {
    return <View style={[styles.container]} />;
  }

  return (
    <View style={styles.container}>
      {/* Main drill; pass navigation + bottom inset so controls lift */}
      <FlipDrill
        ref={drillRef}
        deckId={deckId}
        mode={mode}
        n={n}
        order={order}
        startOrdinal={startOrdinal}
        navigation={navigation}
        contentInsetBottom={barH}
      />

      {/* Fixed bottom Template bar */}
      <TemplateBar deckId={deckId} onHeight={setBarH} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#062B52" },
});
