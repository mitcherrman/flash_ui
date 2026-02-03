// src/Screens/UploadScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE } from "../config";
import { loadLastDeck, clearCache } from "../utils/cache";
import styles from "../styles/screens/UploadScreen.styles";

function formatMs(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function UploadScreen({ navigation }) {
  const [file, setFile] = useState(null);

  // user controls
  const [cardsWanted, setCardsWanted] = useState(12);
  const [coverageMode, setCoverage] = useState("even"); // "even" | "section"

  // async template build state
  const [processing, setProcessing] = useState(false); // background template build
  const [progress, setProgress] = useState(""); // human text (from server polling)
  const [jobId, setJobId] = useState(null); // Celery task id
  const pollAbortRef = useRef(false); // cancel flag for polling loop
  const pollTimerRef = useRef(null);   // timer id for polling loop

  // analyze/result
  const [stats, setStats] = useState(null); // includes per_section_allocation, {pages, words, recommended_cards}
  const [err, setErr] = useState("");

  // allocations editor
  const [allocs, setAllocs] = useState([]);
  const [allocDirty, setAllocDirty] = useState(false);

  // cached last deck
  const [cached, setCached] = useState(null);

  // ──────────────────────────────
  // Helpers
  // ──────────────────────────────
  function fixRoundingToTotal(next, total) {
    const sum = next.reduce((s, a) => s + (a.cards || 0), 0);
    const diff = (total || 0) - sum;
    if (next.length && diff !== 0) {
      const i = next.length - 1;
      next[i] = { ...next[i], cards: Math.max(0, (next[i].cards || 0) + diff) };
    }
    return next;
  }

  function recomputeAllocsFromShares(total) {
    if (!allocs.length) return;
    const shares = allocs.map((a) => a.share ?? 0);
    const sumShare = shares.reduce((s, x) => s + x, 0) || 1;
    let next = allocs.map((a, i) => ({
      ...a,
      cards: Math.max(0, Math.round((shares[i] / sumShare) * (total || 0))),
    }));
    next = fixRoundingToTotal(next, total || 0);
    setAllocs(next);
  }

  // ──────────────────────────────
  // File picker -> check sections or start async build
  // ──────────────────────────────
  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const f = res.assets[0];

      // reset state for a new file
      setFile(f);
      setStats(null);
      setErr("");
      setAllocs([]);
      setAllocDirty(false);
      setProcessing(false);
      setProgress("");
      setJobId(null);

      // stop any old polling and allow new loop
      pollAbortRef.current = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      pollAbortRef.current = false;

      // 1) Try fast path – do we already have sections cached/known by filename?
      const sections = await checkTemplateSections(f.name);
      if (sections?.length) {
        setStats({ per_section_allocation: sections });
      } else {
        // 2) Kick off async server build (Celery) and poll for progress
        await startTemplateBuild(f);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Could not open the file picker.");
    }
  }

  async function checkTemplateSections(filename) {
    try {
      const r = await fetch(
        `${API_BASE}/api/flashcards/template/check/?filename=${encodeURIComponent(
          filename || ""
        )}`
      );
      if (!r.ok) return [];
      const data = await r.json();
      return data.sections || [];
    } catch (e) {
      console.warn("checkTemplateSections error", e);
      return [];
    }
  }

  async function startTemplateBuild(f) {
    try {
      setProcessing(true);
      setProgress("Starting template build…");

      const fd = new FormData();
      const filename = f.name ?? "document.pdf";
      const mime = f.mimeType ?? (filename.endsWith(".txt") ? "text/plain" : "application/pdf");

      if (Platform.OS === "web") {
        const blob = await fetch(f.uri).then((r) => r.blob());
        // Guard for environments where File may be undefined
        const fileLike = typeof File !== "undefined"
          ? new File([blob], filename, { type: mime })
          : blob;
        fd.append("file", fileLike, filename);
      } else {
        fd.append("file", { uri: f.uri, name: filename, type: mime });
      }

      const url = `${API_BASE}/api/flashcards/template/build/`;
      const r = await fetch(url, { method: "POST", body: fd });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`HTTP ${r.status} – ${t.slice(0, 150)}`);
      }
      const json = await r.json();
      setJobId(json.job_id);
      setProgress("Queued for processing…");

      // Start polling
      pollTemplateStatus(json.job_id);
    } catch (e) {
      console.error("startTemplateBuild error", e);
      setErr(String(e?.message || e));
      setProcessing(false);
    }
  }

  function pollTemplateStatus(job_id) {
    const POLL_INTERVAL = 4000;

    const poll = async () => {
      if (pollAbortRef.current) return; // stop if canceled

      try {
        const r = await fetch(
          `${API_BASE}/api/flashcards/template/status/${job_id}/`
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        if (pollAbortRef.current) return; // re-check after await

        if (data.status === "PENDING" || data.status === "STARTED") {
          setProgress(`Processing: ${data.progress || "working…"}`);
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        } else if (data.status === "SUCCESS") {
          setProcessing(false);
          setStats(data.result || {});
          if (data.result?.recommended_cards) {
            setCardsWanted(data.result.recommended_cards);
          }
          setProgress("Completed!");
          if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        } else if (data.status === "FAILURE") {
          setProcessing(false);
          setErr(data.error || "Template build failed.");
          if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        } else {
          setProcessing(false);
          setErr(`Task ended with status: ${data.status}`);
          if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (e) {
        if (!pollAbortRef.current) {
          console.error("Polling error", e);
          setErr("Connection lost while processing.");
          setProcessing(false);
        }
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    };

    poll();
  }

  // ──────────────────────────────
  // Seed cached “last deck” meta
  // ──────────────────────────────
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

  // ──────────────────────────────
  // Seed allocations when stats arrive
  // ──────────────────────────────
  useEffect(() => {
    if (!stats?.per_section_allocation) return;
    const total = cardsWanted || stats.recommended_cards || 12;
    let seeded = stats.per_section_allocation.map((s) => ({
      title: s.title,
      page_start: s.page_start,
      page_end: s.page_end,
      share: s.share ?? (stats.words ? s.words / (stats.words || 1) : 0),
      cards: Math.max(
        0,
        Math.round((s.cards ?? 0) || ((s.share ?? (stats.words ? s.words / (stats.words || 1) : 0)) * total))
      ),
    }));
    // ensure sums match the total
    seeded = fixRoundingToTotal(seeded, total);
    setAllocs(seeded);
    setAllocDirty(false);
  }, [stats]);

  // Keep total consistent when slider changes (unless user is manually editing)
  useEffect(() => {
    if (!allocs.length || allocDirty) return;
    const tot = cardsWanted || 0;
    const shares = allocs.map((a) => a.share ?? 0);
    const sumShare = shares.reduce((s, x) => s + x, 0) || 1;
    let next = allocs.map((a, i) => ({
      ...a,
      cards: Math.max(0, Math.round((shares[i] / sumShare) * tot)),
    }));
    next = fixRoundingToTotal(next, tot);
    setAllocs(next);
  }, [cardsWanted]);

  // Stop polling if screen unmounts
  useEffect(() => {
    return () => {
      pollAbortRef.current = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────
  // Cached deck helpers
  // ──────────────────────────────
  function resumeCached() {
    if (!cached?.deckId) return;
    navigation.navigate("Picker", { deckId: cached.deckId });
  }

  async function discardCached() {
    await clearCache();
    setCached(null);
  }

  // ──────────────────────────────
  // Allocation editor helpers
  // ──────────────────────────────
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
    recomputeAllocsFromShares(cardsWanted || 12);
  }

  // ──────────────────────────────
  // Proceed to BuildScreen
  // ──────────────────────────────
  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    if (!stats?.per_section_allocation?.length) {
      return Alert.alert("Still processing", "Please wait until sections are ready.");
    }
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

  // derived coverage display
  const pages = stats?.pages || 0;
  const sectionsCount = stats?.per_section_allocation?.length || 0;
  const coveragePages = pages ? Math.min(1, (cardsWanted || 0) / pages) : 0;
  const coverageSecs = sectionsCount
    ? Math.min(1, (cardsWanted || 0) / sectionsCount)
    : 0;

  const recText = useMemo(() => {
    if (!stats) return null;
    const rec = stats.recommended_cards;
    const lo = stats.suggested_range?.lo;
    const hi = stats.suggested_range?.hi;
    if (rec == null && (lo == null || hi == null)) return null;
    return `Recommended number of flashcards: ${rec ?? "—"}  ${
      lo != null && hi != null ? `(Range: ${lo}–${hi})` : ""
    }`;
  }, [stats]);

  const Chip = ({ label, active, onPress }) => (
    <Pressable
      onPress={onPress}
      disabled={processing}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? "#FDB515" : "#334155",
        backgroundColor: active ? "#09224a" : "#0b1226",
        marginRight: 8,
        opacity: processing ? 0.6 : 1,
      }}
    >
      <Text style={{ color: active ? "#FDB515" : "#cbd5e1", fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );

  // ──────────────────────────────
  // UI
  // ──────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={[styles.center /* , !file && styles.centerHero */]}
      style={{ backgroundColor: "#0a0f1f" }}
    >
      {/* Decorative header band */}
      <View style={{ alignSelf: "stretch", height: 96, marginBottom: 16 }}>
        <LinearGradient
          colors={["#032e5d", "#003262"]}
          style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: "#0C4A6E" }}
        />
      </View>

      <Text style={styles.h1}>Make Flashcards</Text>
      <Text style={styles.subtle}>Upload a PDF or TXT.</Text>

      <View style={{ height: 16 }} />

      {/* Resume cached */}
      {cached && (
        <View style={styles.resumeCard}>
          <Text style={styles.resumeTitle}>Resume last deck?</Text>
          <Text style={styles.resumeSub}>
            Deck #{cached.deckId}
            {cached.cardsCount != null ? ` • ${cached.cardsCount} cards` : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable style={styles.resumePrimary} onPress={resumeCached}>
              <Text style={styles.resumePrimaryTxt}>Use cached</Text>
            </Pressable>
            <Pressable style={styles.resumeHollow} onPress={discardCached}>
              <Text style={styles.resumeHollowTxt}>Discard</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* File chooser */}
      <Button title="Choose PDF/TXT" onPress={pick} color="#3b82f6" />

      {/* File info + state panels */}
      {file && (
        <View style={{ width: "90%", marginTop: 16 }}>
          <Text style={styles.filename}>{file.name}</Text>

          {/* While SERVER-SIDE template is building */}
          {processing && (
            <View style={[styles.panel, { borderColor: "#334155" }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color="#FDB515" />
                <Text style={[styles.panelText, { marginLeft: 8 }]}>
                  {progress || "Processing…"}
                </Text>
              </View>
              {!!jobId && (
                <Text style={[styles.panelText, { marginTop: 6, color: "#a8b3cf" }]}>
                  Job: {jobId}
                </Text>
              )}
              <Text style={[styles.panelText, { marginTop: 8, color: "#cbd5e1" }]}>
                You can adjust options below once sections appear. This runs in the background.
              </Text>
            </View>
          )}

          {/* Any hard error */}
          {!!err && (
            <View style={[styles.panel, { borderColor: "#ef4444" }]}>
              <Text style={[styles.panelText, { color: "#ef4444" }]}>{err}</Text>
            </View>
          )}

          {/* Stats (appear after analyze or when template finishes) */}
          {stats && (
            <View style={styles.statsCard}>
              {stats.pages != null && (
                <Text style={styles.kv}>
                  <Text style={styles.k}>Pages</Text>{" "}
                  <Text style={styles.v}>{stats.pages}</Text>
                </Text>
              )}
              {stats.words != null && (
                <Text style={styles.kv}>
                  <Text style={styles.k}>Words</Text>{" "}
                  <Text style={styles.v}>{stats.words}</Text>
                </Text>
              )}
              <View style={{ height: 8 }} />
              {!!recText && <Text style={styles.rec}>{recText}</Text>}
            </View>
          )}

          {/* Coverage mode (disabled while processing and no sections yet) */}
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

          {/* Slider (enable once we at least know something) */}
          <View style={{ width: "100%", marginVertical: 16, opacity: !stats ? 0.5 : 1 }}>
            <Text style={styles.sliderLabel}>
              Cards to generate:{" "}
              <Text style={{ color: "#93c5fd", fontWeight: "700" }}>{cardsWanted}</Text>
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
              disabled={!stats}
            />
            {stats && (
              <View style={{ marginTop: 8 }}>
                {stats.pages != null && (
                  <Text style={styles.coverage}>
                    Coverage (pages ≥1 card): {(coveragePages * 100).toFixed(0)}%
                  </Text>
                )}
                {sectionsCount > 0 && (
                  <Text style={styles.coverage}>
                    Coverage (sections ≥1 card): {(coverageSecs * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Per-section allocations (appear once sections exist) */}
          {allocs.length > 0 && (
            <View style={styles.panel}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={styles.panelHdr}>
                  Per-section plan (total {cardsWanted})
                  {allocDirty ? " — customized" : ""}
                  :
                </Text>
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

          {/* Build button (enabled only when sections are available) */}
          <View style={{ marginTop: 12 }}>
            <Button
              title={
                allocs.length
                  ? "Upload & Build"
                  : processing
                  ? "Processing…"
                  : "Waiting for sections…"
              }
              onPress={next}
              color={allocs.length ? "#10b981" : "#334155"}
              disabled={!allocs.length}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
