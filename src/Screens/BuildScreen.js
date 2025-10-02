// src/Screens/BuildScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Animated } from "react-native";
import { API_BASE } from "../config";
import { saveLastDeck, saveTemplate } from "../utils/cache";
import styles from "../styles/screens/BuildScreen.styles";

function formatMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function BuildScreen({ route, navigation }) {
  const { file, cardsWanted = 12, allocations = [] } = route.params || {};

  const [phase, setPhase] = useState("upload");
  const [errMsg, setErrMsg] = useState("");
  const [filename, setFilename] = useState(file?.name ?? "document.pdf");

  const [elapsedMs, setElapsedMs] = useState(0);
  const t0Ref = useRef(0);
  const timerRef = useRef(null);

  const onHome = () => {
    navigation.reset({ index: 0, routes: [{ name: "Upload" }] });
  };

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

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

        t0Ref.current = Date.now();
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setElapsedMs(Date.now() - t0Ref.current);
        }, 250);

        setPhase("upload");
        const url = `${API_BASE}/api/flashcards/generate/`;
        const res = await fetch(url, { method: "POST", body: fd });

        if (!res.ok) {
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
        const json = await res.json();

        const buildMsMeasured = Date.now() - t0Ref.current;
        clearInterval(timerRef.current);

        if (Array.isArray(json.warnings) && json.warnings.length) {
          Alert.alert("Some sections had less material", json.warnings.join("\n\n"), [{ text: "OK" }]);
        }

        const serverTotal = json?.metrics?.total_ms;
        const buildMs = typeof serverTotal === "number" ? serverTotal : buildMsMeasured;

        // Go to picker immediately so the UI isn’t blocked by storage writes
        navigation.reset({
          index: 0,
          routes: [{ name: "Picker", params: { deckId: json.deck_id, buildMs } }],
        });

        // Save meta + template in the background
        setTimeout(() => {
          saveLastDeck({
            deckId: json.deck_id,
            name: name.replace(/\.pdf$/i, ""),
            cardsCount: json.cards_created ?? null,
            buildMs,
            metrics: json?.metrics ?? null,
          }).catch(() => {});
          if (json?.template) {
            saveTemplate(json.deck_id, json.template).catch(() => {});
          }
        }, 0);
      } catch (err) {
        clearInterval(timerRef.current);
        setErrMsg(err?.message ?? String(err));
        setPhase("error");
      }
    })();

    return () => clearInterval(timerRef.current);
  }, []);

  const headline =
    phase === "error"
      ? "Something went wrong"
      : phase === "upload"
      ? "Uploading your PDF…"
      : "Building your deck…";

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#032e5d", "#003262"]} style={styles.topGrad} />

      <Text style={styles.title}>Flashcard Builder</Text>
      <Text style={styles.subtitle}>{headline}</Text>

      <View style={styles.card}>
        {phase !== "error" ? (
          <>
            <ActivityIndicator size="large" color="#FDB515" />
            <Text style={styles.cardTitle} numberOfLines={2}>{filename}</Text>

            <View style={styles.progressRow}>
              <View style={[styles.progressDot, phase === "upload" ? styles.dotActive : styles.dotDone]} />
              <Text style={styles.progressLabel}>Upload</Text>
              <View style={[styles.progressDot, phase === "upload" ? styles.dotIdle : styles.dotActive]} />
              <Text style={styles.progressLabel}>Generate</Text>
            </View>

            <Text style={{ color:"#93c5fd", fontWeight:"800", marginTop: 8 }}>
              Elapsed: {formatMs(elapsedMs)}
            </Text>

            <Text style={styles.hint}>This can take a moment for larger PDFs.</Text>

            <View style={{ height: 8 }} />
            <Animated.Text
              style={[styles.cuteEmoji, { transform: [{ scale }], opacity }]}
              accessibilityRole="image"
              accessibilityLabel="Loading"
            >
              📘
            </Animated.Text>

            <View style={{ height: 16 }} />
            <Pressable style={[styles.btn, styles.btnHollow]} onPress={onHome}>
              <Text style={[styles.btnTxt, styles.btnTxtHollow]}>Home</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{errMsg}</Text>
            <View style={{ height: 16 }} />
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
