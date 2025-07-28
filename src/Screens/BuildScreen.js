// src/Screens/BuildScreen.js
//
// Upload the picked PDF to Django, wait until the AI pipeline finishes,
// then jump to the Game‑picker.  Works on both *native* (Expo Go / device)
// and *web* targets.
//
// Expected route params from <UploadScreen>
//   { file, testN }   // testN = optional “random chunks” sample size
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
  const { file, testN } = route.params;

  /** "upload" → "build" → "done" | "error" */
  const [phase,  setPhase]  = useState("upload");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        /* ────────────────────────────────────────────────────────────────
         * 1) Build multipart/form‑data body
         * ──────────────────────────────────────────────────────────────── */
        const body     = new FormData();
        const filename = file.name ?? "document.pdf";
        const mime     = file.mimeType ?? "application/pdf";

        if (Platform.OS === "web") {
          /* Web requires an explicit Blob */
          const blob = await fetch(file.uri).then(r => r.blob());
          body.append("file", new File([blob], filename, { type: mime }));
        } else {
          /* Native (iOS / Android) can send URI directly */
          body.append("file", { uri: file.uri, name: filename, type: mime });
        }

        body.append("deck_name", filename.replace(/\.pdf$/i, ""));
        if (testN) body.append("test_chunks", String(testN));

        /* ────────────────────────────────────────────────────────────────
         * 2) POST to Django backend
         * ──────────────────────────────────────────────────────────────── */
        
        const res = await fetch(`${API_BASE}/api/flashcards/generate/`, { method: "POST", body });
        
        //const res = await fetch(
        //  "http://127.0.0.1:8000/api/flashcards/generate/",
        //  { method: "POST", body }
        //);

        if (!res.ok) {
          /* Read *text* first – may contain {"detail": "..."} from Django */
          const text = await res.text();
          console.log("Server‑error body →", text);
          let msg   = `Server ${res.status}`;

          try {
            const json = JSON.parse(text);
            if (json.detail) msg = json.detail;
          } catch { /* not JSON – leave msg as is */ }

          if (res.status === 400) msg = "Bad request – malformed body?";
          if (res.status === 403) msg = "Forbidden – login required";
          if (res.status === 413) msg = "File too large";
          setErrMsg(msg);
          setPhase("error");
          return;
        }

        /* Success – wait until pipeline finishes and deck JSON is returned */
        setPhase("build");
        const json = await res.json();        // { deck_id, cards_created }
        console.log("✅ deck built:", json);

        /* ────────────────────────────────────────────────────────────────
         * 3) Navigate to game picker
         * ──────────────────────────────────────────────────────────────── */
        navigation.reset({
          index : 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id } }],
        });
      } catch (err) {
        console.error("❌ network / unexpected error:", err);
        setErrMsg(String(err));
        setPhase("error");
      }
    })();
  }, []);

  /* ─────────────────────────  UI  ───────────────────────── */
  if (phase === "error") {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", marginBottom: 12 }}>
          {errMsg || "Upload failed – check Expo & Django logs"}
        </Text>
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
