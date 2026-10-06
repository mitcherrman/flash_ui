// src/components/source/StructureSummary.js
// What the analysis found: pages, words, detected sections.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MetaLabel, Surface } from "../../ui";
import { spacing, text } from "../../theme";
import { formatCount } from "../../source/plan";

function Stat({ label, value, spoken }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={spoken ?? `${label}: ${value}`}>
      <MetaLabel>{label}</MetaLabel>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function StructureSummary({ stats, sectionCount }) {
  const pages = Number(stats?.pages) || 0;
  const words = Number(stats?.words) || 0;
  return (
    <Surface>
      <Text style={styles.heading} accessibilityRole="header">
        Structure
      </Text>
      <View style={styles.row}>
        <Stat label="Pages" value={formatCount(pages)} />
        <Stat label="Words" value={formatCount(words)} />
        <Stat
          label="Sections"
          value={sectionCount ? formatCount(sectionCount) : "None"}
          spoken={sectionCount ? `Sections: ${sectionCount}` : "Sections: none found"}
        />
      </View>
      <Text style={styles.note}>
        {sectionCount
          ? "Sections come from the PDF's table of contents, with their real page ranges."
          : "This PDF has no table of contents, so there is no section plan to adjust."}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  heading: { ...text.heading },
  row: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.xxl, rowGap: spacing.md, marginTop: spacing.md },
  stat: { minWidth: 64 },
  value: { ...text.title, fontVariant: ["tabular-nums"], marginTop: spacing.xxs },
  note: { ...text.muted, marginTop: spacing.md },
});
