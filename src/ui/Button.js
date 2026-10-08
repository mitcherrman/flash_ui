// src/ui/Button.js
// The one button. Variants: primary | secondary | quiet | danger.
// Sizes: md (default) | sm (compact) | lg. Every size keeps a ≥44px target.
// IconButton: square 44×44 variant for single glyphs (requires a label).
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, layout, radius, spacing, typeScale, webTransition } from "../theme";
import { useReducedMotion } from "./motion";

const VARIANTS = {
  primary: {
    base: { backgroundColor: colors.accent, borderColor: colors.accent },
    hover: { backgroundColor: colors.accentHover, borderColor: colors.accentHover },
    pressed: { backgroundColor: colors.accentPressed, borderColor: colors.accentPressed },
    text: { color: colors.textOnAccent },
    spinner: colors.textOnAccent,
  },
  secondary: {
    base: { backgroundColor: colors.surface, borderColor: colors.border },
    hover: { backgroundColor: colors.sourceSurface, borderColor: colors.borderStrong },
    pressed: { backgroundColor: colors.surfaceSunken, borderColor: colors.borderStrong },
    text: { color: colors.text },
    spinner: colors.accent,
  },
  quiet: {
    base: { backgroundColor: "transparent", borderColor: "transparent" },
    hover: { backgroundColor: colors.accentSoft },
    pressed: { backgroundColor: colors.accentSoft, borderColor: colors.infoBorder },
    text: { color: colors.accentText },
    spinner: colors.accent,
  },
  danger: {
    base: { backgroundColor: colors.error, borderColor: colors.error },
    hover: { opacity: 0.92 },
    pressed: { opacity: 0.85 },
    text: { color: colors.textOnAccent },
    spinner: colors.textOnAccent,
  },
};

const SIZES = {
  sm: { container: { minHeight: layout.touchTarget, paddingHorizontal: spacing.md }, text: { fontSize: 14 } },
  md: { container: { minHeight: layout.touchTarget, paddingHorizontal: spacing.lg + 2 }, text: null },
  lg: { container: { minHeight: 52, paddingHorizontal: spacing.xl }, text: { fontSize: 16 } },
};

export default function Button({
  title,
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  square = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const sz = SIZES[size] ?? SIZES.md;
  const isDisabled = !!(disabled || loading);
  const label = title ?? children;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      // react-native-web ignores accessibilityState; this reaches the DOM (F6).
      aria-busy={!!loading}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.base,
        sz.container,
        square && styles.square,
        v.base,
        hovered && !isDisabled && v.hover,
        pressed && !isDisabled && v.pressed,
        pressed && !isDisabled && !reduceMotion && styles.pressedScale,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        webTransition(),
        style,
      ]}
      {...rest}
    >
      <View style={styles.row}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={isDisabled ? colors.disabledText : v.spinner}
            style={label != null ? styles.spinner : null}
          />
        )}
        {label != null && (
          <Text
            style={[styles.text, sz.text, v.text, isDisabled && styles.disabledText, textStyle]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Square 44×44 button for a single glyph (e.g. "+" / "–"). Label required. */
export function IconButton({ icon, accessibilityLabel, variant = "secondary", ...rest }) {
  return (
    <Button
      variant={variant}
      square
      accessibilityLabel={accessibilityLabel}
      textStyle={styles.iconText}
      title={icon}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  square: {
    width: layout.touchTarget,
    minWidth: layout.touchTarget,
    paddingHorizontal: 0,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { ...typeScale.label, textAlign: "center" },
  iconText: { fontSize: 20, lineHeight: 24, fontWeight: "600" },
  spinner: { marginRight: spacing.sm },
  pressedScale: { transform: [{ scale: 0.98 }] },
  disabled: {
    backgroundColor: colors.disabledBg,
    borderColor: colors.disabledBg,
    opacity: 1,
  },
  disabledText: { color: colors.disabledText },
  fullWidth: { alignSelf: "stretch" },
});
