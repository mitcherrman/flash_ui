// src/styles/components/TemplateBar.styles.js
import { StyleSheet, Platform } from "react-native";
import { colors, layout, spacing, text } from "../../theme";

export default StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "web" ? spacing.sm : spacing.xs,
    zIndex: 50,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
  },
  hint: { ...text.muted, flexShrink: 1 },

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
  modalTitle: { ...text.heading, flexShrink: 1 },
  modalScroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: "center" },
  modalColumn: { width: "100%", maxWidth: layout.maxWidth.content, gap: spacing.md },

  secTitle: { ...text.bodyStrong },
  secMeta: { ...text.muted, marginTop: spacing.xxs, marginBottom: spacing.sm },
  itemRow: { marginBottom: spacing.sm },
  itemTerm: { ...text.small, color: colors.text, fontWeight: "600" },
  itemDef: { ...text.small },
  noSec: { ...text.secondary },
});
