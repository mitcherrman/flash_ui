// src/components/study/SourcePanel.js
// Section / page / source excerpt for one card (F3), shared by Flip Drill and
// Multiple Choice. Before the learner commits, only metadata shows; the
// excerpt (the passage the answer was written from) appears after reveal.
import React from "react";
import { Platform, Switch, Text, View } from "react-native";
import { colors } from "../../theme";
import { cardProvenance, sourceView } from "../../study/provenance";
import styles from "../../styles/components/SourcePanel.styles";

export default function SourcePanel({
  card,
  template = null,
  revealed,
  showSource = true,
  onToggleSource = null,
  style,
}) {
  const { section, pageLabel, rangeLabel, context } = cardProvenance(card, template);
  const { excerpt, note } = sourceView({ card, revealed, showSource });

  return (
    <View style={[styles.panel, style]} accessibilityLabel="Source">
      <View style={styles.row}>
        <Text style={styles.key}>Section</Text>
        <Text style={styles.val}>{section || "Unknown section"}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.key}>Page</Text>
        <Text style={styles.val}>
          {pageLabel}
          {!!rangeLabel && <Text style={styles.qualifier}>{` · ${rangeLabel}`}</Text>}
          {!!context && <Text style={styles.qualifier}>{` · ${context}`}</Text>}
        </Text>
      </View>

      {revealed && onToggleSource && !!card?.excerpt && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show source excerpt</Text>
          <Switch
            value={showSource}
            onValueChange={onToggleSource}
            thumbColor={colors.surface}
            {...(Platform.OS === "web" ? { activeThumbColor: colors.surface } : null)}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            accessibilityLabel="Show source excerpt"
          />
        </View>
      )}

      {excerpt ? (
        <Text style={styles.excerpt} accessibilityLabel={`Source excerpt: ${excerpt}`}>
          “{excerpt}”
        </Text>
      ) : note ? (
        <Text style={styles.note}>{note}</Text>
      ) : null}
    </View>
  );
}
