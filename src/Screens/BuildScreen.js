// src/Screens/BuildScreen.js
//
// Receives { file, testN, cardsWanted } from <UploadScreen>,
// uploads the PDF to Django, waits for the deck to finish, then
// redirects to <Picker>.
//
// ◼ Verbose logging
// ◼ Always sends cards_wanted
// ◼ UC Berkeley theme + large, readable type

import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { API_BASE } from "../config";

const COLORS = {
  blue: "#003262",   // Berkeley Blue
  gold: "#FDB515",   // California Gold
  white: "#FFFFFF",
};

function PrimaryButton({ title, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.btnTxt}>{title}</Text>
    </Pressable>
  );
}

export default function BuildScreen({ route, navigation }) {
  const { file, testN = 0, cardsWanted = 12 } = route.params;

  const [phase,  setPhase]  = useState("upload"); // upload | build | error
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // ─────────────── build multipart body ───────────────
        const fd       = new FormData();
        const filename = file?.name ?? "document.pdf";
        const mime     = file?.mimeType ?? "application/pdf";

        if (Platform.OS === "web") {
          const blob = await fetch(file.uri).then(r => r.blob());
          fd.append("file", new File([blob], filename, { type: mime }));
        } else {
          fd.append("file", { uri: file.uri, name: filename, type: mime });
        }

        fd.append("deck_name", filename.replace(/\.pdf$/i, ""));
        if (Number(testN) > 0) fd.append("test_chunks", String(testN));
        fd.append("cards_wanted", String(cardsWanted || 12));

        const url = `${API_BASE}/api/flashcards/generate/`;
        console.log("[BuildScreen] POST", url, { testN, cardsWanted, filename });

        // ─────────────── POST to Django ───────────────
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
          const text = await res.text();
          console.error("[BuildScreen] HTTP error", res.status, text);
          setErrMsg(`HTTP ${res.status} – ${text.slice(0, 200)}`);
          setPhase("error");
          return;
        }

        setPhase("build");                 // AI pipeline running
        const json = await res.json();     // waits until finished
        console.log("✅ deck built:", json);

        // ─────────────── jump to picker ───────────────
        navigation.reset({
          index : 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id } }],
        });
      } catch (err) {
        console.error("❌ network / unexpected error:", err, err?.stack);
        setErrMsg(err?.message ?? String(err));
        setPhase("error");
      }
    })();
  }, []);

  // ─────────────── UI ───────────────
  if (phase === "error") {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.blue }]}>
        <Text style={styles.errorText}>{errMsg}</Text>
        <PrimaryButton title="Try again" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: COLORS.blue }]}>
      <ActivityIndicator size="large" color={COLORS.gold} />
      <Text style={styles.statusText}>
        {phase === "upload" ? "Uploading…" : "Building deck…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusText: {
    marginTop: 16,
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 18,
  },
  btn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  btnTxt: {
    color: COLORS.blue,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
