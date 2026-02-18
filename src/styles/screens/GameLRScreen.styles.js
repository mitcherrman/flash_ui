// src/styles/screens/GameLRScreen.styles.js
import { StyleSheet, Platform } from "react-native";

const IOS = Platform.OS === "ios";

// iOS neutrals
const BG = "#F2F2F7"; // iOS grouped background
const SURFACE = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#6B7280";
const BORDER = "rgba(60,60,67,0.16)";
const BORDER_SOFT = "rgba(60,60,67,0.10)";
const BLUE = "#007AFF";

// iOS shadows (soft, realistic)
const shadowLg = IOS
  ? {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    }
  : { elevation: 10 };

const shadowSm = IOS
  ? {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    }
  : { elevation: 6 };

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 10, color: MUTED, fontWeight: "700" },
  errTitle: { color: TEXT, fontWeight: "900", fontSize: 16 },
  errBody: { marginTop: 8, color: MUTED, textAlign: "center", lineHeight: 20 },

  // ── Top bar ─────────────────────────────────────────────
  topBar: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titleWrap: { alignItems: "center" },
  title: { color: TEXT, fontWeight: "900", fontSize: 16 },
  subtitle: { color: MUTED, marginTop: 2, fontWeight: "700" },

  pillBtn: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    ...shadowSm,
  },
  pillBtnTxt: { color: BLUE, fontWeight: "800" },

  tocBtn: {
    backgroundColor: "rgba(0,122,255,0.10)",
    borderColor: "rgba(0,122,255,0.22)",
  },
  tocTxt: { color: BLUE },

  // ── Content ─────────────────────────────────────────────
  content: { flex: 1, paddingHorizontal: 14, paddingBottom: 14 },

  pairWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  pairWrapStack: {
    flexDirection: "column",
    gap: 14,
  },

  lane: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.60)",
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 22,
    padding: 12,
    ...shadowSm,
  },

  laneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  laneTitle: { color: TEXT, fontWeight: "900" },

  lanePill: {
    backgroundColor: "rgba(0,122,255,0.10)",
    borderColor: "rgba(0,122,255,0.18)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  lanePillTxt: { color: BLUE, fontWeight: "800", fontSize: 12 },

  // ── Card depth stack ────────────────────────────────────
  cardHold: {
    alignSelf: "center",
    position: "relative",
    borderRadius: 26,
  },

  // The actual CardShell surface (we disable its default shadow and apply our own)
  cardSurface: {
    borderRadius: 26,
    shadowOpacity: 0, // important: avoid double shadows from CardShell
  },

  stackBack1: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    bottom: -6,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.10)",
    transform: [{ rotate: "-0.6deg" }],
    ...shadowLg,
  },
  stackBack2: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 18,
    bottom: -10,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.08)",
    transform: [{ rotate: "0.5deg" }],
  },

  prompt: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 6,
  },

  // Feedback overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "transparent",
  },
  overlayPick: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.22)",
  },
  overlayLose: {
    backgroundColor: "rgba(239,68,68,0.07)",
    borderColor: "rgba(239,68,68,0.16)",
  },

  // Hint
  hintWrap: {
    marginTop: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 12,
    ...shadowSm,
  },
  hintTxt: {
    color: MUTED,
    fontWeight: "650",
    lineHeight: 20,
    textAlign: "center",
  },
  hintAccent: { color: TEXT, fontWeight: "900" },
});
