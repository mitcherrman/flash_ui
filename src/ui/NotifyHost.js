// src/ui/NotifyHost.js
// Web renderer for notify(). Mount once at the app root. Renders nothing on
// native, where notify() uses the OS Alert.
import React, { useEffect, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, elevation, layout, radius, spacing, text } from "../theme";
import Button from "./Button";
import { FadeIn, useReducedMotion } from "./motion";
import { resolveDialog, subscribe } from "./notifyStore";

export default function NotifyHost() {
  const [queue, setQueue] = useState([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => subscribe(setQueue), []);

  if (Platform.OS !== "web") return null;
  const d = queue[0];
  if (!d) return null;

  const cancelIndex = d.buttons.findIndex((b) => b.style === "cancel");
  const dismissIndex = cancelIndex >= 0 ? cancelIndex : d.buttons.length === 1 ? 0 : null;

  return (
    <Modal
      visible
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={() => resolveDialog(d.id, dismissIndex)}
    >
      <View style={styles.scrim}>
        <FadeIn key={d.id} style={styles.dialogWrap}>
          <View
            accessibilityRole="alert"
            accessibilityLabel={d.title || undefined}
            aria-modal
            style={styles.dialog}
          >
            {!!d.title && (
              <Text accessibilityRole="header" style={text.heading}>
                {d.title}
              </Text>
            )}
            {!!d.message && (
              <ScrollView style={styles.messageScroll}>
                <Text style={[text.secondary, !!d.title && styles.messageGap]}>{d.message}</Text>
              </ScrollView>
            )}
            <View style={styles.buttons}>
              {d.buttons.map((b, i) => (
                <Button
                  key={`${d.id}-${i}`}
                  title={b.text}
                  size="sm"
                  variant={
                    b.style === "destructive" ? "danger" : b.style === "cancel" ? "secondary" : "primary"
                  }
                  onPress={() => resolveDialog(d.id, i)}
                  style={styles.button}
                />
              ))}
            </View>
          </View>
        </FadeIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialogWrap: { width: "100%", maxWidth: 440 },
  dialog: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...elevation.high,
  },
  messageScroll: { maxHeight: 320 },
  messageGap: { marginTop: spacing.sm },
  buttons: {
    marginTop: spacing.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  button: { minWidth: layout.touchTarget * 2 },
});
