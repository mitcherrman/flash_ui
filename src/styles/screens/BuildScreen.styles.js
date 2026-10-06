// src/styles/screens/BuildScreen.styles.js
import { StyleSheet } from "react-native";
import { colors, spacing, text } from "../../theme";

export default StyleSheet.create({
  card: { alignItems: "center" },
  fileName: { ...text.bodyStrong, textAlign: "center", alignSelf: "stretch" },
  requestLine: { ...text.small, textAlign: "center", marginTop: spacing.xxs },

  glyph: { marginTop: spacing.xl },

  steps: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  step: { ...text.meta, textTransform: "uppercase" },
  stepArrow: { ...text.muted },

  elapsed: {
    ...text.bodyStrong,
    color: colors.accentText,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.md,
  },
  hint: { ...text.muted, marginTop: spacing.sm, textAlign: "center", maxWidth: 420 },
  cancelBtn: { alignSelf: "center", marginTop: spacing.xl },

  notice: { alignSelf: "stretch", marginTop: spacing.lg },
  warningItem: { ...text.small, color: colors.text, marginTop: spacing.xs },
  errStatus: { ...text.muted, marginTop: spacing.xs },
  btnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
