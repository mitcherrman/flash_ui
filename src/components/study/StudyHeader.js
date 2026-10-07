// src/components/study/StudyHeader.js
// Top bar shared by Flip Drill and Multiple Choice (F4):
//   [Back] ·········· Card 3 of 12 ·········· [extra] [Contents]
// Three flex regions instead of an absolutely centred counter, so the
// counter can never cover a button. Wide bars give both sides equal room
// (true centring); compact bars let the counter take what is left.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { layout, spacing, text } from "../../theme";

export default function StudyHeader({ left, right, index, total, compact = false, maxWidth, style }) {
  const full = `Card ${index} of ${total}`;
  return (
    <View style={[styles.bar, maxWidth ? { maxWidth } : null, style]}>
      <View style={[compact ? styles.sideCompact : styles.side, styles.left]}>{left}</View>
      <Text
        style={[styles.counter, compact && styles.counterCompact]}
        numberOfLines={1}
        accessibilityLabel={full}
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
      >
        {/* Narrow phones: 44px targets leave little room, so drop the word "Card" */}
        {compact ? `${index}/${total}` : full}
      </Text>
      <View style={[compact ? styles.sideCompact : styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    alignSelf: "center",
    minHeight: layout.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  side: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sideCompact: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  counter: { ...text.bodyStrong, fontVariant: ["tabular-nums"], textAlign: "center", flexShrink: 0 },
  counterCompact: { flex: 1, flexShrink: 1, minWidth: 0 },
});
