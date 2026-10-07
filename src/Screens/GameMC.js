// src/Screens/GameMC.js
// Multiple Choice (F3).
//
// State lives in the pure mcReducer (src/study/mc.js): one accepted answer
// per card visit, score counted once, and a `step` token on every move.
// Auto-advance (correct answers only, never past the last card) is scheduled
// by an effect keyed on that step, so Next/Previous/TOC jump/unmount/leaving
// the screen cancel it, and a late timer is ignored by the reducer anyway.
// After answering, the card's source (section, page, excerpt) is shown.
//
// Layout (F4, src/study/layout.js) by window class, never by hover:
//   phone / tablet  question, options, status and source scroll; Previous /
//                   Next pinned in a footer.
//   short           question (+ source after answering) on the left; options
//                   on the right, scrolling if long, with the status line and
//                   Previous / Next pinned under them.
//   desktop         question and source on the left; options, status,
//                   controls and scoring on the right.
// Questions and options are never truncated or font-shrunk.
// Web keyboard: 1–4 answer, ←/→ previous/next (src/study/shortcuts.js).
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { View, Text, Pressable, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import CardShell from "../components/CardShell";
import SourcePanel from "../components/study/SourcePanel";
import StudyHeader from "../components/study/StudyHeader";
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
import { mcLayout, studyText } from "../study/layout";
import { shortcutHint } from "../study/shortcuts";
import { focusIsLost, focusRef, useStudyKeys } from "../study/useStudyKeys";
import { backToPickerAction, openTocAction } from "../study/tocNav";
import { Badge, Button, Chip, ChipGroup, StatusView, useLayout } from "../ui";
import { s, stateStyles } from "../styles/screens/GameMC.styles";

const IS_WEB = Platform.OS === "web";
const keys = (k) => (IS_WEB ? { "aria-keyshortcuts": k } : null);
const QUESTION_MIN_H = { phone: 140, tablet: 180, short: 120, desktop: 200 };

const tick = () => {
  try {
    Haptics.selectionAsync()?.catch?.(() => {});
  } catch {}
};

export default function GameMC({ route, navigation }) {
  const { width, height, layoutClass } = useLayout();
  const insets = useSafeAreaInsets();
  const L = mcLayout({ layoutClass, width, height, insets });
  const T = studyText(layoutClass);
  const short = layoutClass === "short";
  const isFocused = useIsFocused();

  const { deckId, startOrdinal = null, jump = null } = route.params || {};
  const deck = useDeckHand(deckId);
  const template = useSavedTemplate(deckId);
  const cards = deck.items;

  const [mc, dispatch] = useReducer(mcReducer, undefined, initialMcState);
  const [gameMode, setGameMode] = useState("normal");
  const [showSource, setShowSource] = useState(true);
  const questionRef = useRef(null);
  const nextRef = useRef(null);

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

  // ——— Web keyboard (only while this screen is the visible one) ———
  useStudyKeys({
    enabled: isFocused && ready,
    getContext: () => ({ mode: "mc", optionCount: options.length, answered: mc.picked != null }),
    onAction: (a) => {
      if (a.type === "answer") pick(a.option);
      else if (a.type === "next") next();
      else if (a.type === "prev") prev();
    },
  });

  // Web: arriving here (from the Picker, or back from a TOC jump whose row was
  // removed) leaves focus nowhere useful; put it on the question.
  useEffect(() => {
    if (!IS_WEB || !isFocused || !ready) return undefined;
    const raf = requestAnimationFrame(() => {
      if (focusIsLost()) focusRef(questionRef);
    });
    return () => cancelAnimationFrame(raf);
  }, [isFocused, ready]);

  // Web: answering disables the focused option, which would drop focus to
  // the page; continue from Next instead (the button a wrong answer needs).
  useEffect(() => {
    if (!IS_WEB || mc.picked == null) return undefined;
    const raf = requestAnimationFrame(() => {
      if (focusIsLost()) focusRef(nextRef);
    });
    return () => cancelAnimationFrame(raf);
  }, [mc.picked, mc.step]);

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

  // ——— Pieces ———
  const header = (
    <StudyHeader
      index={mc.idx + 1}
      total={total}
      compact={width < 480}
      maxWidth={L.rowW}
      left={
        <Button
          title="Back"
          variant="secondary"
          size="sm"
          accessibilityLabel="Back to deck"
          onPress={() => navigation.dispatch(backToPickerAction(deckId))}
        />
      }
      right={
        <>
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
        </>
      }
    />
  );

  const question = (
    <CardShell width={L.leftW} height="auto" variant="front" style={{ minHeight: QUESTION_MIN_H[layoutClass] }}>
      <Text style={s.faceLabel}>Question</Text>
      <Text
        ref={questionRef}
        style={[s.question, T.question]}
        accessibilityRole="header"
        {...(IS_WEB ? { tabIndex: -1 } : null)}
      >
        {card.front}
      </Text>
    </CardShell>
  );

  const optionList = (
    <View style={s.opts} accessibilityRole="list" accessibilityLabel="Answer options">
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
            {...keys(String(i + 1))}
            style={({ hovered }) => [
              s.opt,
              { minHeight: L.optionMinH },
              short && s.optShort,
              hovered && !answered && s.optHover,
              stateStyles[state],
            ]}
          >
            <View style={s.optRow}>
              <Text style={[s.optLetter, state !== "idle" && stateStyles[`${state}Text`]]}>
                {/* Short landscape keeps options one line shorter: the ✓/✗
                    takes the letter's place (still not colour-only; the
                    accessible label has the full wording). */}
                {short && tag ? (state === "correct" ? "✓" : "✗") : OPTION_LETTERS[i]}
              </Text>
              <View style={s.optBody}>
                <Text style={[s.optText, T.option, state !== "idle" && stateStyles[`${state}Text`]]}>{opt}</Text>
                {!!tag && !short && (
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
  );

  const statusLine = status ? (
    <Text style={[s.status, short && s.statusShort]} accessibilityLiveRegion="polite" accessibilityRole="text">
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
      style={s.source}
    />
  ) : null;

  const navRow = (style) => (
    <View style={[s.controls, style]}>
      <Button title="Previous" variant="secondary" accessibilityLabel="Previous card" onPress={prev} style={s.navBtn} {...keys("ArrowLeft")} />
      <Button ref={nextRef} title="Next" accessibilityLabel="Next card" onPress={next} style={s.navBtn} {...keys("ArrowRight")} />
    </View>
  );

  const scoring = (
    <ChipGroup label="Scoring" style={s.modeToggleWrap}>
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
  );

  const headerWrap = <View style={[s.headerWrap, short && s.headerWrapShort, { paddingHorizontal: L.gutter }]}>{header}</View>;

  // ——— Short landscape: question (+ source) | options + controls ———
  if (short) {
    return (
      <SafeAreaView style={s.container}>
        {headerWrap}
        <View style={[s.shortBody, { width: L.rowW }]}>
          <ScrollView style={{ width: L.leftW, flexGrow: 0 }} contentContainerStyle={s.colScroll}>
            {question}
            {source}
            {scoring}
          </ScrollView>
          <View style={[s.side, { width: L.rightW }]}>
            <ScrollView style={s.fill} contentContainerStyle={s.colScroll}>
              {optionList}
            </ScrollView>
            {statusLine}
            {navRow(s.controlsSide)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ——— Desktop: question + source | options + controls ———
  if (L.columns === 2) {
    return (
      <SafeAreaView style={s.container}>
        {headerWrap}
        <ScrollView style={s.fill} contentContainerStyle={[s.desktopScroll, { paddingHorizontal: L.gutter }]}>
          <View style={[s.desktopRow, { width: L.rowW }]}>
            <View style={[s.col, { width: L.leftW }]}>
              {question}
              {source}
            </View>
            <View style={[s.col, { width: L.rightW }]}>
              {optionList}
              {statusLine}
              {navRow(s.controlsUnder)}
              {scoring}
              {L.showKeyHint && IS_WEB ? (
                <Text style={s.keyHint}>{shortcutHint("mc", options.length)}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— Phone / tablet: one column, controls pinned ———
  return (
    <SafeAreaView style={s.container}>
      {headerWrap}
      <ScrollView style={s.fill} contentContainerStyle={[s.columnScroll, { paddingHorizontal: L.gutter }]}>
        <View style={[s.col, { width: L.leftW }]}>
          {question}
          {optionList}
          {statusLine}
          {source}
          {scoring}
        </View>
      </ScrollView>
      <View style={[s.footer, { paddingHorizontal: L.gutter }]}>
        {navRow({ width: L.leftW })}
      </View>
    </SafeAreaView>
  );
}
