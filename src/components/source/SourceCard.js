// src/components/source/SourceCard.js
// The selected PDF: name, size, analysis state, replace/remove.
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Badge, Button, MetaLabel, Surface } from "../../ui";
import { colors, spacing, text } from "../../theme";
import { formatFileSize } from "../../source/plan";

// Long filenames without spaces must wrap instead of widening the page.
export const breakWord = Platform.OS === "web" ? { wordBreak: "break-word", overflowWrap: "anywhere" } : null;

const STATUS = {
  analyzing: { tone: "neutral", label: "Analyzing…" },
  ready: { tone: "success", label: "Analyzed" },
  error: { tone: "error", label: "Not analyzed" },
};

export default function SourceCard({ file, status, onReplace, onRemove, busy = false }) {
  const size = formatFileSize(file?.size);
  const st = STATUS[status];
  return (
    <Surface variant="source" padding="md">
      <View style={styles.top}>
        <View style={styles.info}>
          <MetaLabel>Source PDF</MetaLabel>
          <Text style={[styles.name, breakWord]} numberOfLines={3}>
            {file?.name}
          </Text>
          {!!size && <Text style={styles.meta}>{size}</Text>}
        </View>
        {st && (
          <Badge tone={st.tone} accessibilityLabel={`Status: ${st.label}`} style={styles.badge}>
            {st.label}
          </Badge>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          title="Replace PDF"
          size="sm"
          variant="secondary"
          onPress={onReplace}
          disabled={busy}
          accessibilityLabel={`Replace ${file?.name ?? "PDF"} with another PDF`}
          accessibilityHint="Opens a file picker for PDF documents"
        />
        <Button
          title="Remove"
          size="sm"
          variant="quiet"
          onPress={onRemove}
          accessibilityLabel={`Remove ${file?.name ?? "PDF"}`}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  info: { flex: 1, minWidth: 0 },
  name: { ...text.bodyStrong, marginTop: spacing.xxs },
  meta: { ...text.muted, marginTop: spacing.xxs },
  badge: { flexShrink: 0 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
