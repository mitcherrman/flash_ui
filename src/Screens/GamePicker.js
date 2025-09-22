// src/Screens/GamePicker.js
//
// Aesthetic game selection screen (blocky cards, Berkeley palette)

import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

export default function GamePicker({ route, navigation }) {
  const { deckId } = route.params || {};

  const Card = ({ title, subtitle, onPress }) => (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      <View style={styles.cardBtn}>
        <Text style={styles.cardBtnTxt}>Start</Text>
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.h1}>Choose a Mode</Text>
      <Text style={styles.subtle}>Deck #{deckId}</Text>

      <View style={styles.grid}>
        <Card
          title="Game 1 — Curate"
          subtitle="Cull weak/duplicate cards first"
          onPress={() => navigation.navigate("Game1", { deckId })}
        />
        <Card
          title="Game 2 — Mastery"
          subtitle="Short-answer drill"
          onPress={() => navigation.navigate("Game2", { deckId, mode: "basic", order: "doc" })}
        />
        <Card
          title="Game 2 — Multiple Choice"
          subtitle="Answer with distractors"
          onPress={() => navigation.navigate("Game2", { deckId, mode: "mc", order: "doc" })}
        />
      </View>

      <Pressable
        style={[styles.tocLink]}
        onPress={() =>
          navigation.navigate("TOC", { deckId, returnTo: "Game2", mode: "basic" })
        }
      >
        <Text style={styles.tocTxt}>Open Table of Contents</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003262" },
  inner: {
    paddingTop: 48,
    paddingBottom: 36,
    alignItems: "center",
  },
  h1: { color: "#E6ECF0", fontSize: 28, fontWeight: "900" },
  subtle: { color: "#A7B3C9", marginTop: 6 },

  grid: {
    marginTop: 22,
    width: "92%",
    maxWidth: 900,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },

  card: {
    flexBasis: "46%",
    minWidth: 320,
    backgroundColor: "#0B274A",
    borderColor: "#0C4A6E",
    borderWidth: 2,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { color: "#FFCD00", fontWeight: "900", fontSize: 18 },
  cardSub: { color: "#E6ECF0", marginTop: 6 },
  cardBtn: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "#FDB515",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cardBtnTxt: { color: "#082F49", fontWeight: "900" },

  tocLink: {
    marginTop: 20,
    borderColor: "#0C4A6E",
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#012B57",
  },
  tocTxt: { color: "#E6ECF0", fontWeight: "800" },
});
