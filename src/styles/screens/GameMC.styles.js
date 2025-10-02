// src/styles/screens/GameMC.styles.js
import { StyleSheet } from "react-native";

const BG    = "#062B52";
const BLUE  = "#0ea5e9";
const GOLD  = "#FDB515";
const TEXT  = "#E6ECF0";
const MUTED = "#9fbcd8";
const PANEL_BORDER = "rgba(255,255,255,0.08)";

export const s = StyleSheet.create({
  // ───────── Containers / common ─────────
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  muted: { color: MUTED },
  error: { color: GOLD, fontWeight: "700" },

  // ───────── Top bar ─────────
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarDesktop: {
    height: 56,
    paddingVertical: 4,
  },
  topBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  topBtnTxt: { color: TEXT, fontWeight: "700" },
  header: { color: TEXT, fontWeight: "800" },

  // ───────── Mode toggle + counters ─────────
  modeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modeToggleWrap: { flexDirection: "row", gap: 8 },
  modeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modeToggleActive: { backgroundColor: BLUE },
  modeToggleTxt: { color: TEXT, fontWeight: "700" },
  modeToggleTxtActive: { color: "white" },

  counterRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  counterPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  counterRight: { backgroundColor: "rgba(34,197,94,0.25)" },
  counterWrong: { backgroundColor: "rgba(239,68,68,0.25)" },
  counterTxt: { color: TEXT, fontWeight: "700" },
  counterPillMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterTxtMuted: { color: MUTED, fontWeight: "700" },

  // ───────── Main content layout (card + options) ─────────
  contentWrap: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  twoCol: { flexDirection: "row", columnGap: 24, rowGap: 24 },
  stacked: { flexDirection: "column", rowGap: 16 },

  // Question text (inside CardShell)
  question: {
    color: "#0b1e36",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
  },
  questionDesktop: { fontSize: 26 },

  // Options list
  optsWrap: { alignItems: "stretch", justifyContent: "flex-start" },
  opts: { gap: 10, alignSelf: "center", width: "100%" },
  optsDesktop: { gap: 12, maxWidth: 540, alignSelf: "stretch" },
  opt: {
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(6,34,66,0.85)",
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  optDesktop: { minHeight: 56, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
  optText: { color: TEXT, fontSize: 16, lineHeight: 22, fontWeight: "700" },
  optTextDesktop: { fontSize: 18, lineHeight: 24 },

  // Prev / Next buttons
  controls: { marginTop: 14, alignSelf: "center", flexDirection: "row", gap: 12 },
  controlsDesktop: { gap: 16 },
  btn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  btnTxt: { color: "#0b1e36", fontWeight: "800" },
});

export const stateStyles = StyleSheet.create({
  idle: {},
  correct: { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.65)" },
  wrong:   { backgroundColor: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.65)" },
});
