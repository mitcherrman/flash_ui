// src/Screens/Game2Screen.js
// Flip Drill screen: loads the deck (explicit loading / empty / missing /
// error states, never an endless spinner), then renders FlipDrill and the
// TemplateBar, which owns the one template sheet on this screen.
import React from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import FlipDrill from "../components/FlipDrill";
import TemplateBar from "../components/TemplateBar";
import DeckStatus from "../components/study/DeckStatus";
import { useDeckHand, useSavedTemplate } from "../study/useDeck";
import { colors } from "../theme";

export default function Game2Screen({ route, navigation }) {
  const deckId       = route.params?.deckId;
  const startOrdinal = route.params?.startOrdinal ?? null;
  const jump         = route.params?.jump ?? null;

  const deck = useDeckHand(deckId);
  const template = useSavedTemplate(deckId);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // Hide the TemplateBar only on native (iOS/Android) landscape; keep it on web
  const hideTemplateBar = (Platform.OS !== "web") && isLandscape;

  if (deck.status !== "ready") {
    return <DeckStatus state={deck} deckId={deckId} navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      <FlipDrill
        deckId={deckId}
        cards={deck.items}
        template={template}
        startOrdinal={startOrdinal}
        jump={jump}
        navigation={navigation}
      />

      {/* Fixed bottom Template bar (hidden in native landscape) */}
      <TemplateBar
        deckId={deckId}
        template={template}
        deckTitle={template?.title ?? null}
        hidden={hideTemplateBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
