// src/Screens/BuildScreen.js
//
// Receives { file, cardsWanted, coverage } from <UploadScreen>,
// uploads the PDF to Django, waits for the deck to finish, then
// redirects to <Picker>.
//
// ◼  Verbose logging so you can see *exactly* what gets posted
// ◼  Always sends cards_wanted (server clamps 3–120)
// ◼  Optional: sends coverage="section" to enable section-first quotas
// ◼  Better error messages (shows HTTP status AND body)

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Button, Platform } from "react-native";
import { API_BASE } from "../config";

export default function BuildScreen({ route, navigation }) {
  const { file, cardsWanted = 30, coverage = "even" } = route.params || {};

  /** "upload" → "build" → (error|done) */
  const [phase,  setPhase]  = useState("upload");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        /* ─────────────── build multipart body ─────────────── */
        const fd       = new FormData();
        const filename = file?.name ?? "document.pdf";
        const mime     = file?.mimeType ?? "application/pdf";

        if (!file?.uri) throw new Error("Missing file uri");

        if (Platform.OS === "web") {
          const blob = await fetch(file.uri).then(r => r.blob());
          fd.append("file", new File([blob], filename, { type: mime }));
        } else {
          fd.append("file", { uri: file.uri, name: filename, type: mime });
        }

        fd.append("deck_name", filename.replace(/\.pdf$/i, ""));
        fd.append("cards_wanted", String(cardsWanted || 12));
        fd.append("coverage", coverage);

        // NEW: ask backend to ensure section coverage (if user chose it)
        if (coverage === "section") fd.append("coverage", "section");

        const url = `${API_BASE}/api/flashcards/generate/`;
        console.log("[BuildScreen] POST", url, {
          cardsWanted, coverage, filename,
        });

        /* ─────────────── POST to Django ─────────────── */
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
          const text = await res.text();
          console.error("[BuildScreen] HTTP error", res.status, text);
          setErrMsg(`HTTP ${res.status} – ${text.slice(0, 300)}`);
          setPhase("error");
          return;
        }

        setPhase("build");                 // AI pipeline running
        const json = await res.json();     // waits until pipeline finishes
        console.log("✅ deck built:", json);

        /* ─────────────── jump to picker ─────────────── */
        navigation.reset({
          index : 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id, n:cardsWanted } }],
        });
      } catch (err) {
        console.error("❌ network / unexpected error:", err, err?.stack);
        setErrMsg(err.message ?? String(err));
        setPhase("error");
      }
    })();
  }, []);

  /* ─────────────── minimal UI ─────────────── */
  if (phase === "error") {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", marginBottom: 12 }}>{errMsg}</Text>
        <Button title="Try again" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>
        {phase === "upload" ? "Uploading…" : "Building deck…"}
      </Text>
    </View>
  );
}

const styles = {
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
};
