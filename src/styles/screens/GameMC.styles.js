// src/styles/screens/GameMC.styles.js
import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, text, typeScale } from "../../theme";

export const s = StyleSheet.create({
  // ───────── Containers / common ─────────
  container: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  col: { gap: spacing.md },

  // ───────── Header (StudyHeader inside) ─────────
  headerWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm, alignItems: "center" },
  headerWrapShort: { paddingTop: spacing.sm },
  counterBadge: { alignSelf: "center" },

  // ───────── Mode toggle ─────────
  modeToggleWrap: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", justifyContent: "center", alignSelf: "center" },

  // ───────── Phone / tablet: scrolling column + pinned footer ─────────
  columnScroll: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  footer: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },

  // ───────── Short landscape: question column | options column ─────────
  shortBody: { flex: 1, flexDirection: "row", alignSelf: "center", gap: spacing.lg, paddingBottom: spacing.sm },
  colScroll: { gap: spacing.sm, paddingBottom: spacing.xs },
  side: { gap: spacing.xs },

  // ───────── Desktop: centred two-column row ─────────
  desktopScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl },
  desktopRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xxl },
  keyHint: { ...text.muted, textAlign: "center" },

  // Question (inside CardShell); size comes from studyText()
  faceLabel: {
    ...typeScale.meta,
    color: colors.textMuted,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: spacing.lg,
  },
  question: {
    ...text.cardFront,
    textAlign: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },

  // Options list
  opts: { gap: spacing.sm, width: "100%" },
  opt: {
    minHeight: layout.touchTarget,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  optShort: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  optHover: { borderColor: colors.borderStrong, backgroundColor: colors.sourceSurface },
  optRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  optLetter: {
    ...typeScale.label,
    lineHeight: 22,
    color: colors.textMuted,
    minWidth: 18,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  optBody: { flex: 1, minWidth: 0 },
  optText: { ...typeScale.body, fontWeight: "500", color: colors.text },
  optTag: { ...typeScale.small, fontWeight: "600", marginTop: spacing.xxs },

  // After answering
  status: { ...text.secondary, textAlign: "center", paddingHorizontal: spacing.sm },
  statusShort: { ...typeScale.small, color: colors.textSecondary, paddingHorizontal: 0 },
  source: { width: "100%" },

  // Prev / Next buttons
  controls: { alignSelf: "center", flexDirection: "row", justifyContent: "center", gap: spacing.md, maxWidth: "100%" },
  controlsSide: { alignSelf: "stretch", gap: spacing.sm },
  controlsUnder: { alignSelf: "stretch" },
  navBtn: { flexGrow: 1, flexBasis: 0, maxWidth: 220, minWidth: layout.touchTarget * 2 },
});

// Answer feedback: tinted fill + strong outline; text colour stays readable.
export const stateStyles = StyleSheet.create({
  idle: {},
  correct: { backgroundColor: colors.successSoft, borderColor: colors.success },
  wrong: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  correctText: { color: colors.success, fontWeight: "600" },
  wrongText: { color: colors.error, fontWeight: "600" },
  // Options that were neither picked nor correct: quieter, still ≥4.5:1
  dim: { backgroundColor: colors.surface, borderColor: colors.border },
  dimText: { color: colors.textSecondary },
});
