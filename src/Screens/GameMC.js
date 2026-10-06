// src/Screens/GameMC.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../config";
import CardShell from "../components/CardShell";
import { pickDistractors, shuffle } from "../utils/PickDistractors";
import { fetchWithCache, deckHandKey } from "../utils/cache";
import { Badge, Button, Chip, ChipGroup, StatusView } from "../ui";
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
    return <StatusView loading title="Loading…" />;
  }
  if (err || !cards.length) {
    return err
      ? <StatusView tone="error" title="Couldn't load cards" message={err} />
      : <StatusView tone="empty" title="No cards." />;
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
          <Button title="Back" variant="secondary" size="sm" onPress={goToPicker} />
          <ChipGroup label="Scoring mode" style={[s.modeToggleWrap, { marginLeft: 4 }]}>
            <Chip
              label="1"
              accessibilityLabel="Mode 1: no score"
              selected={gameMode === "normal"}
              onPress={() => switchMode("normal")}
            />
            <Chip
              label="2"
              accessibilityLabel="Mode 2: endless, counts right and wrong answers"
              selected={gameMode === "endless"}
              onPress={() => switchMode("endless")}
            />
          </ChipGroup>
        </View>

        {/* Center title */}
        {isLandscape ? (
          <Text
            style={[
              s.counterLandscape,
              { top: insets.top + (isDesktopWeb ? 2 : 6), fontSize: isDesktopWeb ? 18 : 16 },
            ]}
          >
            Card {idx + 1}/{total}
          </Text>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {/* Narrow phones: 44px targets leave little room, so drop the word "Card" */}
            <Text
              style={[s.header, isDesktopWeb && { fontSize: 18 }]}
              numberOfLines={1}
              accessibilityLabel={`Card ${idx + 1} of ${total}`}
            >
              {width < 480 ? `${idx + 1}/${total}` : `Card ${idx + 1}/${total}`}
            </Text>
          </View>
        )}

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {gameMode === "endless" && (
            <>
              <Badge tone="success" style={s.counterBadge} accessibilityLabel={`Right: ${rightCount}`}>✓ {rightCount}</Badge>
              <Badge tone="error" style={s.counterBadge} accessibilityLabel={`Wrong: ${wrongCount}`}>✗ {wrongCount}</Badge>
            </>
          )}
          <Button
            title="TOC"
            variant="secondary"
            size="sm"
            accessibilityLabel="Table of contents"
            onPress={() =>
              navigation.navigate("TOC", {
                deckId,
                returnTo: "GameMC",
                startOrdinal: idx + 1,
              })
            }
          />
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: isPicked }}
                  style={({ hovered }) => [
                    s.opt,
                    isDesktopWeb && { minHeight: 56, paddingVertical: 14 },
                    isLandscape && !isDesktopWeb && { minHeight: 40, paddingVertical: 8 },
                    hovered && picked == null && s.optHover,
                    stateStyles[state],
                  ]}
                >
                  <Text
                    style={[
                      s.optText,
                      isDesktopWeb && { fontSize: 18, lineHeight: 24 },
                      isLandscape && !isDesktopWeb && { fontSize: 14, lineHeight: 18 },
                      state !== "idle" && stateStyles[`${state}Text`],
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.controls, { marginBottom: 16 + insets.bottom }]}>
            <Button title="Previous" variant="secondary" accessibilityLabel="Previous card" onPress={prev} style={s.navBtn} />
            <Button title="Next" accessibilityLabel="Next card" onPress={next} style={s.navBtn} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
