// src/components/FlipDrill.js
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
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "../config";
import { fetchWithCache, deckHandKey } from "../utils/cache";
import CardShell from "./CardShell";
import styles from "../styles/components/FlipDrill.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

// --- Visual tuning knobs (easy to adjust) ---
// You can tune the button positions separately for portrait & landscape.
const TUNE = {
  // Card proportions & scaling
  CARD_ASPECT: 0.60,            // height = width * aspect (portrait baseline)
  PORTRAIT_CARD_SCALE: 0.98,     // 0.80–1.00 (smaller = smaller card in portrait)

  // Landscape layout reserves space for controls below the card
  LANDSCAPE_MIN_CARD_H: 140,     // px minimum height in landscape
  LANDSCAPE_CONTROLS_H: 72,      // reserved space below card (landscape)

  // Prev/Next absolute positioning (distance from bottom)
  BUTTONS_BOTTOM_PORTRAIT: 50,   // ↑ raise to move higher in portrait
  BUTTONS_BOTTOM_LANDSCAPE: 10,  // ↑ raise to move higher in landscape

  // Spacing between buttons
  BUTTONS_GAP_PORTRAIT: 10,
  BUTTONS_GAP_LANDSCAPE: 10,
};

export default function FlipDrill({
  deckId,
  n = "all",
  order = "doc",
  startOrdinal = null,
  onOpenTOC,
  onGoBack,
  navigation,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  // ——— Size calc (portrait: big card; landscape: ensure room for Prev/Next) ———
  const H_PADDING = 16;
  const V_PADDING = isLandscape ? 8 : 16;

  const availW = width - insets.left - insets.right - H_PADDING * 2;
  const availH = height - insets.top - insets.bottom - V_PADDING * 2;

  let CARD_W, CARD_H;
  if (!isLandscape) {
    CARD_W = Math.min(900, availW * TUNE.PORTRAIT_CARD_SCALE);
    CARD_H = Math.round(CARD_W * TUNE.CARD_ASPECT);
  } else {
    // In landscape, leave room for the control row
    const hForCard = Math.max(TUNE.LANDSCAPE_MIN_CARD_H, availH - TUNE.LANDSCAPE_CONTROLS_H - 16);
    CARD_W = Math.min(900, availW);
    CARD_H = Math.min(hForCard, Math.round(CARD_W * TUNE.CARD_ASPECT));
    // If card ends up too tall, clamp by height
    CARD_W = Math.min(CARD_W, Math.round(CARD_H / TUNE.CARD_ASPECT));
  }

  // ——— State ———
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err, setErr] = useState("");
  const [showCtx, setShowCtx] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current; // 0 -> front, 180 -> back
  const panX = useRef(new Animated.Value(0)).current;

  const startOrdinalNum = useMemo(() => {
    const v =
      typeof startOrdinal === "number"
        ? startOrdinal
        : startOrdinal != null
        ? parseInt(String(startOrdinal), 10)
        : null;
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [startOrdinal]);

  // ——— Flip animation (rotate entire shell) ———
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

  // ——— Load cards ———
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", typeof n === "string" ? n : String(n));
        if (order) params.set("order", order);
        const url = `${API_ROOT}/hand/?${params.toString()}`;

        const data = await fetchWithCache({
          key: deckHandKey(deckId, order || "random", typeof n === "string" ? n : String(n)),
          ttlMs: 6 * 60 * 60 * 1000,
          fetcher: async () => {
            const r = await fetch(url);
            if (!r.ok) {
              const txt = await r.text();
              throw new Error(`HTTP ${r.status} • ${txt.slice(0, 140)}`);
            }
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
        setFlipped(false);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [deckId, n, order, startOrdinalNum]);

  // ——— Swipe nav ———
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

  const handleBack = () => {
    if (typeof onGoBack === "function") return onGoBack();
    navigation?.reset?.({ index: 0, routes: [{ name: "Picker", params: { deckId } }] });
  };

  const ellipsize = (s, limit = 360) => {
    if (!s) return "";
    const t = String(s).trim();
    return t.length > limit ? t.slice(0, limit - 1) + "…" : t;
  };

  // ——— Loading / error ———
  if (err) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#FDB515", textAlign: "center", fontSize: 18 }}>{err}</Text>
      </SafeAreaView>
    );
  }
  if (!cards.length) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={{ marginTop: 8, color: "#E6ECF0", fontSize: 18 }}>Loading cards…</Text>
      </SafeAreaView>
    );
  }

  const card = cards[idx] || {};
  const sectionName = card.section?.title || card.section || "";
  const pageLabel = typeof card.page === "number" ? `p. ${card.page}` : "";
  const contextTag = card.context || "";

  // ——— TOP BAR: uncluttered (Back • centered counter • TOC) ———
  return (
    <SafeAreaView style={[styles.container, { paddingTop: V_PADDING, paddingBottom: V_PADDING }]}>
      <View
        style={[
          styles.topBar,
          {
            width: "92%",
            minHeight: isLandscape ? 44 : 56,
            alignSelf: "center",
          },
        ]}
      >
        {/* Left */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backTxt}>Back</Text>
          </Pressable>
        </View>

        {/* Center (always visible; absolute centering in landscape to prevent squish) */}
        {isLandscape ? (
          <Text
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              color: "#E6ECF0",
              fontWeight: "800",
            }}
          >
            Card {idx + 1}/{cards.length}
          </Text>
        ) : (
          <Text style={styles.counter}>Card {idx + 1}/{cards.length}</Text>
        )}

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {onOpenTOC ? (
            <Pressable onPress={onOpenTOC} style={styles.tocBtn}>
              <Text style={styles.tocTxt}>TOC</Text>
            </Pressable>
          ) : navigation ? (
            <Pressable
              onPress={() =>
                navigation.navigate("TOC", {
                  deckId,
                  returnTo: "Game2",
                  startOrdinal: idx + 1,
                })
              }
              style={styles.tocBtn}
            >
              <Text style={styles.tocTxt}>TOC</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* CARD (press to flip) */}
      <Animated.View
        {...responder.panHandlers}
        style={[
          {
            width: CARD_W,
            height: CARD_H,
            alignSelf: "center",
            marginTop: isLandscape ? 8 : 16,
          },
          { transform: [{ translateX: panX }] },
        ]}
      >
        {/* FRONT */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backfaceVisibility: "hidden" },
            { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
          ]}
        >
          <CardShell width={CARD_W} height={CARD_H} variant="front">
            <View style={local.cardInner}>
              <Text style={styles.textFront}>{card.front}</Text>
            </View>
          </CardShell>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backfaceVisibility: "hidden" },
            { transform: [{ perspective: 1000 }, { rotateY: backRot }] },
          ]}
        >
          <CardShell width={CARD_W} height={CARD_H} variant="back">
            <View style={local.cardInner}>
              <Text style={styles.textBack}>{card.back}</Text>
            </View>
          </CardShell>
        </Animated.View>

        {/* Tap to flip */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => {
            Haptics.selectionAsync();
            setFlipped((f) => !f);
          }}
        />
      </Animated.View>

      {/* ── Info panel (wrapped, no truncation) ─────────────────────────── */}
      {!(Platform.OS !== "web" && isLandscape) && (
        <View
          style={[
            styles.infoPanel,
            { width: CARD_W, alignSelf: "center", marginTop: 12 },
          ]}
        >
          {/* Section (wraps) */}
          <Text style={[styles.infoLine, { flexWrap: "wrap" }]}>
            {!!sectionName && <Text style={styles.infoKey}>Section: </Text>}
            <Text style={styles.infoVal}>{sectionName || "—"}</Text>
          </Text>

          {/* Page + Context (wraps) */}
          <Text style={[styles.infoLine, { flexWrap: "wrap" }]}>
            <Text style={styles.infoKey}>Page: </Text>
            <Text style={styles.infoVal}>{pageLabel || "—"}</Text>
            {!!contextTag && <Text style={styles.infoVal}>   •   {contextTag}</Text>}
          </Text>

          {/* Toggle moved here to declutter header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <Text style={styles.ctxLabel}>Show context</Text>
            <Switch
              value={showCtx}
              onValueChange={setShowCtx}
              thumbColor="#FDB515"
              trackColor={{ true: "#FFCD00" }}
              style={{ marginLeft: 8 }}
            />
          </View>

          {showCtx && !!card.excerpt && (
            <Text style={[styles.excerpt, { marginTop: 6 }]}>
              "{ellipsize(card.excerpt, 360)}"
            </Text>
          )}
        </View>
      )}

      {/* Prev / Next — absolute, with separate portrait/landscape tuning */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: isLandscape ? TUNE.BUTTONS_GAP_LANDSCAPE : TUNE.BUTTONS_GAP_PORTRAIT,
          bottom:
            insets.bottom +
            (isLandscape ? TUNE.BUTTONS_BOTTOM_LANDSCAPE : TUNE.BUTTONS_BOTTOM_PORTRAIT),
        }}
      >
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

const local = StyleSheet.create({
  cardInner: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
