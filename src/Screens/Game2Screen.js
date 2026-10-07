// src/Screens/Game2Screen.js
// Flip Drill screen: loads the deck (explicit loading / empty / missing /
// error states, never an endless spinner), then renders FlipDrill and the
// TemplateBar, which owns the one template sheet on this screen.
//
// F4: the bar sits in the column under the Flip Drill (never over it) on
// phones and tablets. Short-landscape and desktop layouts have no bottom
// bar; their header "Template" button opens the same sheet through the
// bar's ref, so the sheet never remounts when the window changes class.
import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import FlipDrill from "../components/FlipDrill";
import TemplateBar from "../components/TemplateBar";
import DeckStatus from "../components/study/DeckStatus";
import { useDeckHand, useSavedTemplate } from "../study/useDeck";
import { flipDrillLayout } from "../study/layout";
import { colors } from "../theme";
import { useLayout } from "../ui";

export default function Game2Screen({ route, navigation }) {
  const deckId       = route.params?.deckId;
  const startOrdinal = route.params?.startOrdinal ?? null;
  const jump         = route.params?.jump ?? null;

  const deck = useDeckHand(deckId);
  const template = useSavedTemplate(deckId);
  const templateRef = useRef(null);

  const { width, height, layoutClass } = useLayout();
  const barShown = flipDrillLayout({ layoutClass, width, height }).templatePlacement === "bar";

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
        onOpenTemplate={() => templateRef.current?.open()}
      />

      {/* Bottom Template bar (phones/tablets); header button elsewhere */}
      <TemplateBar
        ref={templateRef}
        deckId={deckId}
        template={template}
        deckTitle={template?.title ?? null}
        hidden={!barShown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
