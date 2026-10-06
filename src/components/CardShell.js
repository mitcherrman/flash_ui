// src/components/CardShell.js
// Study-card surface (front: white index card; back: soft highlighter tint).
// F1 owns the surface only; flip/swipe behaviour lives in FlipDrill (F3).
import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, elevation, radius, spacing } from "../theme";

export default function CardShell({
  width = 720,
  height = Math.round(720 * 0.6),
  variant = "front", // 'front' | 'back'
  children,
  style,
}) {
  const isBack = variant === "back";

  return (
    <View style={[styles.shell, isBack ? styles.back : styles.front, { width, height }, style]}>
      {/* Index-card rule: a quiet cue for which side is showing */}
      <View
        pointerEvents="none"
        style={[styles.rule, { backgroundColor: isBack ? colors.cardBackBorder : colors.accentSoft }]}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...elevation.medium,
  },
  front: { backgroundColor: colors.cardFront, borderColor: colors.cardBorder },
  back: { backgroundColor: colors.cardBack, borderColor: colors.cardBackBorder },
  rule: { position: "absolute", left: 0, right: 0, top: 0, height: 6 },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
