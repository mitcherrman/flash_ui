// src/styles/screens/UploadScreen.styles.js
import { StyleSheet } from "react-native";
import { colors, spacing, text, typeScale } from "../../theme";

export default StyleSheet.create({
  flow: { marginTop: spacing.xl, gap: spacing.lg },
  heroBtn: { marginTop: spacing.xl },

  resumeCard: { marginBottom: spacing.xl },
  resumeSub: { ...text.bodyStrong, marginTop: spacing.xs },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },

  filename: { ...text.bodyStrong, marginTop: spacing.xxs },

  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  panelText: { ...text.secondary },
  panelHdr: { ...text.heading, flexShrink: 1 },

  statRow: { flexDirection: "row", gap: spacing.xxl },
  stat: { minWidth: 72 },
  statValue: { ...text.title, fontVariant: ["tabular-nums"], marginTop: spacing.xxs },
  rec: { ...text.body, color: colors.accentText, fontWeight: "600", marginTop: spacing.md },

  fieldLabel: { ...text.label, color: colors.textSecondary },
  coverageRow: { gap: spacing.sm },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  coverageStats: { marginTop: spacing.sm, gap: spacing.xxs },
  coverage: { ...text.muted },

  planHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  allocRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  allocText: { flexShrink: 1 },
  allocTitle: { ...text.bodyStrong },
  allocPages: { ...typeScale.small, color: colors.textMuted, marginTop: spacing.xxs },
  allocControls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  allocInput: { width: 56, textAlign: "center", paddingHorizontal: spacing.xs },
});
