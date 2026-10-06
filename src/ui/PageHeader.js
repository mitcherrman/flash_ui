// src/ui/PageHeader.js
// Application-level screen header (navigator headers are hidden app-wide).
//
//   ┌ left actions ─────────────────── right actions ┐   (optional row)
//   eyebrow
//   Title
//   subtitle
//
// The title is exposed as a heading to assistive tech.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, text } from "../theme";

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  left,
  right,
  align = "left",
  style,
  children,
}) {
  const centered = align === "center";
  return (
    <View style={[styles.wrap, style]}>
      {(left || right) && (
        <View style={styles.actions}>
          <View style={styles.side}>{left}</View>
          <View style={[styles.side, styles.sideRight]}>{right}</View>
        </View>
      )}
      {eyebrow ? (
        <View style={[styles.eyebrow, centered && styles.centerSelf]}>
          {typeof eyebrow === "string" ? <Text style={text.meta}>{eyebrow}</Text> : eyebrow}
        </View>
      ) : null}
      {!!title && (
        <Text accessibilityRole="header" style={[text.title, centered && styles.centerText]}>
          {title}
        </Text>
      )}
      {!!subtitle && (
        <Text style={[text.secondary, styles.subtitle, centered && styles.centerText]}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  side: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  sideRight: { justifyContent: "flex-end" },
  eyebrow: { marginBottom: spacing.sm },
  centerSelf: { alignSelf: "center" },
  subtitle: { marginTop: spacing.xs },
  centerText: { textAlign: "center" },
});
