// src/ui/BrandMark.js
// Product mark built from plain shapes (no artwork): two offset study cards.
// Optional wordmark and the product line SOURCE → STRUCTURE → CARDS → STUDY.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typeScale } from "../theme";

export function CardStackGlyph({ size = 28 }) {
  const w = size * 0.78;
  const h = size * 0.58;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.card,
          { width: w, height: h, right: 0, top: 0, backgroundColor: colors.cardBack, borderColor: colors.cardBackBorder },
        ]}
      />
      <View
        style={[
          styles.card,
          { width: w, height: h, left: 0, bottom: size * 0.08, backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
      >
        <View style={[styles.rule, { width: w * 0.5, top: h * 0.32 }]} />
        <View style={[styles.rule, { width: w * 0.32, top: h * 0.56 }]} />
      </View>
    </View>
  );
}

export default function BrandMark({ showTagline = false, size = 28, style }) {
  return (
    <View style={[styles.row, style]} accessibilityRole="text" accessibilityLabel="Flashcard Maker">
      <CardStackGlyph size={size} />
      <View style={styles.words}>
        <Text style={styles.wordmark}>Flashcard Maker</Text>
        {showTagline && (
          <Text style={styles.tagline} numberOfLines={1}>
            Source → Structure → Cards → Study
          </Text>
        )}
      </View>
    </View>
  );
}

// The product line as a step strip. Descriptions reflect current behaviour.
const STEPS = [
  { label: "Source", detail: "Upload a PDF" },
  { label: "Structure", detail: "Sections and pages are detected" },
  { label: "Cards", detail: "Cards are written per section" },
  { label: "Study", detail: "Flip drill, multiple choice, contents" },
];

export function ProductSteps({ style }) {
  return (
    <View style={[styles.steps, style]} accessibilityRole="list">
      {STEPS.map((s, i) => (
        <View key={s.label} style={styles.step} accessibilityRole="text">
          <View style={[styles.stepNum, i === 0 && styles.stepNumActive]}>
            <Text style={[styles.stepNumText, i === 0 && styles.stepNumTextActive]}>{i + 1}</Text>
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepLabel}>{s.label}</Text>
            <Text style={styles.stepDetail}>{s.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, columnGap: spacing.lg },
  step: { flexDirection: "row", alignItems: "flex-start", flexGrow: 1, flexBasis: 220 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepNumActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepNumText: { ...typeScale.small, fontWeight: "600", color: colors.textSecondary },
  stepNumTextActive: { color: colors.textOnAccent },
  stepText: { flexShrink: 1 },
  stepLabel: { ...typeScale.bodyStrong, color: colors.text },
  stepDetail: { ...typeScale.small, color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center" },
  card: { position: "absolute", borderRadius: radius.sm / 2 + 1, borderWidth: 1 },
  rule: {
    position: "absolute",
    left: "18%",
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textOnAccent,
    opacity: 0.85,
  },
  words: { marginLeft: spacing.sm + 2 },
  wordmark: { ...typeScale.heading, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  tagline: { ...typeScale.meta, color: colors.textMuted, textTransform: "uppercase", marginTop: 1 },
});
