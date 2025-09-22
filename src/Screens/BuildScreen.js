// src/Screens/BuildScreen.js
//
// Uploads the PDF, asks the backend to build a deck, shows any warnings
// (e.g., sections with not enough material), and then routes to Game Picker.
// Includes a Home button to return to the Upload screen.
//
// If your upload route name isn't "Upload", change the navigation.reset()
// call in onHome() accordingly.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { API_BASE } from "../config";

export default function BuildScreen({ route, navigation }) {
  const { file, cardsWanted = 12, allocations = [] } = route.params || {};

  const [phase, setPhase] = useState("upload"); // "upload" | "build" | "error"
  const [errMsg, setErrMsg] = useState("");
  const [filename, setFilename] = useState(file?.name ?? "document.pdf");

  const onHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Upload" }], // change to your Upload route name if different
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const fd = new FormData();
        const name = file?.name ?? "document.pdf";
        const mime = file?.mimeType ?? "application/pdf";
        setFilename(name);

        if (Platform.OS === "web") {
          const blob = await fetch(file.uri).then((r) => r.blob());
          fd.append("file", new File([blob], name, { type: mime }));
        } else {
          fd.append("file", { uri: file.uri, name, type: mime });
        }

        fd.append("deck_name", name.replace(/\.pdf$/i, ""));
        fd.append("cards_wanted", String(cardsWanted || 12));
        if (allocations?.length) {
          fd.append("allocations", JSON.stringify(allocations));
        }

        setPhase("upload");
        const url = `${API_BASE}/api/flashcards/generate/`;
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
          // Try to extract useful error details
          let details = "";
          try {
            const j = await res.json();
            details = j?.detail || JSON.stringify(j);
          } catch {
            details = await res.text();
          }
          throw new Error(`HTTP ${res.status} – ${String(details).slice(0, 400)}`);
        }

        setPhase("build");
        const json = await res.json(); // ✅ only parse once

        // Surface backend warnings (e.g., a section requested more cards than available)
        if (Array.isArray(json.warnings) && json.warnings.length) {
          Alert.alert(
            "Some sections had less material",
            json.warnings.join("\n\n"),
            [{ text: "OK" }],
          );
        }

        // Go to game picker with the new deck
        navigation.reset({
          index: 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id } }],
        });
      } catch (err) {
        setErrMsg(err?.message ?? String(err));
        setPhase("error");
      }
    })();
  }, []);

  const headline =
    phase === "error"
      ? "Something went wrong"
      : phase === "upload"
      ? "Uploading your PDF…"
      : "Building your deck…";

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Flashcard Builder</Text>
      <Text style={styles.subtitle}>{headline}</Text>

      {/* Card */}
      <View style={styles.card}>
        {phase !== "error" ? (
          <>
            <ActivityIndicator size="large" color="#FDB515" />
            <Text style={styles.cardTitle} numberOfLines={2}>
              {filename}
            </Text>

            {/* progress dots */}
            <View style={styles.progressRow}>
              <View
                style={[
                  styles.progressDot,
                  phase === "upload" ? styles.dotActive : styles.dotDone,
                ]}
              />
              <Text style={styles.progressLabel}>Upload</Text>
              <View
                style={[
                  styles.progressDot,
                  phase === "upload" ? styles.dotIdle : styles.dotActive,
                ]}
              />
              <Text style={styles.progressLabel}>Generate</Text>
            </View>

            <Text style={styles.hint}>
              This can take a moment for larger PDFs.
            </Text>

            {/* Home button while loading */}
            <View style={{ height: 10 }} />
            <Pressable style={[styles.btn, styles.btnHollow]} onPress={onHome}>
              <Text style={[styles.btnTxt, styles.btnTxtHollow]}>Home</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{errMsg}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.btnRow}>
              <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
                <Text style={styles.btnTxt}>Back</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onHome}>
                <Text style={styles.btnTxtAlt}>Home</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#003262", // Berkeley Blue
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    color: "#E6ECF0",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: { color: "#A8B3CF", marginTop: 6, fontSize: 16, textAlign: "center" },

  card: {
    marginTop: 16,
    width: "92%",
    maxWidth: 700,
    backgroundColor: "#012B57",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0C4A6E",
    padding: 16,
    alignItems: "center",
  },
  cardTitle: {
    marginTop: 10,
    color: "#E6ECF0",
    fontWeight: "700",
    textAlign: "center",
  },

  progressRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  dotIdle: { borderColor: "#1f3a5f", backgroundColor: "transparent" },
  dotActive: { borderColor: "#FFCD00", backgroundColor: "#FDB515" },
  dotDone: { borderColor: "#22c55e", backgroundColor: "#22c55e" },
  progressLabel: { color: "#E6ECF0", marginHorizontal: 6 },

  hint: { color: "#A8B3CF", marginTop: 10, textAlign: "center" },

  errorText: {
    color: "#FFCDD2",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    textAlign: "left",
  },

  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    backgroundColor: "#FDB515", // Berkeley Gold
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnSecondary: {
    backgroundColor: "#0B3D91",
    borderWidth: 1,
    borderColor: "#FFCD00",
  },
  btnTxt: { color: "#082F49", fontWeight: "800", fontSize: 16 },
  btnTxtAlt: { color: "#FFCD00", fontWeight: "800", fontSize: 16 },

  btnHollow: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FFCD00",
  },
  btnTxtHollow: {
    color: "#FFCD00",
  },
});
