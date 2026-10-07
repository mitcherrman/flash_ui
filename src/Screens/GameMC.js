// src/Screens/GameMC.js
// Multiple Choice (F3).
//
// State lives in the pure mcReducer (src/study/mc.js): one accepted answer
// per card visit, score counted once, and a `step` token on every move.
// Auto-advance (correct answers only, never past the last card) is scheduled
// by an effect keyed on that step, so Next/Previous/TOC jump/unmount/leaving
// the screen cancel it, and a late timer is ignored by the reducer anyway.
// After answering, the card's source (section, page, excerpt) is shown.
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import CardShell from "../components/CardShell";
import SourcePanel from "../components/study/SourcePanel";
import DeckStatus from "../components/study/DeckStatus";
import { pickDistractors, shuffle } from "../utils/PickDistractors";
import { useDeckHand, useSavedTemplate } from "../study/useDeck";
import { indexForOrdinal } from "../study/deck";
import {
  OPTION_LETTERS,
  SCORE_MODES,
  buildOptions,
  createAdvanceTimer,
  initialMcState,
  isLastCard,
  mcReducer,
  optionLabel,
  optionState,
  shouldAutoAdvance,
} from "../study/mc";
import { backToPickerAction, openTocAction } from "../study/tocNav";
import { Badge, Button, Chip, ChipGroup, StatusView } from "../ui";
import { s, stateStyles } from "../styles/screens/GameMC.styles";

const tick = () => {
  try {
    Haptics.selectionAsync()?.catch?.(() => {});
  } catch {}
};

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
  const shortLandscape = isLandscape && !isDesktopWeb;

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

  const { deckId, startOrdinal = null, jump = null } = route.params || {};
  const deck = useDeckHand(deckId);
  const template = useSavedTemplate(deckId);
  const cards = deck.items;

  const [mc, dispatch] = useReducer(mcReducer, undefined, initialMcState);
  const [gameMode, setGameMode] = useState("normal");
  const [showSource, setShowSource] = useState(true);

  const timerRef = useRef(null);
  if (!timerRef.current) timerRef.current = createAdvanceTimer();
  const timer = timerRef.current;

  // ——— Initial load / resume (score resets) and TOC jumps (score kept) ———
  const loadedRef = useRef(null);
  useEffect(() => {
    if (deck.status !== "ready") {
      loadedRef.current = null;
      return;
    }
    timer.cancel();
    const idx = indexForOrdinal(startOrdinal, cards.length) ?? 0;
    if (loadedRef.current !== cards) {
      loadedRef.current = cards;
      dispatch({ type: "load", total: cards.length, idx });
    } else {
      dispatch({ type: "jump", idx });
    }
  }, [deck.status, cards, startOrdinal, jump]);

  // Options are shuffled once per card visit (`step`), as before.
  const ready = deck.status === "ready" && mc.total === cards.length && cards.length > 0;
  const card = ready ? cards[mc.idx] : null;
  const { options, correctIndex } = useMemo(
    () => (card ? buildOptions(card, cards, { pickDistractors, shuffle }) : { options: [], correctIndex: -1 }),
    [cards, mc.step, ready]
  );

  // ——— Auto-advance: at most one timer, tied to the answered card visit ———
  const autoAdvance = shouldAutoAdvance(mc, correctIndex);
  useEffect(() => {
    if (!autoAdvance) return undefined;
    const step = mc.step;
    timer.schedule(() => dispatch({ type: "auto", step }));
    return () => timer.cancel();
  }, [autoAdvance, mc.step]);

  // Leaving the screen (TOC on top, Back) cancels a pending advance; unmount too.
  useEffect(() => {
    const unsub = navigation?.addListener?.("blur", () => timer.cancel());
    return () => {
      unsub?.();
      timer.cancel();
    };
  }, [navigation]);

  const next = () => {
    timer.cancel();
    dispatch({ type: "next" });
  };
  const prev = () => {
    timer.cancel();
    dispatch({ type: "prev" });
  };

  const pick = (i) => {
    if (mc.picked != null) return; // the reducer also ignores it
    tick();
    dispatch({ type: "answer", option: i, correct: i === correctIndex, keepScore: gameMode === "endless" });
  };

  const switchMode = (mode) => {
    if (mode === gameMode) return;
    setGameMode(mode);
    dispatch({ type: "resetScore" });
  };

  if (deck.status !== "ready") {
    return <DeckStatus state={deck} deckId={deckId} navigation={navigation} />;
  }
  if (!ready) {
    return <StatusView loading title="Loading cards…" />;
  }

  const total = mc.total;
  const answered = mc.picked != null;
  const wasCorrect = answered && mc.picked === correctIndex;
  const last = isLastCard(mc);
  const status = !answered
    ? null
    : wasCorrect
    ? last
      ? "Correct. That was the last card. Next goes back to card 1."
      : "Correct. Moving to the next card…"
    : last
    ? "Not quite. The correct answer is marked. That was the last card. Next goes back to card 1."
    : "Not quite. The correct answer is marked. Press Next when you're ready.";

  const statusLine = status ? (
    <Text style={s.status} accessibilityLiveRegion="polite" accessibilityRole="text">
      {status}
    </Text>
  ) : null;

  const source = answered ? (
    <SourcePanel
      card={card}
      template={template}
      revealed
      showSource={showSource}
      onToggleSource={setShowSource}
      style={[s.source, { width: "100%", maxWidth: isDesktopWeb ? Math.min(CONTENT_MAX_W, CARD_W) : "100%" }]}
    />
  ) : null;

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
          <Button title="Back" variant="secondary" size="sm" accessibilityLabel="Back to deck" onPress={() => navigation.dispatch(backToPickerAction(deckId))} />
        </View>

        {/* Center title */}
        {isLandscape ? (
          <Text
            style={[
              s.counterLandscape,
              { top: insets.top + (isDesktopWeb ? 2 : 6), fontSize: isDesktopWeb ? 18 : 16 },
            ]}
            accessibilityLiveRegion="polite"
          >
            Card {mc.idx + 1} of {total}
          </Text>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {/* Narrow phones: 44px targets leave little room, so drop the word "Card" */}
            <Text
              style={[s.header, isDesktopWeb && { fontSize: 18 }]}
              numberOfLines={1}
              accessibilityLabel={`Card ${mc.idx + 1} of ${total}`}
              accessibilityLiveRegion="polite"
            >
              {width < 480 ? `${mc.idx + 1}/${total}` : `Card ${mc.idx + 1} of ${total}`}
            </Text>
          </View>
        )}

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {gameMode === "endless" && (
            <>
              <Badge tone="success" style={s.counterBadge} accessibilityLabel={`Right: ${mc.right}`}>✓ {mc.right}</Badge>
              <Badge tone="error" style={s.counterBadge} accessibilityLabel={`Wrong: ${mc.wrong}`}>✗ {mc.wrong}</Badge>
            </>
          )}
          <Button
            title="Contents"
            variant="secondary"
            size="sm"
            accessibilityLabel="Table of contents"
            onPress={() => navigation.dispatch(openTocAction({ from: "GameMC", deckId, currentOrdinal: mc.idx + 1 }))}
          />
        </View>
      </View>

      {/* Card + options */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.contentWrap, { maxWidth: CONTENT_MAX_W, width: "100%", alignSelf: "center" }]}
      >
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
              accessibilityRole="header"
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
            accessibilityRole="list"
            accessibilityLabel="Answer options"
          >
            {options.map((opt, i) => {
              const { state, tag } = optionState({ index: i, picked: mc.picked, correctIndex });
              const isPicked = mc.picked === i;
              return (
                <Pressable
                  key={`${mc.step}-${i}`}
                  onPress={() => pick(i)}
                  disabled={answered}
                  accessibilityRole="button"
                  accessibilityLabel={optionLabel({ index: i, text: opt, picked: mc.picked, correctIndex })}
                  accessibilityState={{ selected: isPicked, disabled: answered }}
                  style={({ hovered }) => [
                    s.opt,
                    isDesktopWeb && { minHeight: 56, paddingVertical: 14 },
                    isLandscape && !isDesktopWeb && { minHeight: 40, paddingVertical: 8 },
                    hovered && !answered && s.optHover,
                    stateStyles[state],
                  ]}
                >
                  <View style={s.optRow}>
                    <Text
                      style={[
                        s.optLetter,
                        isLandscape && !isDesktopWeb && { fontSize: 14, lineHeight: 18 },
                        state !== "idle" && stateStyles[`${state}Text`],
                      ]}
                    >
                      {/* Short landscape has no room for a tag line, so the
                          ✓/✗ takes the letter's place (still not colour-only). */}
                      {shortLandscape && tag ? (state === "correct" ? "✓" : "✗") : OPTION_LETTERS[i]}
                    </Text>
                    <View style={s.optBody}>
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
                      {!!tag && !shortLandscape && (
                        <Text style={[s.optTag, stateStyles[`${state}Text`]]}>
                          {state === "correct" ? "✓ " : "✗ "}
                          {tag}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Status and source after answering. In short landscape they go
              below the controls so those keep their place (layout is F4's). */}
          {!shortLandscape && statusLine}
          {!shortLandscape && source}

          <View style={[s.controls, { marginBottom: 12 }]}>
            <Button title="Previous" variant="secondary" accessibilityLabel="Previous card" onPress={prev} style={s.navBtn} />
            <Button title="Next" accessibilityLabel="Next card" onPress={next} style={s.navBtn} />
          </View>

          {shortLandscape && statusLine}
          {shortLandscape && source}

          <ChipGroup label="Scoring" style={[s.modeToggleWrap, { marginBottom: 16 + insets.bottom }]}>
            {SCORE_MODES.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                accessibilityLabel={m.description}
                selected={gameMode === m.id}
                onPress={() => switchMode(m.id)}
              />
            ))}
          </ChipGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
