// src/styles/components/FlipDrill.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII, SHADOWS } from "../theme";

export default StyleSheet.create({
  // layout roots
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

  // top bar
  topBar: {
    marginTop: SPACING.x2,
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: SPACING.x2,
    paddingVertical: SPACING.x1,
    borderRadius: RADII.xl,
    marginRight: SPACING.x2,
  },
  backTxt: { color: "white", fontWeight: "800" },
  counter: { fontSize: 20, color: COLORS.text, fontWeight: "700" },

  tocBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: SPACING.x2,
    paddingVertical: SPACING.x1,
    borderRadius: RADII.xl,
    marginRight: SPACING.x2,
  },
  tocTxt: { color: "white", fontWeight: "800" },

  ctxToggle: { flexDirection: "row", alignItems: "center", marginLeft: SPACING.x2 },
  ctxLabel: { color: COLORS.text, marginRight: SPACING.x1, fontSize: 16 },

  // the animated card stage (container you rotate)
  cardStage: {
    marginTop: SPACING.x3,
    alignSelf: "center",
  },

  // text/content inside CardShell (front/back)
  cardInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.x2,
  },
  textFront: {
    fontSize: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 36,
  },
  textBack: {
    fontSize: 24,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "700",
    lineHeight: 32,
  },

  // info panel
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

  // bottom controls
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
    ...SHADOWS.card,
  },
  btnTxt: { color: "#082F49", fontWeight: "800", fontSize: 16 },
});
