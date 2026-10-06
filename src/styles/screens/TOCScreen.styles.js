// src/styles/screens/TOCScreen.styles.js
import { StyleSheet } from "react-native";
import { colors, layout, spacing, text, typeScale } from "../../theme";

const column = { width: "100%", maxWidth: layout.maxWidth.content, alignSelf: "center" };

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  column,
  header: { marginBottom: spacing.md },
  searchInput: {},

  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  item: { ...column, marginBottom: spacing.sm },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemPage: { ...typeScale.small, fontWeight: "600", color: colors.textMuted, fontVariant: ["tabular-nums"] },
  itemSection: { ...typeScale.meta, color: colors.accentText, textTransform: "uppercase", marginTop: spacing.sm },
  itemFront: { ...text.body, marginTop: spacing.xs },
});
