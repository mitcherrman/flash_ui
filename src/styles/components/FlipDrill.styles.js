// src/styles/components/FlipDrill.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII, SHADOWS } from "../theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  topBar: {
    marginTop: SPACING.x2,
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: { fontSize: 20, color: COLORS.text, fontWeight: "700" },
  ctxToggle: { flexDirection: "row", alignItems: "center", marginLeft: SPACING.x2 },
  ctxLabel: { color: COLORS.text, marginRight: SPACING.x1, fontSize: 16 },
  tocBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: SPACING.x2,
    paddingVertical: SPACING.x1,
    borderRadius: RADII.xl,
    marginRight: SPACING.x2,
  },
  tocTxt: { color: "white", fontWeight: "800" },

  cardWrap: { marginTop: SPACING.x3 },
  badge: {
    position: "absolute",
    top: -SPACING.x1,
    left: SPACING.x2,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: SPACING.x1,
    paddingVertical: 4,
    borderRadius: RADII.xl,
    zIndex: 10,
  },
  badgeTxt: { color: "white", fontWeight: "800" },

  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: RADII.xxxl,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    paddingHorizontal: SPACING.x2,
    ...SHADOWS.card,
  },
  cardBack: { backgroundColor: COLORS.gold },
  textFront: {
    fontSize: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 36,
  },
  textBack: {
    fontSize: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 36,
  },

  infoPanel: {
    marginTop: SPACING.x2,
    backgroundColor: COLORS.bg2,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.x2,
  },
  infoLine: { color: COLORS.text, fontSize: 16, marginBottom: SPACING.x1 },
  infoKey: { color: COLORS.gold, fontWeight: "800" },
  infoVal: { color: COLORS.text, fontWeight: "700" },
  excerpt: {
    marginTop: SPACING.x1,
    color: "#F1F5F9",
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 20,
  },

  buttons: {
    position: "absolute",
    bottom: SPACING.x4,
    flexDirection: "row",
  },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: SPACING.x3,
    paddingVertical: SPACING.x1 + 4,
    borderRadius: RADII.xl,
    marginHorizontal: SPACING.x1,
  },
  btnTxt: { color: "#082F49", fontWeight: "800", fontSize: 16 },
});
