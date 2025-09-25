// src/Screens/GamePicker.js
//
// Aesthetic game selection screen (blocky cards, Berkeley palette)
// + Export: web → HTML download (printable cut-out cards)
//           native → PDF share via expo-print

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { API_BASE } from "../config";
import { deckToPrintableHTML, saveHTML } from "../utils/exportHTML";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GamePicker({ route, navigation }) {
  const { deckId } = route.params || {};
  const [busy, setBusy] = useState(false);

  async function fetchCardsDocOrder(id) {
    const params = new URLSearchParams();
    params.set("deck_id", String(id));
    params.set("n", "all");
    params.set("order", "doc");
    const r = await fetch(`${API_ROOT}/hand/?${params.toString()}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Web-friendly: downloads an .html you can print (duplex, flip long edge)
  async function downloadPrintable() {
    try {
      const cards = await fetchCardsDocOrder(deckId);
      const html = deckToPrintableHTML({ deckName: `Deck ${deckId}`, cards });
      await saveHTML({ html, filename: `deck-${deckId}-print.html` });
    } catch (e) {
      console.error(e);
      alert(String(e));
    }
  }

  // Native-friendly: renders the same HTML to a PDF and opens share sheet
  async function exportDeck() {
    try {
      setBusy(true);
      const cards = await fetchCardsDocOrder(deckId);
      const deckName = `Deck ${deckId}`;
      const html = deckToPrintableHTML({ deckName, cards });

      if (Platform.OS === "web") {
        // On web, just use the printable HTML flow
        await saveHTML({ html, filename: `deck-${deckId}-print.html` });
      } else {
        // Native: make a PDF and share/save
        const { uri } = await Print.printToFileAsync({ html });
        const dest = `${FileSystem.documentDirectory}${deckName.replace(/\s+/g, "_")}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: dest });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(dest, { mimeType: "application/pdf" });
        } else {
          Alert.alert("Exported", `Saved PDF to:\n${dest}`);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Export failed", String(e).slice(0, 280));
    } finally {
      setBusy(false);
    }
  }

  const Card = ({ title, subtitle, onPress }) => (
    <Pressable style={styles.card} onPress={onPress} disabled={busy}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      <View style={styles.cardBtn}>
        <Text style={styles.cardBtnTxt}>{busy ? "Working…" : "Start"}</Text>
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
          title="Game 3 — Multiple Choice"
          subtitle="Answer with distractors"
          onPress={() => navigation.navigate("GameMC", { deckId, mode: "mc", order: "doc" })}
        />
      </View>

      <Pressable
        style={styles.tocLink}
        onPress={() => navigation.navigate("TOC", { deckId, returnTo: "Game2", mode: "basic" })}
      >
        <Text style={styles.tocTxt}>Open Table of Contents</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={downloadPrintable}
        disabled={busy}
      >
        <Text style={styles.secondaryTxt}>
          Download printable cards (HTML)
        </Text>
      </Pressable>

      <Pressable
        style={styles.exportBtn}
        onPress={exportDeck}
        disabled={busy}
      >
        <Text style={styles.exportTxt}>
          {busy ? "Preparing export…" : "Export / Share PDF"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/* ---- Styles (local to this screen) ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003262" },
  inner: { paddingTop: 48, paddingBottom: 36, alignItems: "center" },
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

  secondaryBtn: {
    marginTop: 16,
    borderColor: "#0C4A6E",
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#012B57",
  },
  secondaryTxt: { color: "#E6ECF0", fontWeight: "800" },

  exportBtn: {
    marginTop: 12,
    borderColor: "#0C4A6E",
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#0B3D91",
  },
  exportTxt: { color: "#FFCD00", fontWeight: "900" },
});
