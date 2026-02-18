// src/Screens/UploadScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE } from "../config";

import { loadLastDeck, clearCache } from "../utils/cache";

import styles from "../styles/screens/UploadScreen.styles";

// Optional: add your logo if you have it in assets.
// If you don't want a logo at top, remove these two lines + the <Image /> block.
const MOGSY_LOGO = require("../../assets/mogsy-logo.png"); // <-- change path/name if needed

function formatMs(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function UploadScreen({ navigation }) {
  const [file, setFile] = useState(null);
  const [cardsWanted, setCardsWanted] = useState(12);
  const [coverageMode, setCoverage] = useState("even"); // "even" | "section"

  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  const [allocs, setAllocs] = useState([]);
  const [allocDirty, setAllocDirty] = useState(false);

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
      Alert.alert("Could not open the file picker.");
    }
  }

  async function analyzeFile(f) {
    try {
      setAnalyzing(true);
      const fd = new FormData();
      const filename = f.name ?? "document.pdf";
      const mime = f.mimeType ?? "application/pdf";

      if (Platform.OS === "web") {
        const blob = await fetch(f.uri).then((r) => r.blob());
        fd.append("file", new File([blob], filename, { type: mime }));
      } else {
        fd.append("file", { uri: f.uri, name: filename, type: mime });
      }

      const url = `${API_BASE}/api/flashcards/analyze/`;
      const r = await fetch(url, { method: "POST", body: fd });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`HTTP ${r.status} – ${t.slice(0, 150)}`);
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
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!stats?.per_section_allocation) return;
    const total = cardsWanted || stats.recommended_cards || 12;
    const seeded = stats.per_section_allocation.map((s) => ({
      title: s.title,
      page_start: s.page_start,
      page_end: s.page_end,
      share: s.share ?? (stats.words ? s.words / stats.words : 0),
      cards: Math.max(0, Math.round((s.cards ?? 0) || (s.share ?? 0) * total)),
    }));
    setAllocs(seeded);
    setAllocDirty(false);
  }, [stats]);

  useEffect(() => {
    if (!allocs.length || allocDirty) return;
    const tot = cardsWanted || 0;
    const shares = allocs.map((a) => a.share ?? 0);
    const sumShare = shares.reduce((s, x) => s + x, 0) || 1;
    const next = allocs.map((a, i) => ({
      ...a,
      cards: Math.max(0, Math.round((shares[i] / sumShare) * tot)),
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
    setCardsWanted((prev) => prev);
  }

  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    const total = Math.max(3, Math.min(30, cardsWanted || 12));
    navigation.navigate("Build", {
      file,
      cardsWanted: total,
      coverage: coverageMode,
      allocations: allocs.map((a) => ({
        title: a.title,
        page_start: a.page_start,
        page_end: a.page_end,
        cards: Math.max(0, Math.min(30, a.cards || 0)),
      })),
    });
  }

  const pages = stats?.pages || 0;
  const sectionsCount = stats?.per_section_allocation?.length || 0;
  const coveragePages = pages ? Math.min(1, (cardsWanted || 0) / pages) : 0;
  const coverageSecs = sectionsCount ? Math.min(1, (cardsWanted || 0) / sectionsCount) : 0;

  const recText = useMemo(() => {
    if (!stats) return null;
    const rec = stats.recommended_cards;
    const lo = stats.suggested_range?.lo;
    const hi = stats.suggested_range?.hi;
    return `Recommended: ${rec}  (Range: ${lo}–${hi})`;
  }, [stats]);

  const Chip = ({ label, active, onPress }) => (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      {/* Soft logo-like gradient header */}
      <LinearGradient
        colors={["#F6F9FF", "#F4F2FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBg}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.center}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand row */}
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Image source={MOGSY_LOGO} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Mogsy</Text>
            <Text style={styles.subtle}>Upload a PDF or create a custom deck.</Text>
          </View>
        </View>

        {/* Resume */}
        {cached && (
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>Resume last deck</Text>
            <Text style={styles.resumeSub}>
              Deck #{cached.deckId}
              {cached.cardsCount != null ? ` • ${cached.cardsCount} cards` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable style={styles.resumePrimary} onPress={resumeCached}>
                <Text style={styles.resumePrimaryTxt}>Open</Text>
              </Pressable>
              <Pressable style={styles.resumeHollow} onPress={discardCached}>
                <Text style={styles.resumeHollowTxt}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Primary actions */}
        <View style={styles.actionsRow}>
          <Pressable onPress={pick} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnTxt}>Choose PDF</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("CustomDeck")}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnTxt}>Create custom deck</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("CreateProfile")}
          style={{
          marginTop: 12,
          backgroundColor: "white",
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.08)",
          }}
        >
          <Text style={{ color: "#007AFF", fontWeight: "800", fontSize: 16 }}>
            Create profile
          </Text>
        </Pressable>

        {/* Selected file + analysis */}
        {file && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected</Text>
            <Text style={styles.filename} numberOfLines={2}>
              {file.name}
            </Text>

            {analyzing && (
              <View style={styles.panel}>
                <ActivityIndicator />
                <Text style={styles.panelText}>Analyzing document…</Text>
              </View>
            )}

            {!!err && (
              <View style={[styles.panel, styles.panelError]}>
                <Text style={[styles.panelText, styles.panelErrorText]}>{err}</Text>
              </View>
            )}

            {stats && (
              <View style={styles.statsCard}>
                <View style={styles.kvRow}>
                  <Text style={styles.k}>Pages</Text>
                  <Text style={styles.v}>{stats.pages}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.k}>Words</Text>
                  <Text style={styles.v}>{stats.words}</Text>
                </View>
                <Text style={styles.rec}>{recText}</Text>
              </View>
            )}

            <View style={styles.coverageRow}>
              <Text style={styles.coverageLabel}>Coverage</Text>
              <Chip
                label="Even per-page"
                active={coverageMode === "even"}
                onPress={() => setCoverage("even")}
              />
              <Chip
                label="Cover sections"
                active={coverageMode === "section"}
                onPress={() => setCoverage("section")}
              />
            </View>

            <View style={styles.sliderWrap}>
              <Text style={styles.sliderLabel}>
                Cards to generate: <Text style={styles.sliderValue}>{cardsWanted}</Text>
              </Text>
              <Slider
                minimumValue={3}
                maximumValue={30}
                step={1}
                value={cardsWanted}
                onValueChange={setCardsWanted}
                minimumTrackTintColor="#4F8CFF"
                maximumTrackTintColor="rgba(0,0,0,0.12)"
                thumbTintColor="#4F8CFF"
              />
              {stats && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.coverageStat}>
                    Pages ≥1 card: {(coveragePages * 100).toFixed(0)}%
                  </Text>
                  {sectionsCount > 0 && (
                    <Text style={styles.coverageStat}>
                      Sections ≥1 card: {(coverageSecs * 100).toFixed(0)}%
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Allocations */}
            {allocs.length > 0 && (
              <View style={styles.panel}>
                <View style={styles.panelHdrRow}>
                  <Text style={styles.panelHdr}>Per-section plan</Text>
                  <Pressable onPress={resetAllocations} style={styles.linkBtn}>
                    <Text style={styles.linkBtnTxt}>Reset</Text>
                  </Pressable>
                </View>

                {allocs.map((a, i) => (
                  <View key={`${a.title}-${i}`} style={styles.allocRow}>
                    <Text style={styles.allocTitle} numberOfLines={2}>
                      {a.title} • p.{a.page_start}–{a.page_end}
                    </Text>
                    <View style={styles.allocControls}>
                      <Pressable onPress={() => bump(i, -1)} style={styles.stepBtn}>
                        <Text style={styles.stepBtnTxt}>–</Text>
                      </Pressable>

                      <TextInput
                        style={styles.allocInput}
                        keyboardType="number-pad"
                        value={String(a.cards ?? 0)}
                        onChangeText={(t) => setSectionCount(i, t)}
                      />

                      <Pressable onPress={() => bump(i, +1)} style={styles.stepBtn}>
                        <Text style={styles.stepBtnTxt}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Build */}
            <Pressable onPress={next} style={styles.buildBtn}>
              <Text style={styles.buildBtnTxt}>Upload & Build</Text>
            </Pressable>

            <Text style={styles.footerHint}>
              Tip: on iPhone, make sure you’re on the same Wi-Fi as your backend host.
            </Text>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}
