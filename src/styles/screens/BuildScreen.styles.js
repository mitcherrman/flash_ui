// src/styles/screens/BuildScreen.styles.js
import { StyleSheet } from "react-native";
import { colors, spacing, text } from "../../theme";

export default StyleSheet.create({
  card: { alignItems: "center" },
  cardTitle: {
    ...text.bodyStrong,
    marginTop: spacing.lg,
    textAlign: "center",
  },

  progressRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  dotIdle: { borderColor: colors.borderStrong, backgroundColor: "transparent" },
  dotActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dotDone: { borderColor: colors.success, backgroundColor: colors.success },
  progressLabel: { ...text.small, marginRight: spacing.sm },

  elapsed: {
    ...text.bodyStrong,
    color: colors.accentText,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.md,
  },
  hint: { ...text.muted, marginTop: spacing.sm, textAlign: "center" },
  homeBtn: { alignSelf: "center", marginTop: spacing.xl },

  errorNotice: { alignSelf: "stretch" },
  btnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
});
