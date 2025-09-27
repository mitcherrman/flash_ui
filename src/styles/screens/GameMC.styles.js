// src/styles/screens/GameMC.styles.js
import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003262", paddingHorizontal: 12, paddingTop: 10 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003262",
  },
  muted: { color: "#E6ECF0", marginTop: 10, fontSize: 16 },
  error: { color: "#FFCDD2", fontSize: 16 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  header: { color: "#E6ECF0", fontWeight: "900", fontSize: 18 },
  topBtn: {
    backgroundColor: "#0B3D91",
    borderWidth: 1,
    borderColor: "#0C4A6E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  topBtnTxt: { color: "#FFCD00", fontWeight: "800" },

  // Mode bar
  modeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modeToggleWrap: {
    flexDirection: "row",
    backgroundColor: "#012B57",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0C4A6E",
    overflow: "hidden",
  },
  modeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeToggleActive: {
    backgroundColor: "#0ea5e9",
  },
  modeToggleTxt: {
    color: "#E6ECF0",
    fontWeight: "800",
  },
  modeToggleTxtActive: {
    color: "white",
  },

  counterRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  counterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  counterRight: { backgroundColor: "#10b981" },
  counterWrong: { backgroundColor: "#ef4444" },
  counterTxt: { color: "white", fontWeight: "900" },

  counterPillMuted: {
    backgroundColor: "#0B274A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0C4A6E",
  },
  counterTxtMuted: { color: "#A7B3C9", fontWeight: "800" },

  question: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 22,
    textAlign: "center",
  },

  opts: {
    marginTop: 14,
    gap: 10,
  },
  opt: {
    backgroundColor: "#0b1226",
    borderWidth: 2,
    borderColor: "#0C4A6E",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optText: {
    color: "#E6ECF0",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  controls: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnTxt: { color: "#082F49", fontWeight: "900" },
});

// Option state colors
export const stateStyles = StyleSheet.create({
  idle: { borderColor: "#0C4A6E" },
  correct: { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.15)" },
  wrong: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.15)" },
});
