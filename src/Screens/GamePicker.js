// src/Screens/GamePicker.js
//
// Aesthetic game selection screen (blocky cards, Berkeley palette)
// + Export: web → HTML download (printable cut-out cards)
//           native → PDF share via expo-print

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform, Alert, Modal, ActivityIndicator } from "react-native";
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
  loadTemplate,           // ← NEW
} from "../utils/cache";
import styles from "../styles/screens/GamePicker.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

function formatMs(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

// Build a readable "template-like" object from cards if we don't have a saved template
function buildTemplateFromCards(cards = [], title = "Deck") {
  const bySection = new Map();
  for (const c of cards) {
    const sec = (c.section || "(No section)").trim();
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec).push(c);
  }

  const sections = [];
  const toc = [];
  let ordinal = 1;

  for (const [secTitle, arr] of bySection.entries()) {
    // doc order: page asc, then original order if present
    arr.sort((a, b) => {
      const pa = Number.isFinite(a.page) ? a.page : 10 ** 9;
      const pb = Number.isFinite(b.page) ? b.page : 10 ** 9;
      if (pa !== pb) return pa - pb;
      return 0;
    });

    const pages = arr.map((x) => (Number.isFinite(x.page) ? x.page : null)).filter((x) => x != null);
    const ps = pages.length ? Math.min(...pages) : 1;
    const pe = pages.length ? Math.max(...pages) : ps;

    const firstOrd = ordinal;
    const items = arr.map((c) => {
      const term = (c.front || "").trim();
      const definition = (c.back || "").trim();
      const page = Number.isFinite(c.page) ? c.page : ps;
      const line = `${term}: ${definition}`;
      const item = {
        type: "concept",
        term,
        definition,
        source_excerpt: line,
        page,
        ordinal,
      };
      ordinal += 1;
      return item;
    });

    sections.push({
      title: secTitle || "Section",
      page_start: ps,
      page_end: pe,
      items,
    });

    toc.push({
      title: secTitle || "Section",
      page_start: ps,
      page_end: pe,
      ordinal_first: firstOrd,
    });
  }

  return {
    version: "study-template/reconstructed-v1",
    title,
    pages: null,
    sections,
    toc,
  };
}

export default function GamePicker({ route, navigation }) {
  const { deckId, buildMs: buildMsFromNav } = route.params || {};
  const [busy, setBusy] = useState(false);
  const [buildMs, setBuildMs] = useState(
    typeof buildMsFromNav === "number" ? buildMsFromNav : null
  );

  // Template modal state
  const [showTpl, setShowTpl] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);
  const [template, setTemplate] = useState(null);

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
        await saveHTML({ html, filename: `deck-${deckId}-print.html` });
      } else {
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

  // ---- NEW: Template viewer ----
  async function onViewTemplate() {
    try {
      setTplLoading(true);
      // 1) Try local cached template (saved by BuildScreen if backend returned one)
      let tpl = await loadTemplate(deckId);

      // 2) Fallback: reconstruct from cards if none cached
      if (!tpl) {
        const cards = await fetchCardsDocOrder(deckId);
        if (!cards?.length) {
          Alert.alert("Template", "No template found and unable to reconstruct from cards.");
          return;
        }
        tpl = buildTemplateFromCards(cards, `Deck ${deckId}`);
      }

      setTemplate(tpl);
      // Print pretty JSON to console for quick dev inspection
      try { console.log("Template for deck", deckId, JSON.stringify(tpl, null, 2)); } catch {}

      setShowTpl(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Template error", String(e).slice(0, 280));
    } finally {
      setTplLoading(false);
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

      {/* NEW: View Template button (opens modal and also logs pretty JSON) */}
      <Pressable style={styles.secondaryBtn} onPress={onViewTemplate} disabled={tplLoading}>
        <Text style={styles.secondaryTxt}>{tplLoading ? "Loading template…" : "View study template"}</Text>
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

      {/* Template Modal */}
      <Modal visible={showTpl} animationType="slide" onRequestClose={() => setShowTpl(false)}>
        <View style={{ flex: 1, backgroundColor: "#012a4a", paddingTop: 48 }}>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" }}>
            Study Template
          </Text>
          <Text style={{ color: "#93c5fd", textAlign: "center", marginTop: 4 }}>
            Deck #{deckId}
          </Text>

          <View style={{ paddingHorizontal: 16, paddingTop: 12, flex: 1 }}>
            {tplLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#FDB515" />
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {!template ? (
                  <Text style={{ color: "#fff", opacity: 0.8 }}>No template available.</Text>
                ) : (
                  <>
                    {(template.sections || []).map((sec, i) => (
                      <View key={`${i}-${sec.title}`} style={{ backgroundColor: "#083863", marginBottom: 12, borderRadius: 12, padding: 12 }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                          {sec.title || "Section"}
                          <Text style={{ color: "#93c5fd", fontWeight: "600" }}>
                            {`  •  p.${sec.page_start ?? "?"}${sec.page_end && sec.page_end !== sec.page_start ? `–${sec.page_end}` : ""}`}
                          </Text>
                        </Text>
                        <View style={{ height: 6 }} />
                        {(sec.items || []).slice(0, 8).map((it, j) => (
                          <Text key={j} style={{ color: "#e5f0ff", marginBottom: 6 }}>
                            {it.term ? `• ${it.term}` : "•"}{it.definition ? `: ${it.definition}` : ""}
                          </Text>
                        ))}
                        {(sec.items || []).length > 8 ? (
                          <Text style={{ color: "#93c5fd", fontStyle: "italic" }}>
                            …and {(sec.items || []).length - 8} more
                          </Text>
                        ) : null}
                      </View>
                    ))}
                    <View style={{ height: 8 }} />
                    <Pressable
                      onPress={() => {
                        try { console.log("Template JSON", JSON.stringify(template, null, 2)); } catch {}
                        Alert.alert("Template", "Printed full JSON to the console.");
                      }}
                      style={{ backgroundColor: "#FDB515", padding: 12, borderRadius: 10, alignItems: "center" }}
                    >
                      <Text style={{ color: "#072A46", fontWeight: "800" }}>Print full JSON to console</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}
          </View>

          <View style={{ padding: 12 }}>
            <Pressable onPress={() => setShowTpl(false)} style={{ backgroundColor: "#0ea5e9", padding: 12, borderRadius: 10, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
