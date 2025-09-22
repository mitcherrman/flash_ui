// src/Screens/BuildScreen.js
//
// Receives { file, cardsWanted, allocations } from <UploadScreen>,
// uploads the PDF to Django, waits for the deck to finish, then
// redirects to <Picker>.
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Button, Platform } from "react-native";
import { API_BASE } from "../config";

export default function BuildScreen({ route, navigation }) {
  const { file, cardsWanted = 12, allocations = [] } = route.params;

  const [phase,  setPhase]  = useState("upload");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const fd       = new FormData();
        const filename = file.name ?? "document.pdf";
        const mime     = file.mimeType ?? "application/pdf";

        if (Platform.OS === "web") {
          const blob = await fetch(file.uri).then(r => r.blob());
          fd.append("file", new File([blob], filename, { type: mime }));
        } else {
          fd.append("file", { uri: file.uri, name: filename, type: mime });
        }

        fd.append("deck_name", filename.replace(/\.pdf$/i, ""));
        fd.append("cards_wanted", String(cardsWanted || 12));
        if (allocations?.length) fd.append("allocations", JSON.stringify(allocations));

        const url = `${API_BASE}/api/flashcards/generate/`;
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
          const text = await res.text();
          setErrMsg(`HTTP ${res.status} – ${text.slice(0,150)}`);
          setPhase("error");
          return;
        }

        setPhase("build");
        const json = await res.json();
        navigation.reset({
          index : 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id } }],
        });
      } catch (err) {
        setErrMsg(err.message ?? String(err));
        setPhase("error");
      }
    })();
  }, []);

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
