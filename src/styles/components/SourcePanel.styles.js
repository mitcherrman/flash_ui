// src/styles/components/SourcePanel.styles.js
import { StyleSheet } from "react-native";
import { colors, radius, spacing, text, typeScale } from "../../theme";

export default StyleSheet.create({
  // Connected to the card, quieter than the answer (F1 `source` surface).
  panel: {
    backgroundColor: colors.sourceSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.sourceRule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  row: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  key: { ...typeScale.meta, color: colors.textMuted, textTransform: "uppercase", minWidth: 64 },
  val: { ...typeScale.small, fontWeight: "600", color: colors.text, flexShrink: 1 },
  qualifier: { fontWeight: "400", color: colors.textSecondary },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  toggleLabel: { ...text.small, color: colors.textSecondary },
  excerpt: { ...text.excerpt, marginTop: spacing.xs },
  note: { ...text.muted, fontStyle: "italic", marginTop: spacing.xs },
});
