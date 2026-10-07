// src/styles/components/FlipDrill.styles.js
import { StyleSheet } from "react-native";
import { colors, layout, spacing, text, typeScale } from "../../theme";

export default StyleSheet.create({
  // layout roots
  container: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },

  // header (StudyHeader inside)
  headerWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm, alignItems: "center" },
  headerWrapShort: { paddingTop: spacing.sm, paddingBottom: spacing.sm },

  // phone / tablet: scrolling column + pinned footer
  columnScroll: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  footer: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },

  // short landscape: card column | side column
  shortBody: { flex: 1, flexDirection: "row", alignSelf: "center", gap: spacing.lg, paddingBottom: spacing.sm },
  shortCardScroll: { flexGrow: 1 },
  side: { gap: spacing.sm },
  sideScroll: { flexGrow: 1 },

  // desktop: centred row (card + controls | source)
  desktopScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl },
  desktopRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xxl },
  keyHint: { ...text.muted, textAlign: "center", marginTop: spacing.sm },

  // text inside CardShell (front/back); sizes come from studyText()
  cardInner: {
    flex: 1,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Natural-height wrapper whose onLayout reports how tall the text is
  measure: { width: "100%", flexShrink: 0 },
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

  // Previous / Next
  navRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md, maxWidth: "100%" },
  navRowSide: { gap: spacing.sm },
  navRowUnder: { marginTop: spacing.lg },
  navBtn: { flexGrow: 1, flexBasis: 0, maxWidth: 200, minWidth: layout.touchTarget * 2 },
});
