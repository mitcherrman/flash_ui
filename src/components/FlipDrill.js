// FlipDrill.js — React Native / Expo Web flip‑card component
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";

const API = "http://127.0.0.1:8000/api/flashcards";

fetch(`${API}/hand/?deck_id=${deckId}&n=12`)

export default function App() {
  /* ------------------------------------------------------------------ */
  /* State */
  const [cards,   setCards]   = useState([]);   // loaded from API
  const [idx,     setIdx]     = useState(0);    // current index
  const [flipped, setFlipped] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Fetch hand once */
  useEffect(() => {
    fetch(`${API}/hand?n=12`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data);
        setIdx(0);
      })
      .catch((e) => console.error("API error:", e));
  }, []);

  /* ------------------------------------------------------------------ */
  /* Loading placeholder */
  if (!cards.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.counter}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const card = cards[idx];

  /* ------------------------------------------------------------------ */
  /* Flip animation */
  const flipAnim = useRef(new Animated.Value(0)).current;
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

  /* ------------------------------------------------------------------ */
  /* Swipe gesture */
  const panX = useRef(new Animated.Value(0)).current;
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
    onPanResponderMove: (_, g) => panX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 100) prevCard();
      else if (g.dx < -100) nextCard();
      Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
    },
  });

  /* ------------------------------------------------------------------ */
  /* Navigation helpers */
  const nextCard = () => {
    setIdx((i) => (i + 1) % cards.length);
    setFlipped(false);
  };
  const prevCard = () => {
    setIdx((i) => (i - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>
        Card {idx + 1}/{cards.length}
      </Text>

      <Animated.View
        {...responder.panHandlers}
        style={[styles.cardWrap, { transform: [{ translateX: panX }] }]}
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

/* ---------------------------------------------------------------------- */
/* Styles */
const { width } = Dimensions.get("window");
const CARD_W = width * 0.8;
const CARD_H = CARD_W * 0.6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  counter: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  cardWrap: {
    marginTop: 40,
    width: CARD_W,
    height: CARD_H,
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
  },
  cardBack: {
    backgroundColor: "#e0f2fe",
  },
  text: {
    fontSize: 22,
    textAlign: "center",
    color: "#0f172a",
    paddingHorizontal: 8,
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
