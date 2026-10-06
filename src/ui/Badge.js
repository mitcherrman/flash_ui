// src/ui/Badge.js
// Non-interactive metadata.
//   <Badge tone="accent">p. 5</Badge>        small pill (counts, pages, tags)
//   <MetaLabel>Section</MetaLabel>           uppercase label above a value
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, text, typeScale } from "../theme";

const TONES = {
  neutral: { bg: colors.surfaceSunken, ink: colors.textSecondary },
  accent: { bg: colors.accentSoft, ink: colors.accentText },
  highlight: { bg: colors.cardBack, ink: colors.highlightText },
  success: { bg: colors.successSoft, ink: colors.success },
  warning: { bg: colors.warningSoft, ink: colors.warning },
  error: { bg: colors.errorSoft, ink: colors.error },
};

export default function Badge({ tone = "neutral", children, accessibilityLabel, style, textStyle }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.ink }, textStyle]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function MetaLabel({ children, style }) {
  return <Text style={[text.meta, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
  },
  text: { ...typeScale.small, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
