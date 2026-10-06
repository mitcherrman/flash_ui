// src/ui/Surface.js
// Shared surface roles:
//   panel   – application panel (white, hairline border)
//   raised  – elevated panel / interactive card (mode cards, dialogs)
//   sunken  – recessed well (inactive fills, grouped controls)
//   source  – source/context information: a quiet "quote" surface with a
//             left rule, visually tied to the study card but never louder
// Pass `onPress` to make it an interactive card (role=button, hover lift).
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, elevation, radius, spacing, webTransition } from "../theme";
import { useReducedMotion } from "./motion";

const PADDING = { none: 0, sm: spacing.sm, md: spacing.md, lg: spacing.lg, xl: spacing.xl };

export default function Surface({
  variant = "panel",
  padding = "lg",
  onPress,
  disabled = false,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const base = [styles.base, styles[variant] ?? styles.panel, { padding: PADDING[padding] ?? padding }];

  if (!onPress) {
    return (
      <View style={[...base, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        ...base,
        hovered && !disabled && styles.hover,
        pressed && !disabled && styles.pressed,
        pressed && !disabled && !reduceMotion && styles.pressedScale,
        disabled && styles.disabled,
        webTransition(),
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.low,
  },
  sunken: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
  },
  source: {
    backgroundColor: colors.sourceSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.sourceRule,
  },
  hover: { borderColor: colors.borderStrong, ...elevation.medium },
  pressed: { backgroundColor: colors.sourceSurface },
  pressedScale: { transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.72 },
});
