// src/components/CardShell.js
import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";

const BEAR = require("../../assets/BEARlogo.png");

export default function CardShell({
  width = 720,
  height = Math.round(720 * 0.6),
  variant = "front", // 'front' | 'back'
  children,
  style,

  // NEW (optional) for custom cards
  imageUri = null,
  label = null,
}) {
  const isBack = variant === "back";
  const showCustomFace = !!imageUri && (label != null);

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
      {/* watermark */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Image
          source={BEAR}
          style={[styles.watermarkImg, isBack && styles.watermarkImgBack]}
          resizeMode="contain"
        />
      </View>

      {/* Foreground */}
      <View style={styles.inner}>
        {showCustomFace ? (
          <View style={styles.customFace}>
            <View style={styles.circleWrap}>
              <Image source={{ uri: imageUri }} style={styles.circleImg} />
            </View>
            <Text style={styles.customLabel} numberOfLines={2}>
              {String(label || "").trim() || "—"}
            </Text>
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const RADIUS = 26;

const styles = StyleSheet.create({
  shell: {
    borderRadius: RADIUS,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkImg: {
    width: "120%",
    height: "120%",
    opacity: 0.10,
  },
  watermarkImgBack: {
    transform: [{ scaleX: -1 }],
  },

  inner: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // NEW: custom face layout
  customFace: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 14,
  },
  circleWrap: {
    width: "74%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  circleImg: {
    width: "100%",
    height: "100%",
  },
  customLabel: {
    color: "#0B1E36",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
});
