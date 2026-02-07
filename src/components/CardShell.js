// src/components/CardShell.js
import React from "react";
import { View, StyleSheet, Image, Platform } from "react-native";

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
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    >
      {/* watermark (very subtle) */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Image
          source={BEAR}
          style={[
            styles.watermarkImg,
            isBack && styles.watermarkImgBack,
          ]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const RADIUS = 22;

const styles = StyleSheet.create({
  shell: {
    borderRadius: RADIUS,
    overflow: "hidden",

    // iOS-like separator border
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.18)",

    // soft shadow (native)
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 14px 26px rgba(0,0,0,0.10)",
      },
    }),
  },

  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  watermarkImg: {
    width: "120%",
    height: "120%",
    opacity: 0.06, // lower = more iOS subtle
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
});
