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
  count: { ...text.muted, marginTop: spacing.sm },

  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  item: { ...column, marginBottom: spacing.sm },
  itemCurrent: { borderColor: colors.accent },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  itemBadges: { flexDirection: "row", gap: spacing.xs },
  itemPage: { ...typeScale.small, fontWeight: "600", color: colors.textMuted, fontVariant: ["tabular-nums"] },
  itemPageUnknown: { fontWeight: "400", fontStyle: "italic" },
  itemSection: { ...typeScale.meta, color: colors.accentText, textTransform: "uppercase", marginTop: spacing.sm },
  itemFront: { ...text.body, marginTop: spacing.xs },
  empty: { ...text.secondary, textAlign: "center" },
});
