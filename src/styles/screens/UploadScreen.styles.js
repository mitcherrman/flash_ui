// src/styles/screens/UploadScreen.styles.js
import { StyleSheet } from "react-native";
import { spacing, text } from "../../theme";

export default StyleSheet.create({
  flow: { marginTop: spacing.xs, gap: spacing.lg },
  heroBtn: { marginTop: spacing.xl },
  heroNote: { ...text.muted, marginTop: spacing.sm },

  resumeCard: { marginBottom: spacing.xl },
  resumeName: { ...text.bodyStrong, marginTop: spacing.xs },
  resumeMeta: { ...text.muted, marginTop: spacing.xxs },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },

  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  panelText: { ...text.secondary, flexShrink: 1 },
  errStatus: { ...text.muted, marginTop: spacing.xs },
});
