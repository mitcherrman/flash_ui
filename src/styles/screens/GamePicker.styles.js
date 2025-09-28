// src/styles/screens/GamePicker.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII } from "../theme";

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    paddingTop: SPACING.x4 + SPACING.x2,
    paddingBottom: SPACING.x3 + SPACING.x1,
    alignItems: "center",
  },
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "900" },
  subtle: { color: "#A7B3C9", marginTop: SPACING.x1 },

  grid: {
    marginTop: SPACING.x3,
    width: "92%",
    maxWidth: 900,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.x2,
    justifyContent: "center",
  },

  card: {
    flexBasis: "46%",
    minWidth: 320,
    backgroundColor: "#0B274A",
    borderColor: COLORS.border,
    borderWidth: 2,
    borderRadius: RADII.xxxl,
    padding: SPACING.x2,
  },
  cardTitle: { color: COLORS.gold, fontWeight: "900", fontSize: 18 },
  cardSub: { color: COLORS.text, marginTop: SPACING.x1 },
  cardBtn: {
    alignSelf: "flex-start",
    marginTop: SPACING.x2,
    backgroundColor: COLORS.gold2,
    paddingHorizontal: SPACING.x2 + 2,
    paddingVertical: SPACING.x1 + 2,
    borderRadius: RADII.xl,
  },
  cardBtnTxt: { color: "#082F49", fontWeight: "900" },

  tocLink: {
    marginTop: SPACING.x3 - 4,
    borderColor: COLORS.border,
    borderWidth: 2,
    paddingHorizontal: SPACING.x2 + 2,
    paddingVertical: SPACING.x1 + 2,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.bg2,
  },
  tocTxt: { color: COLORS.text, fontWeight: "800" },

  // Secondary button (download HTML)
  secondaryBtn: {
    marginTop: SPACING.x2,
    borderColor: COLORS.border,
    borderWidth: 2,
    paddingHorizontal: SPACING.x2 + 2,
    paddingVertical: SPACING.x1 + 2,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.bg2,
  },
  secondaryTxt: { color: COLORS.text, fontWeight: "800" },

  // Export / share PDF
  exportBtn: {
    marginTop: SPACING.x2,
    borderColor: COLORS.border,
    borderWidth: 2,
    paddingHorizontal: SPACING.x2 + 2,
    paddingVertical: SPACING.x1 + 4,
    borderRadius: RADII.xl,
    backgroundColor: "#0B3D91",
  },
  exportTxt: { color: COLORS.gold, fontWeight: "900" },

  // Dev cache buttons
  devBtn: {
    marginTop: SPACING.x2 - 4,
    borderColor: COLORS.border,
    borderWidth: 2,
    paddingHorizontal: SPACING.x2 + 2,
    paddingVertical: SPACING.x1 + 2,
    borderRadius: RADII.xl,
    backgroundColor: "#0B274A",
  },
  devBtnTxt: { color: COLORS.gold, fontWeight: "900" },
});
