// src/Screens/GamePicker.js
//
// Study-mode selection screen
// + Export: web → HTML download (printable cut-out cards)
//           native → PDF share via expo-print

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Platform, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { colors } from "../theme";
import { Button, MetaLabel, PageHeader, Screen, Surface, notify } from "../ui";
import styles from "../styles/screens/GamePicker.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

// Developer-only controls (cache clearing, raw template JSON) are hidden from
// the normal UI. Set EXPO_PUBLIC_SHOW_DEV_TOOLS=1 (e.g. in .env.local) to show them.
const SHOW_DEV_TOOLS = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === "1";

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
    notify("Cache", "Cleared cache for this deck.");
  }
  async function clearAll() {
    await clearAllCache();
    notify("Cache", "Cleared ALL cached decks/TOCs.");
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
      notify("Export failed", String(e));
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
          notify("Exported", `Saved PDF to:\n${dest}`);
        }
      }
    } catch (e) {
      console.error(e);
      notify("Export failed", String(e).slice(0, 280));
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
          notify("Template", "No template found and unable to reconstruct from cards.");
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
      notify("Template error", String(e).slice(0, 280));
    } finally {
      setTplLoading(false);
    }
  }

  // Mode card: the whole surface is the button; "Start" is its visual affordance.
  const Card = ({ title, subtitle, onPress }) => (
    <Surface
      variant="raised"
      padding="xl"
      style={styles.card}
      onPress={onPress}
      disabled={busy}
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      <View style={styles.cardBtn}>
        <Text style={styles.cardBtnTxt}>{busy ? "Working…" : "Start"}</Text>
      </View>
    </Surface>
  );

  return (
    <Screen scroll maxWidth="content">
      <PageHeader
        title="Choose a study mode"
        subtitle={`Deck #${deckId}${buildMs != null ? ` • built in ${formatMs(buildMs)}` : ""}`}
      />

      {/* "Game 1 — Curate" (route Game1) is a verified placeholder with no
          functionality; it is hidden from the picker until it exists. */}
      <View style={styles.grid}>
        <Card
          title="Flip Drill"
          subtitle="Flip each card to check your answer, with its source section and page."
          onPress={() =>
            navigation.navigate("Game2", { deckId, mode: "basic", order: "doc" })
          }
        />
        <Card
          title="Multiple Choice"
          subtitle="Pick the right answer from a set of options."
          onPress={() =>
            navigation.navigate("GameMC", { deckId, mode: "mc", order: "doc" })
          }
        />
      </View>

      <Surface style={styles.tools}>
        <MetaLabel>Deck tools</MetaLabel>
        <View style={styles.toolRow}>
          <Button
            title="Open Table of Contents"
            variant="secondary"
            onPress={() =>
              navigation.navigate("TOC", { deckId, returnTo: "Game2", mode: "basic" })
            }
          />
          <Button
            title={tplLoading ? "Loading template…" : "View study template"}
            variant="secondary"
            onPress={onViewTemplate}
            disabled={tplLoading}
          />
          <Button
            title="Download printable cards (HTML)"
            variant="secondary"
            onPress={downloadPrintable}
            disabled={busy}
          />
          <Button
            title={busy ? "Preparing export…" : "Export / Share PDF"}
            variant="secondary"
            onPress={exportDeck}
            disabled={busy}
            loading={busy}
          />
        </View>
      </Surface>

      {SHOW_DEV_TOOLS && (
        <View style={styles.devRow}>
          <Button title="Dev: Clear cache (this deck)" variant="quiet" size="sm" onPress={clearDeckCache} />
          <Button title="Dev: Clear ALL cache" variant="quiet" size="sm" onPress={clearAll} />
        </View>
      )}

      {/* Template Modal */}
      <Modal visible={showTpl} animationType="slide" onRequestClose={() => setShowTpl(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalTop}>
            <View style={styles.modalTopInner}>
              <View style={styles.modalTitleWrap}>
                <Text accessibilityRole="header" style={styles.modalTitle}>Study Template</Text>
                <Text style={styles.modalSub}>Deck #{deckId}</Text>
              </View>
              <Button title="Close" variant="secondary" size="sm" onPress={() => setShowTpl(false)} />
            </View>
          </View>

          {tplLoading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalColumn}>
                {!template ? (
                  <Text style={styles.modalEmpty}>No template available.</Text>
                ) : (
                  <>
                    {(template.sections || []).map((sec, i) => (
                      <Surface key={`${i}-${sec.title}`} style={styles.secCard}>
                        <Text style={styles.secTitle}>{sec.title || "Section"}</Text>
                        <Text style={styles.secMeta}>
                          {`p.${sec.page_start ?? "?"}${sec.page_end && sec.page_end !== sec.page_start ? `–${sec.page_end}` : ""}`}
                        </Text>
                        {(sec.items || []).slice(0, 8).map((it, j) => (
                          <Text key={j} style={styles.secItem}>
                            {it.term ? `• ${it.term}` : "•"}{it.definition ? `: ${it.definition}` : ""}
                          </Text>
                        ))}
                        {(sec.items || []).length > 8 ? (
                          <Text style={styles.secMore}>
                            …and {(sec.items || []).length - 8} more
                          </Text>
                        ) : null}
                      </Surface>
                    ))}
                    {SHOW_DEV_TOOLS && (
                      <Button
                        title="Print full JSON to console"
                        variant="quiet"
                        size="sm"
                        onPress={() => {
                          try { console.log("Template JSON", JSON.stringify(template, null, 2)); } catch {}
                          notify("Template", "Printed full JSON to the console.");
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
