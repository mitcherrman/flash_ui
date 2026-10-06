// src/components/source/SectionPlan.js
// Per-section allocation with the analysis' real page ranges.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, IconButton, Surface, TextField } from "../../ui";
import { colors, spacing, text } from "../../theme";
import { CARD_LIMITS, formatPageRange } from "../../source/plan";
import { breakWord } from "./SourceCard";

function SectionRow({ section, index, last, canAdd, perSection, onBump, onSet }) {
  const pages = formatPageRange(section);
  const name = section.title || `Section ${index + 1}`;
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.info}>
        <Text style={[styles.title, breakWord]}>{name}</Text>
        <Text style={styles.pages}>{pages}</Text>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="–"
          accessibilityLabel={`Fewer cards for ${name}`}
          disabled={section.cards <= 0}
          onPress={() => onBump(index, -1)}
        />
        <TextField
          style={styles.input}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          value={String(section.cards ?? 0)}
          onChangeText={(t) => onSet(index, t)}
          accessibilityLabel={`Cards for ${name}, ${pages}`}
          accessibilityHint={`0 to ${perSection}`}
        />
        <IconButton
          icon="+"
          accessibilityLabel={`More cards for ${name}`}
          disabled={!canAdd || section.cards >= perSection}
          onPress={() => onBump(index, +1)}
        />
      </View>
    </View>
  );
}

export default function SectionPlan({ sections, total, limits, manual, summary, onBump, onSet }) {
  const roomLeft = total < CARD_LIMITS.max;
  return (
    <Surface>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Section plan
        </Text>
        {manual && <Badge tone="highlight">Edited</Badge>}
      </View>
      <Text style={styles.sub}>
        {total} {total === 1 ? "card" : "cards"} across {summary.sectionCount}{" "}
        {summary.sectionCount === 1 ? "section" : "sections"} · up to {limits.perSection} per section
      </Text>
      {summary.sectionsWithout > 0 ? (
        <Text style={styles.gap}>
          {summary.sectionsWithout} {summary.sectionsWithout === 1 ? "section gets" : "sections get"} no cards.
        </Text>
      ) : (
        <Text style={styles.covered}>Every section gets at least one card.</Text>
      )}

      <View style={styles.list}>
        {sections.map((s, i) => (
          <SectionRow
            key={`${i}-${s.title}`}
            section={s}
            index={i}
            last={i === sections.length - 1}
            canAdd={roomLeft}
            perSection={limits.perSection}
            onBump={onBump}
            onSet={onSet}
          />
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  heading: { ...text.heading },
  sub: { ...text.small, marginTop: spacing.xs },
  gap: { ...text.small, color: colors.warning, marginTop: spacing.xxs },
  covered: { ...text.muted, marginTop: spacing.xxs },
  list: { marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: spacing.md,
    rowGap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  info: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0 },
  title: { ...text.bodyStrong },
  pages: { ...text.muted, marginTop: spacing.xxs },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginLeft: "auto" },
  input: { width: 52, textAlign: "center", paddingHorizontal: spacing.xs, fontVariant: ["tabular-nums"] },
});
