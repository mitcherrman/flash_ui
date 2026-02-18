// src/styles/screens/Leaderboard.styles.js
import { StyleSheet, Platform } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // iOS grouped background
    paddingTop: Platform.OS === "web" ? 24 : 54,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  backTxt: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#6E6E73",
    fontWeight: "500",
    textAlign: "center",
  },

  center: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingTxt: {
    marginTop: 10,
    color: "#6E6E73",
    fontWeight: "500",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111111",
  },
  errorMsg: {
    color: "#6E6E73",
    textAlign: "center",
    marginBottom: 18,
  },

  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnTxt: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  emptyTxt: {
    color: "#6E6E73",
    fontWeight: "600",
  },

  listContent: {
    paddingBottom: 40,
  },

  cardWrap: {
    alignSelf: "center",
    marginBottom: 16,
  },

  // Soft “depth” wrapper (iOS-like)
  depthWrap: {
    borderRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6, // Android
  },

  // A subtle outline so cards pop on the grouped background
  outline: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  rankPill: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  rankTxt: {
    color: "#111111",
    fontWeight: "700",
    fontSize: 12,
  },

  cardInner: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  cardFront: {
    color: "#0B1E36",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },

  meta: {
    marginTop: 10,
    fontSize: 12,
    color: "#6E6E73",
    textAlign: "center",
    fontWeight: "500",
  },
});
