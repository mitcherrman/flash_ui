// src/components/FlipDrill.js
/* FlipDrill – two-sided flash-card drill (basic / MC)
   • Re-sizes automatically when the phone/tablet rotates
   • Works on native *and* web
   • Toggle to show/hide source context (excerpt + page)
   • UC Berkeley colorway + larger, more readable type
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

// UC Berkeley palette
const COLORS = {
  blue: "#003262",      // Berkeley Blue (background / text)
  gold: "#FDB515",      // California Gold (accents / buttons)
  white: "#FFFFFF",
  lightGold: "#FFF6DB",
  slate: "#E2E8F0",
};

export default function FlipDrill({ deckId, n = 12 }) {
  /* ---------- live screen size ---------- */
  const { width } = useWindowDimensions();
  const CARD_W    = Math.min(width * 0.9, 720);
  const CARD_H    = CARD_W * 0.62;

  /* ---------- state ---------- */
  const [cards,   setCards]   = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err,     setErr]     = useState("");
  const [showCtx, setShowCtx] = useState(true);

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

  const ellipsize = (s, limit = 220) => {
    if (!s) return "";
    const t = s.trim();
    return t.length > limit ? t.slice(0, limit - 1) + "…" : t;
    };

  /* ---------- early / error UI ---------- */
  if (err) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: COLORS.blue }]}>
        <Text style={{ color: COLORS.gold, fontSize: 18, textAlign: "center" }}>{err}</Text>
      </SafeAreaView>
    );
  }
  if (!cards.length) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: COLORS.blue }]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ marginTop: 12, color: COLORS.gold, fontSize: 18 }}>Loading cards…</Text>
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
          <Switch
            value={showCtx}
            onValueChange={setShowCtx}
            trackColor={{ false: "#97A6B3", true: COLORS.gold }}
            thumbColor={COLORS.white}
          />
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
            styles.cardFront,
            { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
          ]}
        >
          <Text style={styles.cardText}>{card.front}</Text>
        </Animated.View>

        {/* back */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { transform: [{ perspective: 1000 }, { rotateY: backRot }] },
          ]}
        >
          <Text style={styles.cardText}>{card.back}</Text>

          {/* context block (excerpt + page) */}
          {showCtx && (card.excerpt || card.page != null) && (
            <View style={styles.contextBox}>
              {!!card.excerpt && (
                <Text style={styles.excerpt}>"{ellipsize(card.excerpt)}"</Text>
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
    backgroundColor: COLORS.blue,
    alignItems: "center",
  },
  center: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  topBar: {
    marginTop: 12,
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gold,
  },
  ctxToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctxLabel: {
    color: COLORS.gold,
    fontSize: 16,
    marginRight: 6,
    fontWeight: "600",
  },
  cardWrap: {
    marginTop: 28,
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    paddingHorizontal: 16,
  },
  cardFront: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  cardBack: {
    backgroundColor: COLORS.lightGold,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  cardText: {
    fontSize: 28,           // significantly larger
    lineHeight: 34,
    textAlign: "center",
    color: COLORS.blue,
    fontWeight: "700",
  },
  contextBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gold,
    width: "94%",
  },
  excerpt: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.blue,
    textAlign: "center",
    fontStyle: "italic",
  },
  pageNote: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.blue,
    textAlign: "center",
    fontWeight: "700",
  },
  buttons: {
    position: "absolute",
    bottom: 44,
    flexDirection: "row",
    gap: 20,
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
