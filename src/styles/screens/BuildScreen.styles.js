// src/styles/screens/BuildScreen.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII } from "../theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.x2,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: { color: "#A8B3CF", marginTop: SPACING.x1, fontSize: 16, textAlign: "center" },

  card: {
    marginTop: SPACING.x2,
    width: "92%",
    maxWidth: 700,
    backgroundColor: COLORS.bg2,
    borderRadius: RADII.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.x2,
    alignItems: "center",
  },
  cardTitle: {
    marginTop: SPACING.x1,
    color: COLORS.text,
    fontWeight: "700",
    textAlign: "center",
  },

  progressRow: {
    marginTop: SPACING.x2 - 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  dotIdle: { borderColor: "#1f3a5f", backgroundColor: "transparent" },
  dotActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold2 },
  dotDone: { borderColor: "#22c55e", backgroundColor: "#22c55e" },
  progressLabel: { color: COLORS.text, marginHorizontal: 6 },

  hint: { color: "#A8B3CF", marginTop: SPACING.x2, textAlign: "center" },

  errorText: {
    color: "#FFCDD2",
    textAlign: "left",
    alignSelf: "stretch",
  },

  btnRow: { flexDirection: "row", gap: SPACING.x1 },
  btn: {
    backgroundColor: COLORS.gold2,
    paddingHorizontal: SPACING.x3,
    paddingVertical: SPACING.x1 + 4,
    borderRadius: RADII.xl,
  },
  btnSecondary: {
    backgroundColor: "#0B3D91",
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  btnTxt: { color: "#082F49", fontWeight: "800", fontSize: 16 },
  btnTxtAlt: { color: COLORS.gold, fontWeight: "800", fontSize: 16 },

  btnHollow: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  btnTxtHollow: { color: COLORS.gold },
});
