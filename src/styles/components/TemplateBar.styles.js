// src/styles/components/TemplateBar.styles.js
import { StyleSheet, Platform } from "react-native";

export default StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#062B52",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "web" ? 12 : 6,
    zIndex: 50,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  btnTxt: { color: "#032e5d", fontWeight: "800" },
  hint: { color: "#93c5fd", opacity: 0.9 },

  modalRoot: { flex: 1, backgroundColor: "#001f3f" },
  modalTop: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#032e5d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalCloseBtn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalCloseTxt: { color: "#032e5d", fontWeight: "800" },
  modalScroll: { padding: 16 },

  secCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  secTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 4 },
  secMeta: { color: "#93c5fd", marginBottom: 8 },
  itemRow: { marginBottom: 8 },
  itemTerm: { color: "#e5e7eb", fontWeight: "700" },
  itemDef: { color: "#cbd5e1" },
  noSec: { color: "#93c5fd" },
});
