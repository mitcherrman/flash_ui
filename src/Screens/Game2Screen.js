// src/Screens/Game2Screen.js
import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import FlipDrill from "../components/FlipDrill";
import TemplateBar from "../components/TemplateBar";

export default function Game2Screen({ route, navigation }) {
  const deckId       = route.params?.deckId;
  const mode         = route.params?.mode ?? "basic";
  const n            = route.params?.n ?? "all";
  const order        = route.params?.order ?? "doc";
  const startOrdinal = route.params?.startOrdinal ?? null;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // Hide the TemplateBar only on native (iOS/Android) landscape; keep it on web
  const hideTemplateBar = (Platform.OS !== "web") && isLandscape;

  // Height of the fixed bottom Template bar
  const [barH, setBarH] = useState(0);
  const drillRef = useRef(null);

  // Whenever we hide the bar, force its height to 0 so content lifts correctly
  useEffect(() => {
    if (hideTemplateBar) setBarH(0);
  }, [hideTemplateBar]);

  if (!deckId) {
    return <View style={styles.container} />;
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
        // If the bar is hidden, inset is 0; otherwise use measured bar height
        contentInsetBottom={hideTemplateBar ? 0 : barH}
      />

      {/* Fixed bottom Template bar (hidden in native landscape) */}
      <TemplateBar deckId={deckId} hidden={hideTemplateBar} onHeight={setBarH} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#062B52" },
});
