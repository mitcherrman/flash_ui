// src/components/source/CardCountControl.js
// The deck size: the user's number, the analysis recommendation beside it,
// a slider with labelled −/+ steps (keyboard path on web), and Reset.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Badge, Button, IconButton, Surface } from "../../ui";
import { colors, spacing, text, typeScale } from "../../theme";

export default function CardCountControl({
  total,
  recommendation,
  sectionCount,
  limits,
  changed,
  manual,
  onChangeTotal,
  onReset,
}) {
  const rec = recommendation?.total;
  const range = recommendation?.range;
  const locked = manual; // the total follows hand-edited sections
  const basis = sectionCount
    ? `the document's ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`
    : "the document's length";

  return (
    <Surface>
      <Text style={styles.heading} accessibilityRole="header">
        Cards to generate
      </Text>

      <View style={styles.valueRow}>
        <Text style={styles.value} accessibilityLabel={`${total} cards`}>
          {total}
        </Text>
        <Badge tone={changed ? "highlight" : "accent"}>{changed ? "Your choice" : "Recommended"}</Badge>
      </View>

      <Text style={styles.recLine}>
        {changed ? (
          <>
            Recommended: <Text style={styles.recNumber}>{rec}</Text>
            {range ? ` · suggested range ${range.lo}–${range.hi}` : ""}
          </>
        ) : (
          <>
            Based on {basis}
            {range ? ` · suggested range ${range.lo}–${range.hi}` : ""}
          </>
        )}
      </Text>

      <View style={styles.sliderRow}>
        <IconButton
          icon="–"
          accessibilityLabel="Fewer cards"
          disabled={locked || total <= limits.min}
          onPress={() => onChangeTotal(total - 1)}
        />
        <Slider
          style={[styles.slider, locked && styles.sliderLocked]}
          minimumValue={limits.min}
          maximumValue={limits.max}
          step={1}
          value={total}
          disabled={locked}
          onValueChange={(v) => onChangeTotal(Math.round(v))}
          minimumTrackTintColor={locked ? colors.borderStrong : colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={locked ? colors.borderStrong : colors.accent}
          accessibilityLabel="Number of cards to generate"
          // aria-* props: read by react-native-web 0.20 and RN ≥ 0.71 alike.
          aria-valuemin={limits.min}
          aria-valuemax={limits.max}
          aria-valuenow={total}
          aria-valuetext={`${total} cards`}
          aria-disabled={!!locked}
        />
        <IconButton
          icon="+"
          accessibilityLabel="More cards"
          disabled={locked || total >= limits.max}
          onPress={() => onChangeTotal(total + 1)}
        />
      </View>
      <View style={styles.scale} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.scaleText}>{limits.min}</Text>
        <Text style={styles.scaleText}>
          {limits.max}
          {sectionCount && limits.max < 30 ? ` (max ${limits.perSection} per section)` : ""}
        </Text>
      </View>

      {locked && (
        <Text style={styles.lockNote}>
          The total follows your section edits. Reset to use the slider again.
        </Text>
      )}

      <View style={styles.resetRow}>
        <Button
          title="Reset to recommendation"
          variant="quiet"
          size="sm"
          disabled={!changed}
          onPress={onReset}
          accessibilityHint={`Restores ${rec} cards${sectionCount ? " and the recommended section plan" : ""}`}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  heading: { ...text.heading },
  valueRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  value: { ...typeScale.display, color: colors.text, fontVariant: ["tabular-nums"] },
  recLine: { ...text.small, marginTop: spacing.xs },
  recNumber: { fontWeight: "700", color: colors.text },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  slider: { flex: 1, minWidth: 0, height: 44 },
  sliderLocked: { opacity: 0.6 },
  scale: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 52, marginTop: spacing.xxs },
  scaleText: { ...text.muted, fontVariant: ["tabular-nums"] },
  lockNote: { ...text.small, color: colors.warning, marginTop: spacing.md },
  resetRow: { marginTop: spacing.md, flexDirection: "row" },
});
