// src/ui/TextField.js
// Themed TextInput: 44px target, ≥3:1 boundary, accent border while focused.
import React, { forwardRef, useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors, layout, radius, spacing, typeScale, webTransition } from "../theme";

const TextField = forwardRef(function TextField({ style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.accent}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, focused && styles.focused, webTransition(["border-color"]), style]}
      {...rest}
    />
  );
});

export default TextField;

const styles = StyleSheet.create({
  input: {
    ...typeScale.body,
    color: colors.text,
    minHeight: layout.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  focused: { borderColor: colors.accent },
});
