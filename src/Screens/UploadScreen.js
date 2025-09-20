// src/Screens/UploadScreen.js
// ——————————————————————————————————————————————
// 1) Pick a PDF
// 2) Background-call /analyze to get stats + recommendation
// 3) Let the user choose #cards (+ choose “coverage” strategy)
// 4) Navigate to <BuildScreen> with chosen options
// ——————————————————————————————————————————————
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, Button, Alert, ActivityIndicator,
  Platform, ScrollView, Pressable,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE } from "../config";

export default function UploadScreen({ navigation }) {
  const [file, setFile]               = useState(null);   // { uri, name, mimeType, ... }
  const [cardsWanted, setCardsWanted] = useState(30);
  const [coverageMode, setCoverage]   = useState("even"); // "even" | "section"

  // analysis coming from Django
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats]         = useState(null);
  const [err, setErr]             = useState("");

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

  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    navigation.navigate("Build", {
      file,
      cardsWanted,
      coverage: coverageMode, // "even" or "section"
    });
  }

  // coverage helpers
  const pages          = stats?.pages || 0;
  const sectionsCount  = stats?.per_section_allocation?.length || 0;
  const coveragePages  = pages ? Math.min(1, cardsWanted / pages) : 0;
  const coverageSecs   = sectionsCount ? Math.min(1, cardsWanted / sectionsCount) : 0;

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
    <ScrollView contentContainerStyle={styles.center} style={{ backgroundColor: "#0a0f1f" }}>
      <Text style={styles.h1}>Make Flashcards</Text>
      <Text style={styles.subtle}>Upload a PDF.</Text>

      <View style={{ height: 12 }} />

      <Button title="Choose PDF" onPress={pick} color="#3b82f6" />

      {file && (
        <View style={{ width: "90%", marginTop: 16 }}>
          <Text style={styles.filename}>{file.name}</Text>

          {/* Analysis status / summary */}
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
              <View style={{ height: 6 }} />
              <Text style={styles.rec}>{recText}</Text>
            </View>
          )}

          {/* coverage mode chips */}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#cbd5e1", marginRight: 10 }}>Coverage:</Text>
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

          {/* slider for #cards */}
          <View style={{ width: "100%", marginVertical: 18 }}>
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

          {/* Per-section plan (scaled to slider) */}
          {stats?.per_section_allocation?.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.panelHdr}>Per-section plan (at {cardsWanted}):</Text>
              {stats.per_section_allocation.map((s, i) => {
                const totalRec = stats.recommended_cards || cardsWanted || 1;
                const scaled = Math.max(0, Math.round((s.cards / Math.max(1, totalRec)) * cardsWanted));
                return (
                  <Text key={i} style={styles.panelText}>
                    • {s.title} — p.{s.page_start}–{s.page_end} — {scaled} cards
                  </Text>
                );
              })}
            </View>
          )}

          <Button title="Upload & Build" onPress={next} color="#10b981" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = {
  center: { minHeight: "100%", alignItems: "center", padding: 20 },
  h1: { color: "#e5e7eb", fontSize: 28, fontWeight: "800" },
  subtle: { color: "#94a3b8", marginTop: 6, textAlign: "center" },
  filename: { color: "#e5e7eb", marginBottom: 8, marginTop: 10, fontWeight: "600" },

  panel: {
    borderWidth: 1, borderColor: "#334155", padding: 10, borderRadius: 10, backgroundColor: "#0b1226", marginTop: 6,
  },
  panelHdr: { color: "#cbd5e1", fontWeight: "700", marginBottom: 6 },
  panelText: { color: "#a8b3cf" },

  statsCard: {
    backgroundColor: "#0b1226", borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, marginVertical: 8,
  },
  kv: { color: "#cbd5e1", marginVertical: 2 },
  k: { color: "#93c5fd" },
  v: { color: "#e5e7eb", fontWeight: "700" },
  rec: { color: "#22d3ee", marginTop: 8, fontWeight: "700" },

  sliderLabel: { color: "#e5e7eb", marginBottom: 8 },
  coverage: { color: "#a7f3d0", marginTop: 2 },
};
