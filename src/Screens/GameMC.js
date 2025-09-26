// src/Screens/GameMC.js
import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";
import CardShell from "../components/CardShell";
import { pickDistractors, shuffle } from "../utils/PickDistractors";
import { s, stateStyles } from "../styles/screens/GameMC.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameMC({ route, navigation }) {
  const { deckId, order = "doc" } = route.params || {};
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null);        // index of chosen option
  const [correctIndex, setCorrectIndex] = useState(null);

  const autoTimerRef = useRef(null);

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

    // clear any pending auto-advance when we move to a new card
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, [cards, idx]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const next = () => {
    if (!cards.length) return;
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
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
    if (picked != null) return; // already answered
    setPicked(i);

    const ok = i === correctIndex;
    Haptics.notificationAsync(
      ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );

    // show the colored feedback briefly, then advance regardless of right/wrong
    const delayMs = ok ? 650 : 900; // a touch longer when wrong
    autoTimerRef.current = setTimeout(next, delayMs);
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
