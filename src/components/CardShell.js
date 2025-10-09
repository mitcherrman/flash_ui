// src/components/CardShell.js
import React from "react";
import { View, StyleSheet, Image } from "react-native";

const BEAR = require("../../assets/BEARlogo.png");

export default function CardShell({
  width = 720,
  height = Math.round(720 * 0.6),
  variant = "front", // 'front' | 'back'
  children,
  style,
}) {
  const isBack = variant === "back";

  return (
    <View
      style={[
        styles.shell,
        {
          width,
          height,
          backgroundColor: isBack ? "#FDB515" : "#FFFFFF",
        },
        style,
      ]}
    >
      {/* Full-bleed watermark: centered + overscaled so the visible bear covers the card */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Image
          source={BEAR}
          style={[styles.watermarkImg, isBack && styles.watermarkImgBack]}
          resizeMode="contain"
        />
      </View>

      {/* Foreground content */}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const RADIUS = 24;

const styles = StyleSheet.create({
  shell: {
    borderRadius: RADIUS,
    overflow: "hidden", // clip to rounded corners
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // A full-card absolute layer that centers the watermark image
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  // Overscale so the visible bear covers the card even if the PNG has padding
  // Tweak 135–160% to taste
  watermarkImg: {
    width: "120%",
    height: "120%",
    opacity: 0.12,
  },
  watermarkImgBack: {
    transform: [{ scaleX: -1 }], // mirror the bear on the back
  },

  inner: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
