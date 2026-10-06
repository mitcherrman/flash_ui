// src/ui/Screen.js
// Application screen shell: background, safe areas, responsive gutters, and a
// centred content column with a max width on tablet/web (so wide windows do
// not get a stretched phone layout).
//
//   <Screen scroll maxWidth="narrow" header={<PageHeader … />}>…</Screen>
//
// Study screens that size themselves from the window (FlipDrill, GameMC) keep
// their own layout and only take colours from the theme.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, resolveMaxWidth, spacing } from "../theme";
import { useLayout } from "./useLayout";

export default function Screen({
  children,
  header = null,
  footer = null,
  scroll = false,
  center = false,
  maxWidth = "content",
  edges = ["top", "bottom", "left", "right"],
  style,
  contentStyle,
  keyboardShouldPersistTaps = "handled",
}) {
  const { gutter, isPhone } = useLayout();
  const padV = isPhone ? spacing.xl : spacing.xxl;

  const column = (
    <View style={[styles.column, { maxWidth: resolveMaxWidth(maxWidth) }, contentStyle]}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, style]}>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: gutter, paddingTop: padV, paddingBottom: padV + spacing.lg },
            center && styles.centerV,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {column}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.fill,
            styles.static,
            { paddingHorizontal: gutter, paddingTop: padV, paddingBottom: padV },
            center && styles.centerV,
          ]}
        >
          {column}
        </View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  static: { alignItems: "center" },
  centerV: { justifyContent: "center" },
  column: { width: "100%" },
});
