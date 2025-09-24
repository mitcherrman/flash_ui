// src/Screens/UploadScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, Button, Alert, ActivityIndicator,
  Platform, ScrollView, Pressable, TextInput,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE } from "../config";

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
      Alert.alert("Could not open the file picker.");
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
    if (!file) return Alert.alert("Choose a PDF first");
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

  const Chip = ({label, active, onPress}) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
        borderWidth: 1, borderColor: active ? "#FDB515" : "#334155",
        backgroundColor: active ? "#09224a" : "#0b1226", marginRight: 8,
      }}
    >
      <Text style={{ color: active ? "#FDB515" : "#cbd5e1", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.center, !file && styles.centerHero]}
      style={{ backgroundColor: "#0a0f1f" }}
    >
      <View style={{ alignSelf: "stretch", height: 96, marginBottom: 16 }}>
        <LinearGradient
          colors={["#032e5d", "#003262"]}
          style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: "#0C4A6E" }}
        />
      </View>

      <Text style={styles.h1}>Make Flashcards</Text>
      <Text style={styles.subtle}>Upload a PDF.</Text>

      <View style={{ height: 16 }} />

      <Button title="Choose PDF" onPress={pick} color="#3b82f6" />

      {file && (
        <View style={{ width: "90%", marginTop: 16 }}>
          <Text style={styles.filename}>{file.name}</Text>

          {analyzing && (
            <View style={styles.panel}>
              <ActivityIndicator />
              <Text style={styles.panelText}>Analyzing document…</Text>
            </View>
          )}
          {!!err && (
            <View style={[styles.panel, { borderColor: "#ef4444" }]}>
              <Text style={[styles.panelText, { color: "#ef4444" }]}>{err}</Text>
            </View>
          )}

          {stats && (
            <View style={styles.statsCard}>
              <Text style={styles.kv}><Text style={styles.k}>Pages</Text> <Text style={styles.v}>{stats.pages}</Text></Text>
              <Text style={styles.kv}><Text style={styles.k}>Words</Text> <Text style={styles.v}>{stats.words}</Text></Text>
              <View style={{ height: 8 }} />
              <Text style={styles.rec}>{recText}</Text>
            </View>
          )}

          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#cbd5e1", marginRight: 8 }}>Coverage:</Text>
            <Chip
              label="Even per-page"
              active={coverageMode === "even"}
              onPress={() => setCoverage("even")}
            />
            <Chip
              label="Cover sections first"
              active={coverageMode === "section"}
              onPress={() => setCoverage("section")}
            />
          </View>

          <View style={{ width: "100%", marginVertical: 16 }}>
            <Text style={styles.sliderLabel}>
              Cards to generate: <Text style={{ color: "#93c5fd", fontWeight: "700" }}>{cardsWanted}</Text>
            </Text>
            <Slider
              minimumValue={3}
              maximumValue={30}
              step={1}
              value={cardsWanted}
              onValueChange={setCardsWanted}
              minimumTrackTintColor="#60a5fa"
              maximumTrackTintColor="#1f2937"
              thumbTintColor="#93c5fd"
            />
            {stats && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.coverage}>Coverage (pages ≥1 card): {(coveragePages*100).toFixed(0)}%</Text>
                {sectionsCount > 0 && (
                  <Text style={styles.coverage}>Coverage (sections ≥1 card): {(coverageSecs*100).toFixed(0)}%</Text>
                )}
              </View>
            )}
          </View>

          {allocs.length > 0 && (
            <View style={styles.panel}>
              <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center"}}>
                <Text style={styles.panelHdr}>Per-section plan (total {cardsWanted}):</Text>
                <Button title="Reset to recommendation" onPress={resetAllocations} />
              </View>
              {allocs.map((a, i) => (
                <View key={`${a.title}-${i}`} style={styles.allocRow}>
                  <Text style={styles.allocTitle}>
                    • {a.title} — p.{a.page_start}–{a.page_end}
                  </Text>
                  <View style={styles.allocControls}>
                    <Button title="–" onPress={() => bump(i, -1)} />
                    <TextInput
                      style={styles.allocInput}
                      keyboardType="number-pad"
                      value={String(a.cards ?? 0)}
                      onChangeText={(t) => setSectionCount(i, t)}
                    />
                    <Button title="+" onPress={() => bump(i, +1)} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <Button title="Upload & Build" onPress={next} color="#10b981" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = {
  center: {
    flexGrow: 1,
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 16,
  },
  centerHero: { justifyContent: "center" },

  h1: { color: "#e5e7eb", fontSize: 28, fontWeight: "800" },
  subtle: { color: "#94a3b8", marginTop: 8, textAlign: "center" },
  filename: { color: "#e5e7eb", marginBottom: 8, marginTop: 8, fontWeight: "600" },

  panel: {
    borderWidth: 1, borderColor: "#334155", padding: 12, borderRadius: 12, backgroundColor: "#0b1226", marginTop: 8,
  },
  panelHdr: { color: "#cbd5e1", fontWeight: "700", marginBottom: 8 },
  panelText: { color: "#a8b3cf" },

  statsCard: {
    backgroundColor: "#0b1226", borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, marginVertical: 8,
  },
  kv: { color: "#cbd5e1", marginVertical: 2 },
  k: { color: "#93c5fd" },
  v: { color: "#e5e7eb", fontWeight: "700" },
  rec: { color: "#22d3ee", marginTop: 8, fontWeight: "700" },

  sliderLabel: { color: "#e5e7eb", marginBottom: 8 },
  coverage: { color: "#a7f3d0", marginTop: 4 },

  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  allocTitle: { color: "#cbd5e1", flexShrink: 1, paddingRight: 8 },
  allocControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  allocInput: {
    width: 48, textAlign: "center",
    borderWidth: 1, borderColor: "#334155",
    color: "#e5e7eb", backgroundColor: "#0b1226",
    borderRadius: 8, paddingVertical: 8, marginHorizontal: 8,
  },
};
