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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import CardShell from "../components/CardShell";
import styles from "../styles/screens/GameLRScreen.styles";
import { API_BASE } from "../config";
import { fetchWithCache, deckHandKey } from "../utils/cache";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameLRScreen({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  // choice animation
  const pickAnim = useRef(new Animated.Value(0)).current; // 0 idle, 1 pick left, 2 pick right
  const scaleL = pickAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.03, 0.985] });
  const scaleR = pickAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.985, 1.03] });

  const THRESH = 70;

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

        setCards(Array.isArray(data) ? data : []);
        setL(0);
        setR(1);
        cursorRef.current = 2;
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, order, n]);

  const safeCard = (i) => (cards?.length ? cards[(i + cards.length) % cards.length] : null);

  const leftCard = useMemo(() => safeCard(L), [cards, L]);
  const rightCard = useMemo(() => safeCard(R), [cards, R]);

  const counterText = cards.length ? `${Math.max(L, R) + 1}/${cards.length}` : "—";

  const goBack = () => {
    navigation.reset({ index: 0, routes: [{ name: "Picker", params: { deckId } }] });
  };

  const nextIndex = () => {
    const i = cursorRef.current;
    cursorRef.current = i + 1;
    return cards.length ? i % cards.length : i;
  };

  const commitPick = (pickedSide /* "L" | "R" */) => {
    if (!cards.length) return;

    Haptics.selectionAsync().catch(() => {});

    Animated.timing(pickAnim, {
      toValue: pickedSide === "L" ? 1 : 2,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      if (pickedSide === "L") setR(nextIndex());
      else setL(nextIndex());

      Animated.timing(pickAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
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

  // ── Mobile-first layout ─────────────────────────────────────────────
  // Portrait (iPhone): STACK cards vertically (readable)
  // Landscape/tablet: side-by-side
  const isPhonePortrait = !isLandscape && width < 520;

  const GAP = 12;
  const outerPad = 14;

  const availW = width - insets.left - insets.right - outerPad * 2;
  const CARD_W = useMemo(() => {
    if (isPhonePortrait) {
      return Math.min(420, availW); // keep readable width on iPhone
    }
    // 2-up layout
    const laneW = (Math.min(980, availW) - GAP) / 2;
    return Math.max(260, Math.min(520, Math.floor(laneW)));
  }, [width, insets.left, insets.right, isPhonePortrait]);

  const CARD_H = useMemo(() => {
    // Slightly taller on phone portrait so questions breathe
    if (isPhonePortrait) return Math.max(220, Math.min(320, Math.floor(CARD_W * 0.74)));
    return Math.max(170, Math.min(isLandscape ? 240 : 300, Math.floor(CARD_W * 0.62)));
  }, [CARD_W, isLandscape, isPhonePortrait]);

  if (!deckId) return <View style={styles.screen} />;
  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingTxt}>Loading…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={[styles.screen, styles.center, { padding: 18 }]}>
        <Text style={styles.errTitle}>Something went wrong</Text>
        <Text style={styles.errBody}>{err}</Text>
        <View style={{ height: 16 }} />
        <Pressable onPress={goBack} style={styles.pillBtn}>
          <Text style={styles.pillBtnTxt}>Back</Text>
        </Pressable>
      </View>
    );
  }
  if (!cards.length) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errTitle}>No cards.</Text>
      </View>
    );
  }

  const Lane = ({ side, card, scale, onPick, label }) => (
    <View style={styles.lane}>
      <View style={styles.laneHeader}>
        <Text style={styles.laneTitle}>{label}</Text>
        <View style={styles.lanePill}>
          <Text style={styles.lanePillTxt}>
            {side === "L" ? "Swipe ←" : "Swipe →"}
          </Text>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.cardHold, { width: CARD_W, height: CARD_H }]}>
          {/* depth stack */}
          <View pointerEvents="none" style={styles.stackBack2} />
          <View pointerEvents="none" style={styles.stackBack1} />

          <CardShell
            width={CARD_W}
            height={CARD_H}
            variant="front"
            style={styles.cardSurface}
          >
            <Text
              style={styles.prompt}
              numberOfLines={isPhonePortrait ? 5 : 4}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {card?.front || "—"}
            </Text>
          </CardShell>
        </View>

        {/* subtle feedback overlay */}
        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            side === "L"
              ? pickAnim.__getValue?.() === 1
                ? styles.overlayPick
                : pickAnim.__getValue?.() === 2
                ? styles.overlayLose
                : null
              : pickAnim.__getValue?.() === 2
              ? styles.overlayPick
              : pickAnim.__getValue?.() === 1
              ? styles.overlayLose
              : null,
          ]}
        />
      </Animated.View>

      <Pressable onPress={onPick} style={[styles.pillBtn, { marginTop: 12 }]}>
        <Text style={styles.pillBtnTxt}>
          Choose {side === "L" ? "Left" : "Right"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
        <Pressable onPress={goBack} style={styles.pillBtn}>
          <Text style={styles.pillBtnTxt}>Back</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Pick the better card</Text>
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
          style={[styles.pillBtn, styles.tocBtn]}
        >
          <Text style={[styles.pillBtnTxt, styles.tocTxt]}>TOC</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]} {...responder.panHandlers}>
        <View style={[styles.pairWrap, isPhonePortrait && styles.pairWrapStack]}>
          <Lane
            side="L"
            label="Left"
            card={leftCard}
            scale={scaleL}
            onPick={() => commitPick("L")}
          />
          <Lane
            side="R"
            label="Right"
            card={rightCard}
            scale={scaleR}
            onPick={() => commitPick("R")}
          />
        </View>

        <View style={[styles.hintWrap, { marginBottom: insets.bottom + 10 }]}>
          <Text style={styles.hintTxt}>
            Swipe <Text style={styles.hintAccent}>left</Text> to choose the left card, swipe{" "}
            <Text style={styles.hintAccent}>right</Text> to choose the right card.
          </Text>
        </View>
      </View>
    </View>
  );
}
