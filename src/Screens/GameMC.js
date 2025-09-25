// src/Screens/GameMC.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";
import CardShell from "../components/CardShell";
import { pickDistractors, shuffle } from "../utils/PickDistractors";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameMC({ route, navigation }) {
  const { deckId, order = "doc" } = route.params || {};
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null); // index of chosen option
  const [correctIndex, setCorrectIndex] = useState(null);

  // load deck in doc order
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", "all");
        params.set("order", order);
        const r = await fetch(`${API_ROOT}/hand/?${params.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setCards(data);
        setIdx(0);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, order]);

  // build options when card changes
  useEffect(() => {
    if (!cards.length) return;
    const card = cards[idx];
    const distractors = pickDistractors(card, cards, 3);
    const all = shuffle([card.back, ...distractors]);
    setOptions(all);
    setCorrectIndex(all.findIndex(a => a === card.back));
    setPicked(null);
  }, [cards, idx]);

  const next = () => {
    if (!cards.length) return;
    setIdx(i => (i + 1) % cards.length);
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

  const pick = (i) => {
    if (picked != null) return; // lock after answer
    setPicked(i);
    const ok = i === correctIndex;
    Haptics.selectionAsync();
    if (!ok) return;
    // Optionally: auto-advance after a short delay
    setTimeout(next, 600);
  };

  const CARD_W = 720;
  const CARD_H = CARD_W * 0.6;

  return (
    <View style={s.container}>
      <Text style={s.header}>Card {idx + 1}/{cards.length}</Text>

      <CardShell width={CARD_W} height={CARD_H} variant="front">
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
        <Pressable onPress={() => navigation.goBack()} style={s.btn}>
          <Text style={s.btnTxt}>Back</Text>
        </Pressable>
        <Pressable onPress={next} style={s.btn}>
          <Text style={s.btnTxt}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003262", alignItems: "center", paddingTop: 18 },
  center: { flex: 1, backgroundColor: "#003262", alignItems: "center", justifyContent: "center" },
  header: { color: "#E6ECF0", fontWeight: "800", marginBottom: 10 },
  muted: { color: "#E6ECF0", marginTop: 8 },
  error: { color: "#FDB515" },

  question: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },

  opts: {
    width: "92%",
    maxWidth: 720,
    marginTop: 14,
    gap: 10,
  },
  opt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  optText: { color: "#0f172a", fontWeight: "800", textAlign: "center" },

  controls: { flexDirection: "row", marginTop: 16, gap: 10 },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnTxt: { color: "#082F49", fontWeight: "900" },
});

const stateStyles = StyleSheet.create({
  idle: { backgroundColor: "#FFFFFF", borderColor: "#0C4A6E" },
  correct: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  wrong: { backgroundColor: "#ef4444", borderColor: "#b91c1c" },
});
