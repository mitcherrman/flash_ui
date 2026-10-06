// src/Screens/UploadScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE } from "../config";

import { loadLastDeck, clearCache } from "../utils/cache";

import { colors } from "../theme";
import {
  Badge, BrandMark, Button, Chip, ChipGroup, IconButton, MetaLabel,
  Notice, PageHeader, ProductSteps, Screen, Surface, TextField, notify,
} from "../ui";
import styles from "../styles/screens/UploadScreen.styles";

function formatMs(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function UploadScreen({ navigation }) {
  const [file, setFile]               = useState(null);
  const [cardsWanted, setCardsWanted] = useState(12);
  const [coverageMode, setCoverage]   = useState("even"); // "even" | "section"

  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats]         = useState(null);
  const [err, setErr]             = useState("");

  const [allocs, setAllocs]        = useState([]);
  const [allocDirty, setAllocDirty]= useState(false);

  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets[0];
      setFile(f);
      setStats(null);
      setErr("");
      setAllocs([]);
      setAllocDirty(false);
      analyzeFile(f).catch(() => {});
    } catch (e) {
      console.error(e);
      notify("Could not open the file picker.");
    }
  }

  async function analyzeFile(f) {
    try {
      setAnalyzing(true);
      const fd = new FormData();
      const filename = f.name ?? "document.pdf";
      const mime     = f.mimeType ?? "application/pdf";

      if (Platform.OS === "web") {
        const blob = await fetch(f.uri).then(r => r.blob());
        fd.append("file", new File([blob], filename, { type: mime }));
      } else {
        fd.append("file", { uri: f.uri, name: filename, type: mime });
      }

      const url = `${API_BASE}/api/flashcards/analyze/`;
      const r   = await fetch(url, { method: "POST", body: fd });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`HTTP ${r.status} – ${t.slice(0,150)}`);
      }
      const json = await r.json();
      setStats(json);
      if (json?.recommended_cards) setCardsWanted(json.recommended_cards);
    } catch (e) {
      console.error("[UploadScreen] analyze error", e);
      setErr(String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  const [cached, setCached] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const meta = await loadLastDeck();
      if (alive) setCached(meta);
    })();
    return () => { alive = false; };
  }, []);



  useEffect(() => {
    if (!stats?.per_section_allocation) return;
    const total = cardsWanted || stats.recommended_cards || 12;
    const seeded = stats.per_section_allocation.map(s => ({
      title: s.title,
      page_start: s.page_start,
      page_end: s.page_end,
      share: s.share ?? (stats.words ? (s.words / stats.words) : 0),
      cards: Math.max(0, Math.round((s.cards ?? 0) || ((s.share ?? 0) * total))),
    }));
    setAllocs(seeded);
    setAllocDirty(false);
  }, [stats]);

  useEffect(() => {
    if (!allocs.length || allocDirty) return;
    const tot = cardsWanted || 0;
    const shares = allocs.map(a => a.share ?? 0);
    const sumShare = shares.reduce((s, x) => s + x, 0) || 1;
    const next = allocs.map((a, i) => ({
      ...a,
      cards: Math.max(0, Math.round((shares[i] / sumShare) * tot))
    }));
    setAllocs(next);
  }, [cardsWanted]);

  function resumeCached() {
    if (!cached?.deckId) return;
    navigation.navigate("Picker", { deckId: cached.deckId });
  }

  async function discardCached() {
    await clearCache();
    setCached(null);
  }


  function setSectionCount(index, val) {
    const n = Math.max(0, Math.min(30, parseInt(val || "0", 10)));
    const next = allocs.map((a, i) => (i === index ? { ...a, cards: n } : a));
    setAllocs(next);
    setAllocDirty(true);
    const total = next.reduce((s, a) => s + (a.cards || 0), 0);
    setCardsWanted(total);
  }
  function bump(index, delta) {
    setSectionCount(index, (allocs[index]?.cards || 0) + delta);
  }
  function resetAllocations() {
    setAllocDirty(false);
    setCardsWanted(prev => prev);
  }
  function next() {
    if (!file) return notify("Choose a PDF first");
    const total = Math.max(3, Math.min(30, cardsWanted || 12));
    navigation.navigate("Build", {
      file,
      cardsWanted: total,
      coverage: coverageMode,
      allocations: allocs.map(a => ({
        title: a.title,
        page_start: a.page_start,
        page_end: a.page_end,
        cards: Math.max(0, Math.min(30, a.cards || 0)),
      })),
    });
  }

  const pages          = stats?.pages || 0;
  const sectionsCount  = stats?.per_section_allocation?.length || 0;
  const coveragePages  = pages ? Math.min(1, (cardsWanted || 0) / pages) : 0;
  const coverageSecs   = sectionsCount ? Math.min(1, (cardsWanted || 0) / sectionsCount) : 0;

  const recText = useMemo(() => {
    if (!stats) return null;
    const rec = stats.recommended_cards;
    const lo  = stats.suggested_range?.lo;
    const hi  = stats.suggested_range?.hi;
    return `Recommended number of flashcards: ${rec}  (Range: ${lo}–${hi})`;
  }, [stats]);

  return (
    <Screen scroll maxWidth="narrow" center={!file}>
      <PageHeader
        eyebrow={<BrandMark showTagline />}
        title="Make flashcards"
        subtitle="Upload a PDF."
      />

      {cached && (
        <Surface style={styles.resumeCard}>
          <MetaLabel>Resume last deck?</MetaLabel>
          <Text style={styles.resumeSub}>
            Deck #{cached.deckId}
            {cached.cardsCount != null ? ` • ${cached.cardsCount} cards` : ""}
          </Text>
          <View style={styles.buttonRow}>
            <Button title="Use cached" size="sm" onPress={resumeCached} />
            <Button title="Discard" size="sm" variant="secondary" onPress={discardCached} />
          </View>
        </Surface>
      )}

      {file ? (
        <Button
          title="Choose PDF"
          size="lg"
          variant="secondary"
          onPress={pick}
          accessibilityHint="Opens a file picker for PDF documents"
        />
      ) : (
        <Surface variant="raised" padding="xl">
          <ProductSteps />
          <Button
            title="Choose PDF"
            size="lg"
            onPress={pick}
            accessibilityHint="Opens a file picker for PDF documents"
            style={styles.heroBtn}
          />
        </Surface>
      )}

      {file && (
        <View style={styles.flow}>
          <Surface variant="source" padding="md">
            <MetaLabel>Source</MetaLabel>
            <Text style={styles.filename}>{file.name}</Text>
          </Surface>

          {analyzing && (
            <Surface style={styles.inlineRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.panelText}>Analyzing document…</Text>
            </Surface>
          )}
          {!!err && <Notice tone="error" title="Analysis failed" message={err} />}

          {stats && (
            <Surface>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <MetaLabel>Pages</MetaLabel>
                  <Text style={styles.statValue}>{stats.pages}</Text>
                </View>
                <View style={styles.stat}>
                  <MetaLabel>Words</MetaLabel>
                  <Text style={styles.statValue}>{stats.words}</Text>
                </View>
              </View>
              <Text style={styles.rec}>{recText}</Text>
            </Surface>
          )}

          <View style={styles.coverageRow}>
            <Text style={styles.fieldLabel}>Coverage:</Text>
            <ChipGroup label="Coverage">
              <Chip
                label="Even per-page"
                selected={coverageMode === "even"}
                onPress={() => setCoverage("even")}
              />
              <Chip
                label="Cover sections first"
                selected={coverageMode === "section"}
                onPress={() => setCoverage("section")}
              />
            </ChipGroup>
          </View>

          <View>
            <View style={styles.sliderHeader}>
              <Text style={styles.fieldLabel}>Cards to generate</Text>
              <Badge tone="accent" accessibilityLabel={`${cardsWanted} cards`}>{cardsWanted}</Badge>
            </View>
            <Slider
              minimumValue={3}
              maximumValue={30}
              step={1}
              value={cardsWanted}
              onValueChange={setCardsWanted}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.borderStrong}
              thumbTintColor={colors.accent}
              accessibilityLabel="Cards to generate"
            />
            {stats && (
              <View style={styles.coverageStats}>
                <Text style={styles.coverage}>Coverage (pages ≥1 card): {(coveragePages*100).toFixed(0)}%</Text>
                {sectionsCount > 0 && (
                  <Text style={styles.coverage}>Coverage (sections ≥1 card): {(coverageSecs*100).toFixed(0)}%</Text>
                )}
              </View>
            )}
          </View>

          {allocs.length > 0 && (
            <Surface>
              <View style={styles.planHeader}>
                <Text style={styles.panelHdr}>Per-section plan (total {cardsWanted}):</Text>
                <Button title="Reset to recommendation" variant="quiet" size="sm" onPress={resetAllocations} />
              </View>
              {allocs.map((a, i) => (
                <View key={`${a.title}-${i}`} style={[styles.allocRow, i === allocs.length - 1 && styles.allocRowLast]}>
                  <View style={styles.allocText}>
                    <Text style={styles.allocTitle}>{a.title}</Text>
                    <Text style={styles.allocPages}>p.{a.page_start}–{a.page_end}</Text>
                  </View>
                  <View style={styles.allocControls}>
                    <IconButton icon="–" accessibilityLabel={`Fewer cards for ${a.title}`} onPress={() => bump(i, -1)} />
                    <TextField
                      style={styles.allocInput}
                      keyboardType="number-pad"
                      value={String(a.cards ?? 0)}
                      onChangeText={(t) => setSectionCount(i, t)}
                      accessibilityLabel={`Cards for ${a.title}`}
                    />
                    <IconButton icon="+" accessibilityLabel={`More cards for ${a.title}`} onPress={() => bump(i, +1)} />
                  </View>
                </View>
              ))}
            </Surface>
          )}

          <Button title="Upload & Build" size="lg" fullWidth onPress={next} />
        </View>
      )}
    </Screen>
  );
}
