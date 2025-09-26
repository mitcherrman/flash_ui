// src/components/FlipDrill.js
/* FlipDrill – two-sided flash-card drill (basic / MC)
   • UC-Berkeley palette, larger type
   • Toggle to show/hide excerpt
   • Shows source info: Section, Page, Context, Excerpt
   • TOC jump without reordering: keep list in doc order and set initial index locally
   • Landscape (native): hide info panel so the card can fit with a small border
   • Watermark image on card faces (subtle opacity)
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
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE } from "../config";
import { fetchWithCache, deckHandKey } from "../utils/cache";
import styles from "../styles/components/FlipDrill.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;
const WATERMARK = require("../../assets/BEARlogo.png");
const CARD_ASPECT = 0.6; // height = width * 0.6

export default function FlipDrill({
  deckId,
  n = "all",
  order = "random",          // "random" | "doc"
  startOrdinal = null,       // number | null (1-based)
  onOpenTOC,
  onGoBack,                  // optional override for Back action
  navigation,                // optional (if parent passes react-navigation prop)
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const hideInfoPanel = Platform.OS !== "web" && isLandscape;
  const BORDER = isLandscape ? 8 : 16;

  // Compute card size
  let CARD_W, CARD_H;
  if (!isLandscape) {
    CARD_W = Math.min(900, width * 0.9);
    CARD_H = CARD_W * CARD_ASPECT;
  } else {
    const availW = width - (insets.left + insets.right) - BORDER * 2;
    const availH = height - (insets.top + insets.bottom) - BORDER * 2;
    CARD_W = Math.min(900, availW, availH / CARD_ASPECT);
    CARD_H = CARD_W * CARD_ASPECT;
  }

  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err, setErr] = useState("");
  const [showCtx, setShowCtx] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
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

  // load cards (keeps doc order; we jump locally)
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

  // swipe navigation
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
    if (typeof onGoBack === "function") {
      onGoBack();
      return;
    }
    if (navigation?.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Picker", params: { deckId } }],
      });
    }
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
    <SafeAreaView
      style={[
        styles.container,
        isLandscape && { paddingTop: BORDER, paddingBottom: BORDER },
      ]}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.leftGroup}>
          {(onGoBack || navigation) && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backTxt}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.counter}>
            Card {idx + 1}/{cards.length}
          </Text>
        </View>

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

      {/* Card */}
      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.cardWrap,
          { width: CARD_W, height: CARD_H },
          { transform: [{ translateX: panX }] },
        ]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>#{idx + 1}</Text>
        </View>

        {/* FRONT */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
          ]}
        >
          <Image
            source={WATERMARK}
            style={styles.watermark}
            resizeMode="contain"
            pointerEvents="none"
          />
          <Text style={styles.textFront}>{card.front}</Text>
        </Animated.View>

        {/* BACK */}
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
          <Image
            source={WATERMARK}
            style={[styles.watermark, styles.watermarkBack]}
            resizeMode="contain"
            pointerEvents="none"
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

      {/* Info panel (hidden in native landscape) */}
      {!hideInfoPanel && (
        <View style={[styles.infoPanel, { width: CARD_W }]}>
          <Text style={styles.infoLine}>
            {!!sectionName && <Text style={styles.infoKey}>Section: </Text>}
            <Text style={styles.infoVal}>{sectionName || "—"}</Text>
          </Text>

          <Text style={styles.infoLine}>
            <Text style={styles.infoKey}>Page: </Text>
            <Text style={styles.infoVal}>{pageLabel || "—"}</Text>
            {!!contextTag && <Text style={styles.infoVal}>   •   {contextTag}</Text>}
          </Text>

          {showCtx && !!card.excerpt && (
            <Text style={styles.excerpt}>"{ellipsize(card.excerpt, 360)}"</Text>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={[styles.buttons, { bottom: 34 + insets.bottom }]}>
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
