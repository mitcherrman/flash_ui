// src/styles/components/FlipDrill.styles.js
import { StyleSheet } from "react-native";
import { colors, spacing, text, typeScale } from "../../theme";

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

  // text inside CardShell (front/back)
  textFront: { ...text.cardFront, textAlign: "center" },
  textBack: { ...text.cardBack, textAlign: "center" },
  // Which side is showing, in words (the colour change is not the only cue)
  faceLabel: {
    ...typeScale.meta,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  faceLabelBack: { color: colors.highlightText },
  faceHint: { ...typeScale.small, color: colors.textMuted, marginBottom: spacing.md, textAlign: "center" },

  // bottom controls
  navBtn: { minWidth: 112 },
});
