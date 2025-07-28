// src/components/FlipDrill.js
/* FlipDrill – two‑sided flash‑card drill (basic / MC)
   • Re‑sizes automatically when the phone/tablet rotates
   • Works on native *and* web
   • No hook‑order warnings
*/
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,   // ← live screen size
  Animated,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import { API_BASE } from "../config";           // adjust path if needed
const API_ROOT = `${API_BASE}/api/flashcards`;

export default function FlipDrill({ deckId, n = 12 }) {
  /* ---------- live screen size ---------- */
  const { width } = useWindowDimensions();          // re‑renders on rotate
  const CARD_W    = width * 0.8;
  const CARD_H    = CARD_W * 0.6;

  /* ---------- state ---------- */
  const [cards,   setCards]   = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err,     setErr]     = useState("");

  /* ---------- refs / anim ---------- */
  const flipAnim = useRef(new Animated.Value(0)).current;
  const panX     = useRef(new Animated.Value(0)).current;

  /* flip animation (runs every render) */
  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  const frontRot = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRot = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  /* ---------- fetch cards once ---------- */
  useEffect(() => {
    (async () => {
      try {
        const url = `${API_ROOT}/hand/?deck_id=${deckId}&n=${n}`;
        console.log("[FlipDrill] fetching", url);
        const r   = await fetch(url);
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`HTTP ${r.status} • ${txt.slice(0,120)}`);
        }
        const data = await r.json();
        console.log("[FlipDrill] fetched", data.length, "cards");
        setCards(data);
        setIdx(0);
      } catch (e) {
        console.error("[FlipDrill] API error", e);
        setErr(String(e));
      }
    })();
  }, [deckId, n]);

  /* ---------- gestures ---------- */
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
        onPanResponderMove: (_, g) => panX.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dx > 100) prevCard();
          else if (g.dx < -100) nextCard();
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [cards.length]
  );

  /* ---------- helpers ---------- */
  const nextCard = () => {
    setIdx((i) => (i + 1) % cards.length);
    setFlipped(false);
  };
  const prevCard = () => {
    setIdx((i) => (i - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  /* ---------- early / error UI ---------- */
  if (err) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{color:"red",textAlign:"center"}}>{err}</Text>
      </SafeAreaView>
    );
  }
  if (!cards.length) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading cards…</Text>
      </SafeAreaView>
    );
  }

  const card = cards[idx];

  /* ---------- main UI ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>
        Card {idx + 1}/{cards.length}
      </Text>

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.cardWrap,
          { width: CARD_W, height: CARD_H },             // ← live size
          { transform: [{ translateX: panX }] },
        ]}
      >
        {/* front */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
          ]}
        >
          <Text style={styles.text}>{card.front}</Text>
        </Animated.View>

        {/* back */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { transform: [{ perspective: 1000 }, { rotateY: backRot }] },
          ]}
        >
          <Text style={styles.text}>{card.back}</Text>
        </Animated.View>

        {/* tap to flip */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setFlipped((f) => !f)}
        />
      </Animated.View>

      {/* controls */}
      <View style={styles.buttons}>
        <Pressable style={styles.btn} onPress={prevCard}>
          <Text style={styles.btnTxt}>Prev</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={nextCard}>
          <Text style={styles.btnTxt}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------- base styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  cardWrap: {
    marginTop: 40,
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    paddingHorizontal: 12,
  },
  cardBack: {
    backgroundColor: "#e0f2fe",
  },
  text: {
    fontSize: 22,
    textAlign: "center",
    color: "#0f172a",
  },
  buttons: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 20,
  },
  btn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnTxt: {
    color: "white",
    fontWeight: "600",
  },
});
