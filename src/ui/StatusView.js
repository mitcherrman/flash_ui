// src/ui/StatusView.js
// Full-area loading / empty / error state, centred in a themed screen.
//
//   <StatusView loading title="Loading cards…" />
//   <StatusView tone="error" title="Couldn't load cards" message={err} action={…} />
//
// Workflow-specific recovery (retry, back to upload) is added by F2/F3 via
// `action`; F1 only provides the presentation.
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, layout, spacing, text } from "../theme";
import { FadeIn } from "./motion";
import Notice from "./Notice";

export default function StatusView({ loading = false, tone = "info", title, message, action, style }) {
  return (
    <SafeAreaView style={[styles.root, style]}>
      <FadeIn style={styles.inner}>
        {loading ? (
          <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel={title || "Loading"}>
            <ActivityIndicator size="large" color={colors.accent} />
            {!!title && <Text style={[text.secondary, styles.loadingText]}>{title}</Text>}
          </View>
        ) : tone === "empty" ? (
          <View style={styles.empty}>
            {!!title && <Text style={[text.heading, styles.centerText]}>{title}</Text>}
            {!!message && <Text style={[text.secondary, styles.centerText, styles.gap]}>{message}</Text>}
            {action ? <View style={styles.action}>{action}</View> : null}
          </View>
        ) : (
          <Notice tone={tone} title={title} message={message} action={action} />
        )}
      </FadeIn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  inner: { width: "100%", maxWidth: layout.maxWidth.narrow },
  loading: { alignItems: "center" },
  loadingText: { marginTop: spacing.md, textAlign: "center" },
  empty: { alignItems: "center" },
  centerText: { textAlign: "center" },
  gap: { marginTop: spacing.xs },
  action: { marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm },
});
