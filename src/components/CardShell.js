// src/components/CardShell.js
import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const WATERMARK = require("../../assets/BEARlogo.png");

export default function CardShell({
  width,
  height,
  variant = "front", // "front" | "back"
  children,
}) {
  const isBack = variant === "back";
  return (
    <View style={[styles.wrap, { width, height }]}>
      <View style={[styles.card, isBack && styles.cardBack]}>
        {/* soft inner shadow */}
        {isBack && (
          <>
            <LinearGradient
              colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.02)", "rgba(0,0,0,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.02)", "rgba(0,0,0,0.06)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </>
        )}

        {/* watermark */}
        <Image
          source={WATERMARK}
          resizeMode="contain"
          pointerEvents="none"
          style={[
            styles.watermark,
            isBack && { transform: [{ scaleX: -1 }] },
          ]}
        />

        {/* content */}
        <View style={styles.inner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    overflow: "hidden",
  },
  cardBack: { backgroundColor: "#FFCD00" },
  watermark: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 120,
    height: 100,
    opacity: 0.08,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
