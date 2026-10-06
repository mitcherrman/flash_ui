// src/styles/screens/GamePicker.styles.js
import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, text, typeScale } from "../../theme";

export default StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },

  // Mode cards: two columns when there is room, one column on phones
  card: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 240,
  },
  cardTitle: { ...text.heading, fontSize: 20, lineHeight: 26, fontWeight: "700" },
  cardSub: { ...text.secondary, marginTop: spacing.xs },
  cardBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xl,
    minHeight: layout.touchTarget,
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.md,
  },
  cardBtnTxt: { ...typeScale.label, color: colors.textOnAccent },

  tools: { marginTop: spacing.xl },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },

  devRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },

  // Template modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalTop: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTopInner: {
    width: "100%",
    maxWidth: layout.maxWidth.content,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  modalTitleWrap: { flexShrink: 1 },
  modalTitle: { ...text.heading },
  modalSub: { ...text.muted, marginTop: spacing.xxs },
  modalCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: "center" },
  modalColumn: { width: "100%", maxWidth: layout.maxWidth.content, gap: spacing.md },
  modalEmpty: { ...text.secondary },
  secCard: {},
  secTitle: { ...text.bodyStrong },
  secMeta: { ...text.muted, marginTop: spacing.xxs, marginBottom: spacing.sm },
  secItem: { ...text.small, color: colors.text, marginBottom: spacing.xs },
  secMore: { ...text.muted, fontStyle: "italic" },
});
