// src/components/FlipDrill.js
/* FlipDrill – two-sided flash-card drill (basic / MC)
   • Re-sizes automatically when the phone/tablet rotates
   • Works on native *and* web
   • Toggle to show/hide source context (excerpt + page)
*/
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  Switch,
} from "react-native";
import { API_BASE } from "../config";
const API_ROOT = `${API_BASE}/api/flashcards`;

export default function FlipDrill({ deckId, n = 12 }) {
  /* ---------- live screen size ---------- */
  const { width } = useWindowDimensions();
  const CARD_W    = width * 0.8;
  const CARD_H    = CARD_W * 0.6;

  /* ---------- state ---------- */
  const [cards,   setCards]     = useState([]);
  const [idx,     setIdx]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [err,     setErr]       = useState("");
  const [showCtx, setShowCtx]   = useState(true);   // ← new: context toggle

  /* ---------- refs / anim ---------- */
  const flipAnim = useRef(new Animated.Value(0)).current;
  const panX     = useRef(new Animated.Value(0)).current;

  /* flip animation */
  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  const frontRot = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backRot  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

  /* fetch cards once (per deckId/n) */
  useEffect(() => {
    (async () => {
      try {
        const url = `${API_ROOT}/hand/?deck_id=${deckId}&n=${n}`;
        console.log("[FlipDrill] fetching", url);
        const r = await fetch(url);
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

  /* gestures */
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

  /* helpers */
  const nextCard = () => { setIdx((i) => (i + 1) % cards.length); setFlipped(false); };
  const prevCard = () => { setIdx((i) => (i - 1 + cards.length) % cards.length); setFlipped(false); };

  const ellipsize = (s, limit = 200) => {
    if (!s) return "";
    const trimmed = s.trim();
    return trimmed.length > limit ? trimmed.slice(0, limit - 1) + "…" : trimmed;
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
      {/* top bar: counter + context toggle */}
      <View style={styles.topBar}>
        <Text style={styles.counter}>Card {idx + 1}/{cards.length}</Text>

        <View style={styles.ctxToggle}>
          <Text style={styles.ctxLabel}>Show context</Text>
          <Switch value={showCtx} onValueChange={setShowCtx} />
        </View>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.cardWrap,
          { width: CARD_W, height: CARD_H },
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

          {/* context block (excerpt + page) */}
          {showCtx && (card.excerpt || card.page != null) && (
            <View style={styles.contextBox}>
              {!!card.excerpt && (
                <Text style={styles.excerpt}>"{ellipsize(card.excerpt, 220)}"</Text>
              )}
              {card.page != null && (
                <Text style={styles.pageNote}>p. {card.page}</Text>
              )}
            </View>
          )}
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

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  center: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  topBar: {
    marginTop: 8,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 16,
    color: "#64748b",
  },
  ctxToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctxLabel: {
    color: "#334155",
    marginRight: 6,
  },
  cardWrap: {
    marginTop: 24,
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
    paddingHorizontal: 6,
  },
  contextBox: {
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    width: "92%",
  },
  excerpt: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  pageNote: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
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
