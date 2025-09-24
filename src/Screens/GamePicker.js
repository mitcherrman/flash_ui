// src/Screens/GamePicker.js
//
// Aesthetic game selection screen (blocky cards, Berkeley palette)

import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

import styles from "../styles/screens/GamePicker.styles";


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

