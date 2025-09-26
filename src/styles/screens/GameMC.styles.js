// src/styles/screens/GameMC.styles.js
import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003262", alignItems: "center", paddingTop: 18 },
  center: { flex: 1, backgroundColor: "#003262", alignItems: "center", justifyContent: "center" },

  topBar: {
    width: "92%",
    maxWidth: 900,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topBtn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  topBtnTxt: { color: "#082F49", fontWeight: "900" },

  header: { color: "#E6ECF0", fontWeight: "800" },

  question: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },

  opts: {
    width: "92%",
    maxWidth: 720,
    marginTop: 14,
    gap: 10,
  },
  opt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  optText: { color: "#0f172a", fontWeight: "800", textAlign: "center" },

  controls: { flexDirection: "row", marginTop: 16, gap: 10 },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnTxt: { color: "#082F49", fontWeight: "900" },

  muted: { color: "#E6ECF0", marginTop: 8 },
  error: { color: "#FDB515" },
});

export const stateStyles = StyleSheet.create({
  idle: { backgroundColor: "#FFFFFF", borderColor: "#0C4A6E" },
  correct: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  wrong: { backgroundColor: "#ef4444", borderColor: "#b91c1c" },
});
