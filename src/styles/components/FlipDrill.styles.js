// src/styles/components/FlipDrill.styles.js
import { StyleSheet } from "react-native";
import { colors, radius, spacing, text, typeScale } from "../../theme";

export default StyleSheet.create({
  // layout roots
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },

  // top bar
  topBar: {
    marginTop: spacing.lg,
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: { ...text.bodyStrong, fontSize: 17, fontVariant: ["tabular-nums"] },
  // Presentational overlay centred across the bar; must never take presses
  // from the Back/TOC buttons beneath it (pre-F1 bug on web landscape/desktop).
  counterLandscape: {
    pointerEvents: "none",
    ...text.bodyStrong,
    fontVariant: ["tabular-nums"],
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },

  ctxLabel: { ...text.small, color: colors.textSecondary, marginRight: spacing.sm },

  // text inside CardShell (front/back)
  textFront: { ...text.cardFront, textAlign: "center" },
  textBack: { ...text.cardBack, textAlign: "center" },

  // source / context panel: connected to the card, quieter than the answer
  infoPanel: {
    backgroundColor: colors.sourceSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.sourceRule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  infoLine: { ...typeScale.small, color: colors.text, marginBottom: spacing.xs },
  infoKey: { ...typeScale.meta, color: colors.textMuted, textTransform: "uppercase" },
  infoVal: { ...typeScale.small, fontWeight: "600", color: colors.text },
  excerpt: { ...text.excerpt },

  // bottom controls
  navBtn: { minWidth: 112 },
});
