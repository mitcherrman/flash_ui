// src/Screens/GameMC.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";
import CardShell from "../components/CardShell";
import { pickDistractors, shuffle } from "../utils/PickDistractors";
import { fetchWithCache, deckHandKey } from "../utils/cache";
import { s, stateStyles } from "../styles/screens/GameMC.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameMC({ route, navigation }) {
  const { deckId, order = "doc", startOrdinal = null } = route.params || {};

  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null); // index of chosen option
  const [correctIndex, setCorrectIndex] = useState(null);

  // Modes: "normal" (no scoring), "endless" (track right/wrong counters)
  const [gameMode, setGameMode] = useState("normal");
  const [rightCount, setRightCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const startOrdinalNum = useMemo(() => {
    const v =
      typeof startOrdinal === "number"
        ? startOrdinal
        : startOrdinal != null
        ? parseInt(String(startOrdinal), 10)
        : null;
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [startOrdinal]);

  function goToPicker() {
    navigation.reset({
      index: 0,
      routes: [{ name: "Picker", params: { deckId } }],
    });
  }

  // load deck in doc order
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", "all");
        params.set("order", order);
        const url = `${API_ROOT}/hand/?${params.toString()}`;

        const data = await fetchWithCache({
          key: deckHandKey(deckId, order, "all"),
          fetcher: async () => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          },
        });

        setCards(data);
        const initial =
          order === "doc" &&
          startOrdinalNum != null &&
          startOrdinalNum >= 1 &&
          startOrdinalNum <= data.length
            ? startOrdinalNum - 1
            : 0;
        setIdx(initial);

        // reset scoring when loading a new deck / jumping
        setRightCount(0);
        setWrongCount(0);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, order, startOrdinalNum]);

  // helper: sanitize strings
  const _norm = (s) => (String(s || "").trim().replace(/\s+/g, " "));

  // Build options when card changes:
  // 1) use server-provided LLM distractors when present
  // 2) top up with pickDistractors (cross-card) to reach 3
  useEffect(() => {
    if (!cards.length) return;
    const card = cards[idx];
    const correct = _norm(card.back);

    // 1) Prefer LLM-authored distractors (card.distractors)
    let d = Array.isArray(card?.distractors) ? card.distractors.map(_norm).filter(Boolean) : [];

    // Remove duplicates and any equal to the correct answer (case-insensitive)
    const seen = new Set();
    d = d.filter((x) => {
      const key = x.toLowerCase();
      if (key === correct.toLowerCase()) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 2) Top up if fewer than 3 using your existing pool-based picker
    if (d.length < 3) {
      const needed = 3 - d.length;
      // oversample from pool, then filter collisions
      const pool = pickDistractors(card, cards, Math.max(needed * 2, 3));
      for (const cand of pool) {
        const c = _norm(cand);
        const key = c.toLowerCase();
        if (!c) continue;
        if (key === correct.toLowerCase()) continue;
        if (seen.has(key)) continue;
        d.push(c);
        seen.add(key);
        if (d.length >= 3) break;
      }
    }

    const all = shuffle([correct, ...d.slice(0, 3)]);
    setOptions(all);
    setCorrectIndex(all.findIndex((a) => _norm(a).toLowerCase() === correct.toLowerCase()));
    setPicked(null);
  }, [cards, idx]);

  const next = () => {
    if (!cards.length) return;
    setIdx((i) => (i + 1) % cards.length);
  };

  const prev = () => {
    if (!cards.length) return;
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  };

  const pick = (i) => {
    if (picked != null) return; // lock after first answer
    setPicked(i);
    Haptics.selectionAsync();

    // Endless mode: update counters
    if (gameMode === "endless") {
      if (i === correctIndex) setRightCount((n) => n + 1);
      else setWrongCount((n) => n + 1);
    }

    // brief feedback then advance
    setTimeout(next, 700);
  };

  const total = cards.length;

  const switchMode = (mode) => {
    if (mode === gameMode) return;
    setGameMode(mode);
    setPicked(null);
    setRightCount(0);
    setWrongCount(0);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={s.muted}>Loading…</Text>
      </View>
    );
  }
  if (err || !cards.length) {
    return (
      <View style={s.center}>
        <Text style={s.error}>{err || "No cards."}</Text>
      </View>
    );
  }

  const card = cards[idx];

  return (
    <View style={s.container}>
      {/* Top row: Back • Card counter • TOC */}
      <View style={s.topBar}>
        <Pressable onPress={goToPicker} style={s.topBtn}>
          <Text style={s.topBtnTxt}>Back</Text>
        </Pressable>

        <Text style={s.header}>
          Card {idx + 1}/{total}
        </Text>

        <Pressable
          onPress={() =>
            navigation.navigate("TOC", {
              deckId,
              returnTo: "GameMC",
              startOrdinal: idx + 1,
            })
          }
          style={[s.topBtn, { backgroundColor: "#0ea5e9" }]}
        >
          <Text style={[s.topBtnTxt, { color: "white" }]}>TOC</Text>
        </Pressable>
      </View>

      {/* Mode toggle + (Endless) counters */}
      <View style={s.modeBar}>
        <View style={s.modeToggleWrap}>
          <Pressable
            onPress={() => switchMode("normal")}
            style={[s.modeToggleBtn, gameMode === "normal" && s.modeToggleActive]}
          >
            <Text
              style={[s.modeToggleTxt, gameMode === "normal" && s.modeToggleTxtActive]}
            >
              Normal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode("endless")}
            style={[s.modeToggleBtn, gameMode === "endless" && s.modeToggleActive]}
          >
            <Text
              style={[s.modeToggleTxt, gameMode === "endless" && s.modeToggleTxtActive]}
            >
              Endless
            </Text>
          </Pressable>
        </View>

        {gameMode === "endless" ? (
          <View style={s.counterRow}>
            <View style={[s.counterPill, s.counterRight]}>
              <Text style={s.counterTxt}>Right: {rightCount}</Text>
            </View>
            <View style={[s.counterPill, s.counterWrong]}>
              <Text style={s.counterTxt}>Wrong: {wrongCount}</Text>
            </View>
          </View>
        ) : (
          <View style={s.counterRow}>
            <View style={s.counterPillMuted}>
              <Text style={s.counterTxtMuted}>Normal mode</Text>
            </View>
          </View>
        )}
      </View>

      <CardShell width={720} height={720 * 0.6} variant="front">
        <Text style={s.question}>{card.front}</Text>
      </CardShell>

      <View style={s.opts}>
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === correctIndex;
          const state =
            picked == null ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "idle";
          return (
            <Pressable key={i} onPress={() => pick(i)} style={[s.opt, stateStyles[state]]}>
              <Text style={s.optText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.controls}>
        <Pressable onPress={prev} style={s.btn}>
          <Text style={s.btnTxt}>Previous</Text>
        </Pressable>
        <Pressable onPress={next} style={s.btn}>
          <Text style={s.btnTxt}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}
