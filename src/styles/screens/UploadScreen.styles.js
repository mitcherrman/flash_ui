// src/styles/screens/UploadScreen.styles.js
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADII } from "../theme";

export default StyleSheet.create({
  center: {
    minHeight: "100%",
    alignItems: "center",
    padding: SPACING.x3,
  },
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800" },
  subtle: { color: COLORS.textMuted, marginTop: SPACING.x1, textAlign: "center" },
  filename: {
    color: COLORS.text,
    marginBottom: SPACING.x1,
    marginTop: SPACING.x2,
    fontWeight: "600",
  },

  panel: {
    borderWidth: 1,
    borderColor: "#334155",
    padding: SPACING.x2,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.slate,
    marginTop: SPACING.x1,
  },
  panelHdr: { color: COLORS.text, fontWeight: "700", marginBottom: SPACING.x1 },
  panelText: { color: "#a8b3cf" },

  statsCard: {
    backgroundColor: COLORS.slate,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: RADII.xl,
    padding: SPACING.x2,
    marginVertical: SPACING.x1,
  },
  kv: { color: COLORS.text, marginVertical: 2 },
  k: { color: COLORS.accentBlue },
  v: { color: COLORS.text, fontWeight: "700" },
  rec: { color: COLORS.cyan, marginTop: SPACING.x1, fontWeight: "700" },

  sliderLabel: { color: COLORS.text, marginBottom: SPACING.x1 },
  coverage: { color: "#a7f3d0", marginTop: 2 },

  resumeCard: {
    width: "90%",
    backgroundColor: "#012B57",
    borderWidth: 1,
    borderColor: "#0C4A6E",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  resumeTitle: { color: "#FFCD00", fontWeight: "900", fontSize: 16 },
  resumeSub: { color: "#E6ECF0", marginTop: 4 },
  resumePrimary: {
    backgroundColor: "#10b981",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resumePrimaryTxt: { color: "#052e2b", fontWeight: "900" },
  resumeHollow: {
    borderWidth: 1,
    borderColor: "#0C4A6E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0b1226",
  },
  resumeHollowTxt: { color: "#E6ECF0", fontWeight: "800" },


  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.x1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate2,
  },
  allocTitle: { color: COLORS.text, flexShrink: 1, paddingRight: SPACING.x2 },
  allocControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  allocInput: {
    width: 48,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#334155",
    color: COLORS.text,
    backgroundColor: COLORS.slate,
    borderRadius: RADII.md,
    paddingVertical: 4,
    marginHorizontal: 6,
  },
});
