// src/Screens/GameLRScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";

import CardShell from "../components/CardShell";
import styles from "../styles/screens/GameLRScreen.styles";
import { API_BASE } from "../config";
import { fetchWithCache, deckHandKey } from "../utils/cache";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameLRScreen({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const deckId = route.params?.deckId;
  const order = route.params?.order ?? "doc";
  const n = route.params?.n ?? "all";

  const [cards, setCards] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // left/right indices + advancing cursor
  const [L, setL] = useState(0);
  const [R, setR] = useState(1);
  const cursorRef = useRef(2);

  // feedback state (for overlays)
  const [pickedSide, setPickedSide] = useState(null); // "L" | "R" | null

  // choice animation
  const pickAnim = useRef(new Animated.Value(0)).current; // 0 idle, 1 pick left, 2 pick right
  const scaleL = pickAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 1.03, 0.985],
  });
  const scaleR = pickAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0.985, 1.03],
  });

  const THRESH = 80;

  useEffect(() => {
    if (!deckId) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", typeof n === "string" ? n : String(n));
        params.set("order", order);

        const url = `${API_ROOT}/hand/?${params.toString()}`;

        const data = await fetchWithCache({
          key: deckHandKey(deckId, order, typeof n === "string" ? n : String(n)),
          ttlMs: 6 * 60 * 60 * 1000,
          fetcher: async () => {
            const r = await fetch(url);
            if (!r.ok) {
              const t = await r.text();
              throw new Error(`HTTP ${r.status} • ${t.slice(0, 180)}`);
            }
            return r.json();
          },
        });

        const arr = Array.isArray(data) ? data : [];
        setCards(arr);
        setL(0);
        setR(Math.min(1, Math.max(0, arr.length - 1)));
        cursorRef.current = 2;
        setPickedSide(null);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, order, n]);

  const safeCard = (i) =>
    cards?.length ? cards[(i + cards.length) % cards.length] : null;

  const leftCard = useMemo(() => safeCard(L), [cards, L]);
  const rightCard = useMemo(() => safeCard(R), [cards, R]);

  // This is just a simple progress label (not a strict “round number”)
  const counterText = cards.length ? `${Math.max(L, R) + 1}/${cards.length}` : "—";

  const goBack = () => {
    navigation.reset({ index: 0, routes: [{ name: "Picker", params: { deckId } }] });
  };

  const nextIndex = () => {
    const i = cursorRef.current;
    cursorRef.current = i + 1;
    return cards.length ? i % cards.length : i;
  };

  const commitPick = (side /* "L" | "R" */) => {
    if (!cards.length) return;

    setPickedSide(side);
    Haptics.selectionAsync().catch(() => {});

    Animated.timing(pickAnim, {
      toValue: side === "L" ? 1 : 2,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // winner stays, replace loser
      if (side === "L") setR(nextIndex());
      else setL(nextIndex());

      Animated.timing(pickAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        setPickedSide(null);
      });
    });
  };

  const pan = useRef(new Animated.Value(0)).current;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14,
        onPanResponderMove: (_, g) => pan.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          const dx = g.dx;
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();

          if (dx <= -THRESH) commitPick("L"); // swipe LEFT chooses LEFT
          else if (dx >= THRESH) commitPick("R"); // swipe RIGHT chooses RIGHT
        },
      }),
    [cards.length]
  );

  // Card sizing: clean + consistent
  const CARD_W = useMemo(() => {
    const maxW = Math.min(980, width * 0.96);
    const gap = 12;
    const laneInnerPad = 12 * 2;
    const laneW = (maxW - gap) / 2 - laneInnerPad;
    return Math.max(240, Math.min(520, Math.floor(laneW)));
  }, [width]);

  const CARD_H = Math.max(
    140,
    Math.min(isLandscape ? 220 : 320, Math.floor(CARD_W * 0.62))
  );

  if (!deckId) return <View style={styles.screen} />;

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: "rgba(60,60,67,0.60)", fontWeight: "700" }}>
          Loading…
        </Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 18 }]}>
        <Text style={{ color: "#111827", fontWeight: "900", fontSize: 16 }}>
          Something went wrong
        </Text>
        <Text style={{ marginTop: 10, color: "rgba(60,60,67,0.60)", textAlign: "center" }}>
          {err}
        </Text>
        <View style={{ height: 16 }} />
        <Pressable onPress={goBack} style={styles.navBtn}>
          <Text style={styles.navBtnTxt}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "rgba(60,60,67,0.60)", fontWeight: "800" }}>No cards.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={goBack} style={styles.navBtn}>
          <Text style={styles.navBtnTxt}>Back</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Left / Right</Text>
          <Text style={styles.subtitle}>{counterText}</Text>
        </View>

        <Pressable
          onPress={() =>
            navigation.navigate("TOC", {
              deckId,
              returnTo: "GameLR",
              mode: "lr",
              startOrdinal: null,
            })
          }
          style={styles.navBtn}
        >
          <Text style={styles.navBtnTxt}>TOC</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content} {...responder.panHandlers}>
        <View style={styles.pairWrap}>
          {/* LEFT */}
          <View style={[styles.lane, styles.shadow]}>
            <View style={styles.laneLabelRow}>
              <Text style={styles.laneLabel}>Left</Text>
              <View style={styles.lanePill}>
                <Text style={styles.lanePillTxt}>Swipe ←</Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: scaleL }] }}>
              <View style={styles.cardHold}>
                <CardShell width={CARD_W} height={CARD_H} variant="front">
                  <Text style={[styles.prompt, CARD_W < 320 && styles.promptSmall]}>
                    {leftCard?.front || "—"}
                  </Text>
                </CardShell>

                {/* overlay */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.overlay,
                    pickedSide === "L" ? styles.overlayPick : null,
                    pickedSide === "R" ? styles.overlayLose : null,
                  ]}
                />
              </View>
            </Animated.View>

            <Pressable onPress={() => commitPick("L")} style={styles.chooseBtn}>
              <Text style={styles.chooseBtnTxt}>Choose Left</Text>
            </Pressable>
          </View>

          {/* RIGHT */}
          <View style={[styles.lane, styles.shadow]}>
            <View style={styles.laneLabelRow}>
              <Text style={styles.laneLabel}>Right</Text>
              <View style={styles.lanePill}>
                <Text style={styles.lanePillTxt}>Swipe →</Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: scaleR }] }}>
              <View style={styles.cardHold}>
                <CardShell width={CARD_W} height={CARD_H} variant="front">
                  <Text style={[styles.prompt, CARD_W < 320 && styles.promptSmall]}>
                    {rightCard?.front || "—"}
                  </Text>
                </CardShell>

                {/* overlay */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.overlay,
                    pickedSide === "R" ? styles.overlayPick : null,
                    pickedSide === "L" ? styles.overlayLose : null,
                  ]}
                />
              </View>
            </Animated.View>

            <Pressable onPress={() => commitPick("R")} style={styles.chooseBtn}>
              <Text style={styles.chooseBtnTxt}>Choose Right</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hintWrap}>
          <Text style={styles.hintTxt}>
            Swipe <Text style={styles.hintAccent}>left</Text> to choose the left card, swipe{" "}
            <Text style={styles.hintAccent}>right</Text> to choose the right card.
          </Text>
        </View>
      </View>
    </View>
  );
}
