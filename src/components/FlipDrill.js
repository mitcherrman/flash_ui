// src/components/FlipDrill.js
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
  ActivityIndicator,
  Platform,
} from "react-native";

import { API_BASE } from "../config";      // ⬅ adjust path if config lives elsewhere

/* ------------------------------------------------------------------ */
/*            Flip‑drill component  (Game 2 – mastery drill)          */
/* ------------------------------------------------------------------ */
export default function FlipDrill({ deckId, mode = "basic" }) {
  /* --------------- runtime sanity check ---------------------------- */
  if (!deckId) {
    console.warn("[FlipDrill] deckId prop is", deckId);
  }

  /* --------------- state ------------------------------------------- */
  const [cards,   setCards]   = useState([]);        // fetched from API
  const [idx,     setIdx]     = useState(0);         // current card index
  const [flipped, setFlipped] = useState(false);
  const [status,  setStatus]  = useState("loading"); // loading | empty | ready | error
  const [err,     setErr]     = useState("");

  /* --------------- fetch on mount ---------------------------------- */
  useEffect(() => {
    const url =
      deckId && deckId !== "undefined"
        ? `${API_BASE}/hand?deck_id=${deckId}&n=12`
        : `${API_BASE}/hand?n=12`;

    console.log("[FlipDrill] fetching", url);

    fetch(url)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(`HTTP ${res.status} – ${await res.text()}`);
        return res.json();
      })
      .then((data) => {
        console.log("[FlipDrill] fetched", data.length, "cards");
        if (data.length === 0) {
          setStatus("empty");
        } else {
          setCards(data);
          setStatus("ready");
        }
      })
      .catch((e) => {
        console.error("[FlipDrill] fetch ERROR", e);
        setErr(String(e));
        setStatus("error");
      });
  }, [deckId]);

  /* ------------------------------------------------------------------ */
  /*           early‑return UI for loading / empty / error              */
  /* ------------------------------------------------------------------ */
  if (status === "loading") {
    return (
      <Center>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Fetching cards…</Text>
      </Center>
    );
  }

  if (status === "empty") {
    return (
      <Center>
        <Text>No cards found for this deck.</Text>
        <Text style={styles.small}>
          (Check Django console – maybe card generation failed.)
        </Text>
      </Center>
    );
  }

  if (status === "error") {
    return (
      <Center>
        <Text style={{ color: "red", textAlign: "center" }}>
          {err || "Load failed"}
        </Text>
      </Center>
    );
  }

  /* ------------------------------------------------------------------ */
  /*                drill logic  (status === "ready")                   */
  /* ------------------------------------------------------------------ */
  const card = cards[idx];

  /* flip animation */
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

  /* swipe gesture */
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

  /* nav helpers */
  function nextCard() {
    setIdx((i) => (i + 1) % cards.length);
    setFlipped(false);
  }
  function prevCard() {
    setIdx((i) => (i - 1 + cards.length) % cards.length);
    setFlipped(false);
  }

  /* ------------------------------------------------------------------ */
  /*                          RENDER                                    */
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

/* ------------------------------------------------------------------ */
/* helper to center children */
function Center({ children }) {
  return (
    <SafeAreaView style={styles.center}>
      {children}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* styles */
const { width } = Dimensions.get("window");
const CARD_W = width * 0.8;
const CARD_H = CARD_W * 0.6;

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
    backgroundColor: "#f9fafb",
    paddingHorizontal: 20,
  },
  small: { fontSize: 12, color: "#64748b", marginTop: 4 },
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
