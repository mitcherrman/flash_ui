// src/styles/screens/GameLRScreen.styles.js
import { StyleSheet, Platform } from "react-native";

const IOS_BG = "#F2F2F7";          // iOS grouped background
const SURFACE = "#FFFFFF";         // cards / sheets
const SEPARATOR = "rgba(60,60,67,0.18)"; // iOS separator-ish
const TEXT = "#111827";            // near-black
const SUBTLE = "rgba(60,60,67,0.60)";
const SUBTLE2 = "rgba(60,60,67,0.45)";
const ACCENT = "#007AFF";          // iOS blue

const R = { xl: 16, xxl: 22, pill: 999 };

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: IOS_BG },

  // ── Top bar ────────────────────────────────────────────────────────────
  topBar: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: IOS_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEPARATOR,
  },

  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
  },
  navBtnTxt: {
    color: ACCENT,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  titleWrap: { alignItems: "center", justifyContent: "center" },
  title: { color: TEXT, fontWeight: "800", fontSize: 14, letterSpacing: 0.2 },
  subtitle: { marginTop: 2, color: SUBTLE2, fontWeight: "600", fontSize: 12 },

  // ── Content ────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  pairWrap: {
    width: "100%",
    maxWidth: 980,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
    justifyContent: "center",
  },

  lane: {
    flex: 1,
    minWidth: 280,
    borderRadius: R.xxl,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
    padding: 12,
  },

  laneLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  laneLabel: {
    color: SUBTLE,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  lanePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
    backgroundColor: "#F2F4F7",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
  },
  lanePillTxt: { color: SUBTLE, fontWeight: "700", fontSize: 12 },

  // this holds your CardShell
  cardHold: {
    flex: 1,
    borderRadius: R.xxl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
    backgroundColor: SURFACE,
  },

  // text inside CardShell (front prompt)
  prompt: {
    color: "#0B1220",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: 0.1,
  },
  promptSmall: { fontSize: 18 },

  // bottom hint
  hintWrap: {
    width: "100%",
    maxWidth: 980,
    marginTop: 14,
    padding: 12,
    borderRadius: R.xl,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
  },
  hintTxt: {
    color: SUBTLE,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
  hintAccent: { color: TEXT, fontWeight: "800" },

  // CTA buttons inside lanes (Choose Left/Right)
  chooseBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.pill,
    backgroundColor: "rgba(0,122,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,122,255,0.28)",
  },
  chooseBtnTxt: { color: ACCENT, fontWeight: "800" },

  // overlays for pick feedback
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: R.xxl,
    borderWidth: 2,
    borderColor: "transparent",
  },
  overlayPick: {
    borderColor: "rgba(0,122,255,0.55)",
    backgroundColor: "rgba(0,122,255,0.08)",
  },
  overlayLose: {
    borderColor: "rgba(60,60,67,0.18)",
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  // iOS-ish shadow on native; subtle on web
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 2 },
    web: { boxShadow: "0 14px 26px rgba(0,0,0,0.10)" },
    default: {},
  }),
});
