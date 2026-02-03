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
import { saveLastDeck /*, saveTemplate*/ } from "../utils/cache";
import styles from "../styles/screens/BuildScreen.styles";

function formatMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function BuildScreen({ route, navigation }) {
  // Expect: file (DocumentPicker asset), cardsWanted, allocations, coverage?
  const {
    file,
    cardsWanted = 12,
    allocations = [],
    coverage = "even", // optional; default "even"
  } = route.params || {};

  const [phase, setPhase] = useState("upload"); // upload | build | error
  const [errMsg, setErrMsg] = useState("");
  const [filename, setFilename] = useState(file?.name ?? "document.pdf");

  const [elapsedMs, setElapsedMs] = useState(0);
  const t0Ref = useRef(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const jobIdRef = useRef(null);

  // Progress text from server (via /status)
  const [progressText, setProgressText] = useState("");

  const onHome = () => {
    navigation.reset({ index: 0, routes: [{ name: "Upload" }] });
  };

  // Cute pulse
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

  // Kick off async build, then poll status
  useEffect(() => {
    (async () => {
      try {
        if (!file) {
          throw new Error("No file provided.");
        }

        // 1) Build FormData for /build/deck/
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
        fd.append("coverage", String(coverage || "even"));
        if (allocations?.length) {
          fd.append("allocations", JSON.stringify(allocations));
        }

        // 2) Start timers
        t0Ref.current = Date.now();
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setElapsedMs(Date.now() - t0Ref.current);
        }, 250);

        setPhase("upload");

        // 3) POST → /api/flashcards/build/deck/
        const startUrl = `${API_BASE}/api/flashcards/build/deck/`;
        const startRes = await fetch(startUrl, { method: "POST", body: fd });
        if (!startRes.ok) {
          let details = "";
          try {
            const j = await startRes.json();
            details = j?.detail || j?.error || JSON.stringify(j);
          } catch {
            details = await startRes.text();
          }
          throw new Error(`Start build failed (HTTP ${startRes.status}) – ${String(details).slice(0, 400)}`);
        }
        const { job_id } = await startRes.json();
        if (!job_id) throw new Error("Server did not return a job_id.");
        jobIdRef.current = job_id;

        // Switch to 'build' phase
        setPhase("build");

        // 4) Poll status until SUCCESS/FAILURE
        const poll = async () => {
          if (!jobIdRef.current) return;
          const statusUrl = `${API_BASE}/api/flashcards/build/deck/status/${jobIdRef.current}/`;
          const sRes = await fetch(statusUrl);
          if (!sRes.ok) return; // transient network issues: just try next tick
          const sJson = await sRes.json();

          // Server may return {status, progress?, result?, error?}
          setProgressText(sJson?.progress || "");

          if (sJson.status === "SUCCESS" && sJson.result?.deck_id) {
            // stop timers
            clearInterval(timerRef.current);
            clearInterval(pollRef.current);

            const buildMsMeasured = Date.now() - t0Ref.current;
            const deckId = sJson.result.deck_id;
            const cardsCount = sJson.result.cards_count ?? null;

            // Navigate right away
            navigation.reset({
              index: 0,
              routes: [{ name: "Picker", params: { deckId, buildMs: buildMsMeasured } }],
            });

            // Save deck meta in the background (no template here; template is handled earlier)
            setTimeout(() => {
              saveLastDeck({
                deckId,
                name: name.replace(/\.pdf$/i, ""),
                cardsCount,
                buildMs: buildMsMeasured,
                metrics: null,
              }).catch(() => {});
            }, 0);

          } else if (sJson.status === "FAILURE") {
            // stop timers
            clearInterval(timerRef.current);
            clearInterval(pollRef.current);
            const msg = sJson?.error || "Deck build failed.";
            setErrMsg(msg);
            setPhase("error");
          }
          // else: PENDING / STARTED → keep polling
        };

        clearInterval(pollRef.current);
        pollRef.current = setInterval(poll, 1200);
        // also do an immediate first poll for faster feedback
        poll();
      } catch (err) {
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
        setErrMsg(err?.message ?? String(err));
        setPhase("error");
      }
    })();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  const headline =
    phase === "error"
      ? "Something went wrong"
      : phase === "upload"
      ? "Uploading your PDF…"
      : "Building your deck…";

  // UI
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

            {/* server progress (optional) */}
            {!!progressText && (
              <Text style={{ color:"#93c5fd", fontWeight:"800", marginTop: 6 }} numberOfLines={2}>
                {progressText}
              </Text>
            )}

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
