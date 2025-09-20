// src/Screens/UploadScreen.js
// ——————————————————————————————————————————————
// 1) Let the user pick a local PDF.
// 2) Background-inspect: pages & word count while on this screen.
// 3) Navigate to <BuildScreen> with { file, testN, cardsWanted }.
// ——————————————————————————————————————————————

import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, TextInput, Platform, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE } from "../config";

export default function UploadScreen({ navigation }) {
  /* ---------------- state ---------------- */
  const [file, setFile] = useState(null);          // { uri, name, mimeType, … }
  const [testN, setTestN] = useState("");          // quick random-chunk demo
  const [cardsWanted, setCardsWanted] = useState(12);

  // background-inspection state
  const [stats, setStats] = useState(null);        // { pages, words, ... }
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState("");

  /* -------------- pick PDF --------------- */
  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!res.canceled) setFile(res.assets[0]);
    } catch (err) {
      console.error(err);
      Alert.alert("Could not open the file picker.");
    }
  }

  /* -------------- background inspect ------ */
  useEffect(() => {
    if (!file) return;

    (async () => {
      try {
        setStats(null);
        setStatsErr("");
        setStatsLoading(true);

        const fd = new FormData();
        const filename = file.name ?? "document.pdf";
        const mime = file.mimeType ?? "application/pdf";

        if (Platform.OS === "web") {
          const blob = await fetch(file.uri).then((r) => r.blob());
          fd.append("file", new File([blob], filename, { type: mime }));
        } else {
          fd.append("file", { uri: file.uri, name: filename, type: mime });
        }

        const url = `${API_BASE}/api/flashcards/inspect/`;
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status} – ${t.slice(0, 160)}`);
        }

        const json = await res.json();
        setStats(json);
      } catch (e) {
        console.error("[inspect] error", e);
        setStatsErr(String(e.message ?? e));
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [file]);

  /* -------------- go next ---------------- */
  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    const n = parseInt(testN, 10) || 0;
    navigation.navigate("Build", {
      file,
      testN: n,
      cardsWanted,
    });
  }

  /* -------------- UI --------------------- */
  return (
    <View style={styles.center}>
      <Button title="Choose PDF" onPress={pick} />

      {file && <Text style={styles.fileName}>{file.name}</Text>}

      {/* background inspection panel */}
      {file && (
        <View style={styles.statsBox}>
          {statsLoading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator />
              <Text>Analyzing pages & word count…</Text>
            </View>
          )}

          {!statsLoading && stats && stats.ok && (
            <>
              <Text style={styles.statsLine}>
                Pages: <Text style={styles.statsStrong}>{stats.pages}</Text>
              </Text>
              <Text style={styles.statsLine}>
                Words: <Text style={styles.statsStrong}>{stats.words}</Text>
                {stats.avg_words_per_page ? (
                  <Text>  (avg {stats.avg_words_per_page}/page)</Text>
                ) : null}
              </Text>
            </>
          )}

          {!statsLoading && statsErr ? (
            <Text style={{ color: "red" }}>{statsErr}</Text>
          ) : null}
        </View>
      )}

      {file && (
        <>
          {/* optional test chunks */}
          <TextInput
            value={testN}
            onChangeText={setTestN}
            placeholder="Test chunks (0-5)"
            keyboardType="number-pad"
            maxLength={1}
            style={styles.input}
          />

          {/* slider for #cards */}
          <View style={{ width: 260, marginVertical: 20 }}>
            <Text>Cards to generate: {cardsWanted}</Text>
            <Slider
              minimumValue={3}
              maximumValue={30}
              step={1}
              value={cardsWanted}
              onValueChange={setCardsWanted}
            />
          </View>

          <Button title="Upload & Build" onPress={next} />
        </>
      )}
    </View>
  );
}

/* ---------- styles ---------- */
const styles = {
  center:   { flex: 1, justifyContent: "center", alignItems: "center" },
  fileName: { marginVertical: 8, fontSize: 16 },
  input: {
    width: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    marginVertical: 8,
    textAlign: "center",
  },
  statsBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    minWidth: 260,
    alignItems: "center",
    gap: 2,
  },
  statsLine: { fontSize: 14, color: "#334155" },
  statsStrong: { fontWeight: "700", color: "#0f172a" },
};
