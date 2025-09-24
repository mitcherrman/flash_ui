// src/components/FlipDrill.js
/* FlipDrill – two-sided flash-card drill (basic / MC)
   • UC-Berkeley palette, larger type
   • Toggle to show/hide excerpt
   • Shows source info: Section, Page, Context, Excerpt
   • TOC jump without reordering: we keep list in doc order and set initial index locally
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
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function FlipDrill({
  deckId,
  n = "all",
  order = "random",          // "random" | "doc"
  startOrdinal = null,       // number | null (1-based)
  onOpenTOC,
}) {
  const { width } = useWindowDimensions();
  const CARD_W = Math.min(900, width * 0.9);
  const CARD_H = CARD_W * 0.6;

  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err, setErr] = useState("");
  const [showCtx, setShowCtx] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const panX = useRef(new Animated.Value(0)).current;

  // Ensure a stable, valid number or null
  const startOrdinalNum = useMemo(() => {
    const v =
      typeof startOrdinal === "number"
        ? startOrdinal
        : startOrdinal != null
        ? parseInt(String(startOrdinal), 10)
        : null;
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [startOrdinal]);

  // flip animation
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

  // Prevent redundant fetch loops
  const lastURLRef = useRef("");

  // Load cards (always in doc order when order="doc")
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", typeof n === "string" ? n : String(n));
        if (order) params.set("order", order);
        // IMPORTANT: do NOT send start_ordinal – we don’t want the server to rotate
        const url = `${API_ROOT}/hand/?${params.toString()}`;

        if (url === lastURLRef.current) return;
        lastURLRef.current = url;

        const r = await fetch(url);
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`HTTP ${r.status} • ${txt.slice(0, 140)}`);
        }
        const data = await r.json();

        setCards(data);
        // Jump to the requested ordinal locally while keeping doc order intact
        const initial =
          order === "doc" &&
          startOrdinalNum != null &&
          startOrdinalNum >= 1 &&
          startOrdinalNum <= data.length
            ? startOrdinalNum - 1
            : 0;
        setIdx(initial);
        setFlipped(false);
      } catch (e) {
        setErr(String(e));
      }
    })();
    // Note: startOrdinalNum intentionally NOT in deps so we don't refetch just to jump
  }, [deckId, n, order]);

  // Swipe navigation
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

  const nextCard = () => {
    if (!cards.length) return;
    Haptics.selectionAsync();
    setIdx((i) => (i + 1) % cards.length);
    setFlipped(false);
  };
  const prevCard = () => {
    if (!cards.length) return;
    Haptics.selectionAsync();
    setIdx((i) => (i - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  const ellipsize = (s, limit = 260) => {
    if (!s) return "";
    const t = String(s).trim();
    return t.length > limit ? t.slice(0, limit - 1) + "…" : t;
  };

  if (err) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#FDB515", textAlign: "center", fontSize: 18 }}>
          {err}
        </Text>
      </SafeAreaView>
    );
  }
  if (!cards.length) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={{ marginTop: 8, color: "#E6ECF0", fontSize: 18 }}>
          Loading cards…
        </Text>
      </SafeAreaView>
    );
  }

  const card = cards[idx] || {};
  const sectionName = card.section?.title || card.section || "";
  const pageLabel = typeof card.page === "number" ? `p. ${card.page}` : "";
  const contextTag = card.context || "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.counter}>
          Card {idx + 1}/{cards.length}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {onOpenTOC && (
            <TouchableOpacity onPress={onOpenTOC} style={styles.tocBtn}>
              <Text style={styles.tocTxt}>TOC</Text>
            </TouchableOpacity>
          )}
          <View style={styles.ctxToggle}>
            <Text style={styles.ctxLabel}>Show context</Text>
            <Switch
              value={showCtx}
              onValueChange={setShowCtx}
              thumbColor="#FDB515"
              trackColor={{ true: "#FFCD00" }}
            />
          </View>
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
        <View style={styles.badge}>
          {/* badge uses current index (1-based), which aligns to doc order now */}
          <Text style={styles.badgeTxt}>#{idx + 1}</Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
          ]}
        >
          <Text style={styles.textFront}>{card.front}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { transform: [{ perspective: 1000 }, { rotateY: backRot }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.02)", "rgba(0,0,0,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.02)", "rgba(0,0,0,0.06)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.textBack}>{card.back}</Text>
        </Animated.View>

        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => {
            Haptics.selectionAsync();
            setFlipped((f) => !f);
          }}
        />
      </Animated.View>

      <View style={[styles.infoPanel, { width: CARD_W }]}>
        <Text style={styles.infoLine}>
          {!!sectionName && <Text style={styles.infoKey}>Section: </Text>}
          <Text style={styles.infoVal}>{sectionName || "—"}</Text>
        </Text>

        <Text style={styles.infoLine}>
          <Text style={styles.infoKey}>Page: </Text>
          <Text style={styles.infoVal}>{pageLabel || "—"}</Text>
          {!!contextTag && (
            <Text style={styles.infoVal}>   •   {contextTag}</Text>
          )}
        </Text>

        {showCtx && !!card.excerpt && (
          <Text style={styles.excerpt}>"{ellipsize(card.excerpt, 360)}"</Text>
        )}
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#003262",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#003262",
  },
  topBar: {
    marginTop: 16,
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: { fontSize: 20, color: "#E6ECF0", fontWeight: "700" },
  ctxToggle: { flexDirection: "row", alignItems: "center", marginLeft: 16 },
  ctxLabel: { color: "#E6ECF0", marginRight: 8, fontSize: 16 },
  tocBtn: { backgroundColor: "#0ea5e9", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tocTxt: { color: "white", fontWeight: "800" },

  cardWrap: { marginTop: 24 },
  badge: {
    position: "absolute",
    top: -8,
    left: 12,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  badgeTxt: { color: "white", fontWeight: "800" },

  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    paddingHorizontal: 16,
  },
  cardBack: { backgroundColor: "#FFCD00" },
  textFront: {
    fontSize: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 36,
  },
  textBack: {
    fontSize: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 36,
  },

  infoPanel: {
    marginTop: 16,
    backgroundColor: "#012B57",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0C4A6E",
    padding: 12,
  },
  infoLine: { color: "#E6ECF0", fontSize: 16, marginBottom: 8 },
  infoKey: { color: "#FFCD00", fontWeight: "800" },
  infoVal: { color: "#E6ECF0", fontWeight: "700" },
  excerpt: {
    marginTop: 8,
    color: "#F1F5F9",
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 20,
  },

  buttons: {
    position: "absolute",
    bottom: 32,
    flexDirection: "row",
  },
  btn: {
    backgroundColor: "#FDB515",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  btnTxt: { color: "#082F49", fontWeight: "800", fontSize: 16 },
});
