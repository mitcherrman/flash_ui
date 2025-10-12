// src/Screens/GameMC.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";
import CardShell from "../components/CardShell";
import { pickDistractors, shuffle } from "../utils/PickDistractors";
import { fetchWithCache, deckHandKey } from "../utils/cache";
import { s, stateStyles } from "../styles/screens/GameMC.styles";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function GameMC({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // layout flags
  const isLandscape = width > height;
  const isWeb = Platform.OS === "web";
  const canHover =
    isWeb &&
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(hover: hover)").matches;
  const isDesktopWeb = isWeb && (width >= 1024 || canHover);

  // sizes — desktop gets larger canvas + card
  const CONTENT_MAX_W = isDesktopWeb
    ? Math.min(1400, Math.floor(width * 0.92))
    : Math.min(960, Math.floor(width * 0.94));

  const CARD_W = isDesktopWeb
    ? Math.min(1000, Math.floor(CONTENT_MAX_W * 0.92))
    : Math.min(720, CONTENT_MAX_W);

  // small banner on mobile landscape, larger on desktop
  const CARD_H = isDesktopWeb
    ? Math.max(120, Math.min(240, Math.floor(height * 0.22)))
    : isLandscape
    ? Math.max(70, Math.min(110, Math.floor(height * 0.12)))
    : Math.floor(CARD_W * 0.6);

  const { deckId, order = "doc", startOrdinal = null } = route.params || {};

  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);

  // modes
  const [gameMode, setGameMode] = useState("normal");
  const [rightCount, setRightCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const startOrdinalNum = useMemo(() => {
    const v =
      typeof startOrdinal === "number"
        ? startOrdinal
        : startOrdinal != null
        ? parseInt(String(startOrdinal), 10)
        : null;
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [startOrdinal]);

  function goToPicker() {
    navigation.reset({ index: 0, routes: [{ name: "Picker", params: { deckId } }] });
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("deck_id", String(deckId));
        params.set("n", "all");
        params.set("order", order);
        const url = `${API_ROOT}/hand/?${params.toString()}`;

        const data = await fetchWithCache({
          key: deckHandKey(deckId, order, "all"),
          fetcher: async () => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
        setRightCount(0);
        setWrongCount(0);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, order, startOrdinalNum]);

  const _norm = (s) => String(s || "").trim().replace(/\s+/g, " ");

  useEffect(() => {
    if (!cards.length) return;
    const card = cards[idx];
    const correct = _norm(card.back);

    let d = Array.isArray(card?.distractors) ? card.distractors.map(_norm).filter(Boolean) : [];
    const seen = new Set();
    d = d.filter((x) => {
      const key = x.toLowerCase();
      if (key === correct.toLowerCase()) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (d.length < 3) {
      const needed = 3 - d.length;
      const pool = pickDistractors(card, cards, Math.max(needed * 2, 3));
      for (const cand of pool) {
        const c = _norm(cand);
        const key = c.toLowerCase();
        if (!c || key === correct.toLowerCase() || seen.has(key)) continue;
        d.push(c);
        seen.add(key);
        if (d.length >= 3) break;
      }
    }

    const all = shuffle([correct, ...d.slice(0, 3)]);
    setOptions(all);
    setCorrectIndex(all.findIndex((a) => _norm(a).toLowerCase() === correct.toLowerCase()));
    setPicked(null);
  }, [cards, idx]);

  const next = () => {
    if (!cards.length) return;
    setIdx((i) => (i + 1) % cards.length);
  };
  const prev = () => {
    if (!cards.length) return;
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  };

  const pick = (i) => {
    if (picked != null) return;
    setPicked(i);
    Haptics.selectionAsync().catch(() => {});
    if (gameMode === "endless") {
      if (i === correctIndex) setRightCount((n) => n + 1);
      else setWrongCount((n) => n + 1);
    }
    setTimeout(next, 700);
  };

  const switchMode = (mode) => {
    if (mode === gameMode) return;
    setGameMode(mode);
    setPicked(null);
    setRightCount(0);
    setWrongCount(0);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={s.muted}>Loading…</Text>
      </View>
    );
  }
  if (err || !cards.length) {
    return (
      <View style={s.center}>
        <Text style={s.error}>{err || "No cards."}</Text>
      </View>
    );
  }

  const card = cards[idx];
  const total = cards.length;

  return (
    <SafeAreaView style={s.container}>
      {/* Top row */}
      <View
        style={[
          s.topBar,
          {
            paddingTop: isDesktopWeb ? 10 : isLandscape ? 4 : 8,
            paddingHorizontal: isDesktopWeb ? 18 : 10,
            minHeight: isLandscape ? 48 : 60,
          },
        ]}
      >
        {/* Left */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable onPress={goToPicker} style={s.topBtn}>
            <Text style={s.topBtnTxt}>Back</Text>
          </Pressable>
          <View style={[s.modeToggleWrap, { marginLeft: 4 }]}>
            <Pressable
              onPress={() => switchMode("normal")}
              style={[s.modeToggleBtn, gameMode === "normal" && s.modeToggleActive]}
            >
              <Text style={[s.modeToggleTxt, gameMode === "normal" && s.modeToggleTxtActive]}>
                1
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode("endless")}
              style={[s.modeToggleBtn, gameMode === "endless" && s.modeToggleActive]}
            >
              <Text style={[s.modeToggleTxt, gameMode === "endless" && s.modeToggleTxtActive]}>
                2
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Center title */}
        {isLandscape ? (
          <Text
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              top: insets.top + (isDesktopWeb ? 2 : 6),
              color: "#E6ECF0",
              fontWeight: "800",
              fontSize: isDesktopWeb ? 18 : 16,
            }}
          >
            Card {idx + 1}/{total}
          </Text>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={[s.header, isDesktopWeb && { fontSize: 18 }]}>
              Card {idx + 1}/{total}
            </Text>
          </View>
        )}

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {gameMode === "endless" && (
            <>
              <View style={[s.counterPill, s.counterRight]}>
                <Text style={s.counterTxt}> {rightCount}</Text>
              </View>
              <View style={[s.counterPill, s.counterWrong]}>
                <Text style={s.counterTxt}> {wrongCount}</Text>
              </View>
            </>
          )}
          <Pressable
            onPress={() =>
              navigation.navigate("TOC", {
                deckId,
                returnTo: "GameMC",
                startOrdinal: idx + 1,
              })
            }
            style={[s.topBtn, { backgroundColor: "#0ea5e9" }]}
          >
            <Text style={[s.topBtnTxt, { color: "white" }]}>TOC</Text>
          </Pressable>
        </View>
      </View>

      {/* Card + options */}
      <View style={[s.contentWrap, { maxWidth: CONTENT_MAX_W, alignSelf: "center" }]}>
        <View style={{ alignItems: "center" }}>
          <CardShell width={CARD_W} height={CARD_H} variant="front">
            <Text
              style={[
                s.question,
                isLandscape && !isDesktopWeb && { fontSize: 15 },
                isDesktopWeb && { fontSize: 22, lineHeight: 28 },
              ]}
              numberOfLines={isDesktopWeb ? 2 : isLandscape ? 1 : 3}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {card.front}
            </Text>
          </CardShell>
        </View>

        <View style={[s.optsWrap, { marginTop: isLandscape ? 10 : 14, alignItems: "center" }]}>
          <View
            style={[
              s.opts,
              {
                width: "100%",
                maxWidth: isDesktopWeb ? Math.min(CONTENT_MAX_W, CARD_W) : "100%",
              },
            ]}
          >
            {options.map((opt, i) => {
              const isPicked = picked === i;
              const isCorrect = i === correctIndex;
              const state =
                picked == null ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "idle";
              return (
                <Pressable
                  key={i}
                  onPress={() => pick(i)}
                  style={[
                    s.opt,
                    isDesktopWeb && { minHeight: 56, paddingVertical: 14 },
                    isLandscape && !isDesktopWeb && { minHeight: 40, paddingVertical: 8 },
                    stateStyles[state],
                  ]}
                >
                  <Text
                    style={[
                      s.optText,
                      isDesktopWeb && { fontSize: 18, lineHeight: 24 },
                      isLandscape && !isDesktopWeb && { fontSize: 14, lineHeight: 18 },
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.controls, { marginBottom: 16 + insets.bottom }]}>
            <Pressable onPress={prev} style={s.btn}>
              <Text style={s.btnTxt}>Previous</Text>
            </Pressable>
            <Pressable onPress={next} style={s.btn}>
              <Text style={s.btnTxt}>Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
