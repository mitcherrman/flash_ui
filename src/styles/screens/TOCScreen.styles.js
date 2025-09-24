// src/styles/screens/TOCScreen.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII } from "../theme";

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerWrap: { paddingHorizontal: SPACING.x2, paddingTop: SPACING.x1, paddingBottom: 6 },
  headerTitle: { color: COLORS.text, fontWeight: "900", fontSize: 22 },
  headerCaption: { color: COLORS.textMuted, marginTop: 2 },
  searchInput: {
    marginTop: SPACING.x2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: "#0b1226",
    color: COLORS.text,
    paddingHorizontal: SPACING.x2,
    paddingVertical: SPACING.x1 + 2,
  },

  itemWrap: {
    marginHorizontal: SPACING.x2,
    marginVertical: SPACING.x1 - 2,
    backgroundColor: "#0b1226",
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: RADII.xl,
    padding: SPACING.x2,
  },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemOrdinal: { color: COLORS.accentBlue, fontWeight: "900" },
  itemPage: { color: COLORS.accentBlue, fontWeight: "700" },
  itemSection: { color: COLORS.gold, fontWeight: "800", marginTop: SPACING.x1 },
  itemFront: { color: COLORS.text, marginTop: 4 },
});
