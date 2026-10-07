// src/components/source/CardCountSlider.web.js
// Web card-count slider (F4): a native <input type="range">.
//
// The community Slider renders a non-focusable View on react-native-web, so
// keyboard users could only use the −/+ buttons (F2 finding). A real range
// input is focusable and gets the browser's own keyboard support (←/→ and
// ↑/↓ by one card, Home/End to the limits), slider semantics for screen
// readers, the global focus ring, and touch dragging on mobile browsers.
// Same props and whole-number onChange as the native file, so the plan logic
// (src/source/plan.js) sees identical input on every platform.
import React from "react";
import { View } from "react-native";
import { colors } from "../../theme";

export default function CardCountSlider({ value, min, max, disabled, onChange, accessibilityLabel, valueText, style }) {
  return (
    <View style={style}>
      {React.createElement("input", {
        type: "range",
        min,
        max,
        step: 1,
        value,
        disabled: !!disabled,
        "aria-label": accessibilityLabel,
        "aria-valuetext": valueText,
        onChange: (e) => onChange(Math.round(Number(e.target.value))),
        style: {
          display: "block",
          width: "100%",
          height: 44,
          margin: 0,
          background: "transparent",
          accentColor: disabled ? colors.borderStrong : colors.accent,
          cursor: disabled ? "not-allowed" : "pointer",
        },
      })}
    </View>
  );
}
