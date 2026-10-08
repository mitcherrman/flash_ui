// src/ui/Chip.js
// Selectable pill for single-choice option groups (exposed as radio buttons).
// Wrap a set in <ChipGroup label="…"> for the radiogroup role.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, layout, radius, spacing, typeScale, webTransition } from "../theme";

export default function Chip({ label, selected = false, onPress, accessibilityLabel, disabled = false, style }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: !!selected, selected: !!selected, disabled: !!disabled }}
      // react-native-web ignores accessibilityState; this reaches the DOM (F6).
      aria-checked={!!selected}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.chip,
        selected ? styles.selected : hovered && styles.hover,
        pressed && !selected && styles.pressed,
        webTransition(),
        style,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup({ label, children, style }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: layout.touchTarget,
    minWidth: layout.touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hover: { borderColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceSunken },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  text: { ...typeScale.label, fontSize: 14, color: colors.textSecondary },
  textSelected: { color: colors.accentText },
});
