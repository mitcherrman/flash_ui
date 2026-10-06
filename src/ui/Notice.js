// src/ui/Notice.js
// Inline status/notice block: info | success | warning | error.
// Errors and warnings are announced (role=alert); others are polite.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typeScale } from "../theme";

const TONES = {
  info: { bg: colors.infoSoft, border: colors.infoBorder, ink: colors.info },
  success: { bg: colors.successSoft, border: colors.successBorder, ink: colors.success },
  warning: { bg: colors.warningSoft, border: colors.warningBorder, ink: colors.warning },
  error: { bg: colors.errorSoft, border: colors.errorBorder, ink: colors.error },
};

export default function Notice({ tone = "info", title, message, children, action, style }) {
  const t = TONES[tone] ?? TONES.info;
  const urgent = tone === "error" || tone === "warning";
  return (
    <View
      accessibilityRole={urgent ? "alert" : undefined}
      accessibilityLiveRegion={urgent ? "assertive" : "polite"}
      style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }, style]}
    >
      {!!title && <Text style={[styles.title, { color: t.ink }]}>{title}</Text>}
      {!!message && <Text style={[styles.message, !!title && styles.messageGap]}>{message}</Text>}
      {children}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: { ...typeScale.bodyStrong },
  message: { ...typeScale.small, color: colors.text },
  messageGap: { marginTop: spacing.xxs },
  action: { marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
