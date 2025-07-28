// src/Screens/BuildScreen.js
//
// Receives { file, testN, cardsWanted } from <UploadScreen>,
// uploads the PDF, waits for the deck to finish, then jumps to Picker.
//
import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  Button,
  Platform,
} from "react-native";
import { API_BASE } from "../config";

export default function BuildScreen({ route, navigation }) {
  const { file, testN, cardsWanted } = route.params;

  const [phase,  setPhase]  = useState("upload"); // upload | build | error
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        /* ---------- build multipart body ---------- */
        const body     = new FormData();
        const filename = file.name ?? "document.pdf";
        const mime     = file.mimeType ?? "application/pdf";

        if (Platform.OS === "web") {
          // need explicit Blob on web
          const blob = await fetch(file.uri).then(r => r.blob());
          body.append("file", new File([blob], filename, { type: mime }));
        } else {
          body.append("file", { uri: file.uri, name: filename, type: mime });
        }

        body.append("deck_name", filename.replace(/\.pdf$/i, ""));
        if (testN)      body.append("test_chunks", String(testN));
        if (cardsWanted) body.append("cards_wanted", String(cardsWanted));

        /* ---------- POST to Django ---------- */
        const res = await fetch(
          `${API_BASE}/api/flashcards/generate/`,
          { method: "POST", body }
        );

        if (!res.ok) {
          const text = await res.text();
          setErrMsg(text || `HTTP ${res.status}`);
          setPhase("error");
          return;
        }

        setPhase("build");                // AI pipeline in progress
        const json = await res.json();    // blocks until finished
        console.log("✅ deck built:", json);

        /* ---------- jump to picker ---------- */
        navigation.reset({
          index : 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id } }],
        });
      } catch (err) {
        console.error(err);
        setErrMsg(String(err));
        setPhase("error");
      }
    })();
  }, []);

  /* ---------- tiny UI ---------- */
  if (phase === "error") {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", marginBottom: 12 }}>{errMsg}</Text>
        <Button title="Try again" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const label = phase === "upload" ? "Uploading…" : "Building deck…";
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>{label}</Text>
    </View>
  );
}

const styles = {
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
};
