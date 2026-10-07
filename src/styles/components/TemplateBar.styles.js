// src/styles/components/TemplateBar.styles.js
import { StyleSheet, Platform } from "react-native";
import { colors, elevation, layout, radius, spacing, text } from "../../theme";

export default StyleSheet.create({
  // In the screen's column (F4): it takes its own height instead of
  // floating over the card and Previous/Next.
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "web" ? spacing.sm : spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
  },
  hint: { ...text.muted, flexShrink: 1 },
  barText: { flexShrink: 1 },

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
  modalTitle: { ...text.heading, flexShrink: 1 },
  modalSub: { ...text.muted, marginTop: spacing.xxs },
  modalCenter: { flex: 1, minHeight: 200, alignItems: "center", justifyContent: "center" },
  summary: { ...text.secondary },
  modalScroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: "center" },
  modalColumn: { width: "100%", maxWidth: layout.maxWidth.content, gap: spacing.md },

  // Tablet / desktop: centred dialog over a scrim (F4)
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: layout.maxWidth.content,
    flexShrink: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...elevation.high,
  },
  dialogTop: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  dialogScroll: { flexGrow: 0, flexShrink: 1 },

  secTitle: { ...text.bodyStrong },
  secMeta: { ...text.muted, marginTop: spacing.xxs, marginBottom: spacing.sm },
  itemRow: { marginBottom: spacing.sm },
  itemTerm: { ...text.small, color: colors.text, fontWeight: "600" },
  itemDef: { ...text.small },
  noSec: { ...text.secondary },
});
