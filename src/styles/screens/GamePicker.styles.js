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
  cardBtnDisabled: { backgroundColor: colors.disabledBg },
  cardBtnTxtDisabled: { color: colors.disabledText },

  notice: { marginBottom: spacing.xl },
  sectionLabel: { ...text.heading, marginBottom: spacing.md },

  tools: { marginTop: spacing.xl },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  toolNote: { ...text.muted, marginTop: spacing.md },

  devRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },

});
