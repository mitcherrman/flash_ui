// src/styles/screens/GameMC.styles.js
import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, text, typeScale } from "../../theme";

export const s = StyleSheet.create({
  // ───────── Containers / common ─────────
  container: { flex: 1, backgroundColor: colors.bg },

  // ───────── Top bar ─────────
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: { ...text.bodyStrong, fontVariant: ["tabular-nums"] },
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

  counterBadge: { alignSelf: "center" },

  // ───────── Mode toggle ─────────
  modeToggleWrap: { flexDirection: "row", gap: spacing.xs, flexWrap: "nowrap" },

  // ───────── Main content layout (card + options) ─────────
  contentWrap: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },

  // Question text (inside CardShell)
  question: { ...text.cardFront, fontSize: 22, lineHeight: 30, textAlign: "center" },

  // Options list
  optsWrap: { alignItems: "stretch", justifyContent: "flex-start" },
  opts: { gap: 10, alignSelf: "center", width: "100%" },
  opt: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  optHover: { borderColor: colors.borderStrong, backgroundColor: colors.sourceSurface },
  optText: { ...typeScale.body, fontWeight: "500", color: colors.text },

  // Prev / Next buttons
  controls: { marginTop: 14, alignSelf: "center", flexDirection: "row", gap: spacing.md },
  navBtn: { minWidth: layout.touchTarget * 2.5 },
});

// Answer feedback: tinted fill + strong outline; text colour stays readable.
export const stateStyles = StyleSheet.create({
  idle: {},
  correct: { backgroundColor: colors.successSoft, borderColor: colors.success },
  wrong: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  correctText: { color: colors.success, fontWeight: "600" },
  wrongText: { color: colors.error, fontWeight: "600" },
});
