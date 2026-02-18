// src/styles/screens/UploadScreen.styles.js
import { StyleSheet, Platform } from "react-native";

const IOS_SHADOW = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 3 },
  default: {},
});

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6FA" },
  headerBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 220,
  },
  scroll: { flex: 1 },

  center: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 22,
  },

  // Brand
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    ...IOS_SHADOW,
  },
  brandLogo: { width: 40, height: 40 },

  h1: { color: "#0B1220", fontSize: 30, fontWeight: "800", letterSpacing: -0.2 },
  subtle: { color: "rgba(17,24,39,0.62)", marginTop: 4, fontSize: 14 },

  // Resume card
  resumeCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...IOS_SHADOW,
    marginBottom: 14,
  },
  resumeTitle: { color: "#0B1220", fontWeight: "800", fontSize: 16 },
  resumeSub: { color: "rgba(17,24,39,0.62)", marginTop: 4 },

  resumePrimary: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resumePrimaryTxt: { color: "white", fontWeight: "800" },

  resumeHollow: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "white",
  },
  resumeHollowTxt: { color: "#0B1220", fontWeight: "800" },

  // Buttons row
  actionsRow: { gap: 10, marginBottom: 6 },

  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#007AFF", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
      default: {},
    }),
  },
  primaryBtnTxt: { color: "white", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...IOS_SHADOW,
  },
  secondaryBtnTxt: { color: "#007AFF", fontWeight: "800", fontSize: 16 },

  // Section container
  section: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...IOS_SHADOW,
  },
  sectionTitle: { color: "rgba(17,24,39,0.55)", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },

  filename: { color: "#0B1220", marginTop: 6, fontWeight: "800", fontSize: 16 },

  // Panels
  panel: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FFFFFF",
  },
  panelText: { marginTop: 6, color: "rgba(17,24,39,0.65)", fontWeight: "600" },
  panelError: { borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.06)" },
  panelErrorText: { color: "rgba(185,28,28,0.95)" },

  // Stats
  statsCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  k: { color: "rgba(17,24,39,0.55)", fontWeight: "700" },
  v: { color: "#0B1220", fontWeight: "800" },
  rec: { color: "rgba(17,24,39,0.70)", marginTop: 10, fontWeight: "700" },

  // Coverage / chips
  coverageRow: { marginTop: 14, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  coverageLabel: { color: "rgba(17,24,39,0.62)", marginRight: 2, fontWeight: "700" },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(255,255,255,0.90)",
  },
  chipActive: { borderColor: "rgba(0,122,255,0.35)", backgroundColor: "rgba(0,122,255,0.08)" },
  chipTxt: { color: "rgba(17,24,39,0.70)", fontWeight: "700" },
  chipTxtActive: { color: "#007AFF", fontWeight: "800" },

  // Slider
  sliderWrap: { marginTop: 14 },
  sliderLabel: { color: "rgba(17,24,39,0.70)", fontWeight: "700", marginBottom: 8 },
  sliderValue: { color: "#007AFF", fontWeight: "900" },
  coverageStat: { color: "rgba(17,24,39,0.62)", marginTop: 2, fontWeight: "600" },

  // Allocations
  panelHdrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  panelHdr: { color: "#0B1220", fontWeight: "800" },
  linkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(0,122,255,0.08)" },
  linkBtnTxt: { color: "#007AFF", fontWeight: "800" },

  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  allocTitle: { color: "rgba(17,24,39,0.85)", flex: 1, paddingRight: 12, fontWeight: "700" },
  allocControls: { flexDirection: "row", alignItems: "center", gap: 8 },

  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  stepBtnTxt: { color: "#0B1220", fontWeight: "900", fontSize: 18 },

  allocInput: {
    width: 52,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    color: "#0B1220",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 8,
    fontWeight: "800",
  },

  // Build button
  buildBtn: {
    marginTop: 14,
    backgroundColor: "#34C759", // iOS green
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buildBtnTxt: { color: "white", fontWeight: "900", fontSize: 16 },

  footerHint: {
    marginTop: 12,
    color: "rgba(17,24,39,0.55)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },
});
