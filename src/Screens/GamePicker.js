// src/Screens/GamePicker.js
//
// Aesthetic game selection screen (blocky cards, Berkeley palette)
// + Export: web → HTML download (printable cut-out cards)
//           native → PDF share via expo-print

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { API_BASE } from "../config";
import { deckToPrintableHTML, saveHTML } from "../utils/exportHTML";
import {
  clearAllCache,
  delCache,
  deckHandKey,
  deckTocKey,
  loadLastDeck,
} from "../utils/cache";
import styles from "../styles/screens/GamePicker.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

function formatMs(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function GamePicker({ route, navigation }) {
  const { deckId, buildMs: buildMsFromNav } = route.params || {};
  const [busy, setBusy] = useState(false);
  const [buildMs, setBuildMs] = useState(
    typeof buildMsFromNav === "number" ? buildMsFromNav : null
  );

  // If we came here from a cold start (resume), read cached meta to get build time
  useEffect(() => {
    (async () => {
      if (buildMs != null) return;
      const meta = await loadLastDeck();
      if (meta?.deckId === deckId && typeof meta.buildMs === "number") {
        setBuildMs(meta.buildMs);
      }
    })();
  }, [deckId, buildMs]);

  async function clearDeckCache() {
    await delCache(deckHandKey(deckId, "doc", "all"));
    await delCache(deckTocKey(deckId));
    Alert.alert("Cache", "Cleared cache for this deck.");
  }
  async function clearAll() {
    await clearAllCache();
    Alert.alert("Cache", "Cleared ALL cached decks/TOCs.");
  }

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
      Alert.alert("Export failed", String(e));
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
      <Text style={styles.subtle}>
        Deck #{deckId}
        {buildMs != null ? ` • built in ${formatMs(buildMs)}` : ""}
      </Text>

      <View style={styles.grid}>
        <Card
          title="Game 1 — Curate"
          subtitle="Cull weak/duplicate cards first"
          onPress={() => navigation.navigate("Game1", { deckId })}
        />
        <Card
          title="Game 2 — Mastery"
          subtitle="Short-answer drill"
          onPress={() =>
            navigation.navigate("Game2", { deckId, mode: "basic", order: "doc" })
          }
        />
        <Card
          title="Game 3 — Multiple Choice"
          subtitle="Answer with distractors"
          onPress={() =>
            navigation.navigate("GameMC", { deckId, mode: "mc", order: "doc" })
          }
        />
      </View>

      <Pressable
        style={styles.tocLink}
        onPress={() =>
          navigation.navigate("TOC", { deckId, returnTo: "Game2", mode: "basic" })
        }
      >
        <Text style={styles.tocTxt}>Open Table of Contents</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={downloadPrintable}
        disabled={busy}
      >
        <Text style={styles.secondaryTxt}>Download printable cards (HTML)</Text>
      </Pressable>

      <Pressable style={styles.devBtn} onPress={clearDeckCache}>
        <Text style={styles.devBtnTxt}>Dev: Clear cache (this deck)</Text>
      </Pressable>

      <Pressable style={styles.devBtn} onPress={clearAll}>
        <Text style={styles.devBtnTxt}>Dev: Clear ALL cache</Text>
      </Pressable>

      <Pressable style={styles.exportBtn} onPress={exportDeck} disabled={busy}>
        <Text style={styles.exportTxt}>
          {busy ? "Preparing export…" : "Export / Share PDF"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
