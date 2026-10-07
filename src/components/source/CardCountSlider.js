// src/components/source/CardCountSlider.js
// Native (iOS/Android) card-count slider: the community Slider, exactly as
// F2 configured it. The web build uses CardCountSlider.web.js instead (F4).
// Both take the same props and report whole numbers through onChange.
import React from "react";
import Slider from "@react-native-community/slider";
import { colors } from "../../theme";

export default function CardCountSlider({ value, min, max, disabled, onChange, accessibilityLabel, valueText, style }) {
  return (
    <Slider
      style={style}
      minimumValue={min}
      maximumValue={max}
      step={1}
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(Math.round(v))}
      minimumTrackTintColor={disabled ? colors.borderStrong : colors.accent}
      maximumTrackTintColor={colors.border}
      thumbTintColor={disabled ? colors.borderStrong : colors.accent}
      accessibilityLabel={accessibilityLabel}
      // aria-* props: read by RN ≥ 0.71.
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={!!disabled}
    />
  );
}
