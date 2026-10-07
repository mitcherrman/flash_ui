// src/components/FlipDrill.js
// Flip Drill: question → think → tap to reveal → source → next (F3).
//
// Data comes from the screen (useDeckHand), so this component only renders a
// ready deck. Card changes (Next, Previous, swipe, TOC jump, initial load,
// resume) always land on the QUESTION side: the flip is reset instantly,
// never animated back, so the next card's answer is never visible mid-turn.
// The source excerpt stays hidden until the answer has been revealed on this
// card visit (it is the passage the answer was written from).
//
// Layout (F4, src/study/layout.js) by window class, never by hover:
//   phone / tablet  card + source scroll; Previous/Next pinned in a footer
//                   above the template bar.
//   short           card on the left (its column scrolls if the text is
//                   long); source and Previous/Next on the right; the
//                   template is a header button, so nothing covers the card.
//   desktop         card with Previous/Next under it, source beside it.
// The card grows to fit long text instead of clipping it.
// Web keyboard: Space/Enter flip, ←/→ previous/next (src/study/shortcuts.js).
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";

import CardShell from "./CardShell";
import SourcePanel from "./study/SourcePanel";
import StudyHeader from "./study/StudyHeader";
import { motion, spacing } from "../theme";
import { Button, USE_NATIVE_DRIVER, useLayout, useReducedMotion } from "../ui";
import { indexForOrdinal } from "../study/deck";
import { backToPickerAction, openTocAction } from "../study/tocNav";
import {
  flipCardHeight,
  flipDrillLayout,
  isHorizontalSwipe,
  studyText,
  swipeDirection,
  swipeThreshold,
} from "../study/layout";
import { shortcutHint } from "../study/shortcuts";
import { focusIsLost, focusRef, useStudyKeys } from "../study/useStudyKeys";
import styles from "../styles/components/FlipDrill.styles";

const IS_WEB = Platform.OS === "web";
// Announce the key a control also answers to (web only; native ignores keys).
const keys = (k) => (IS_WEB ? { "aria-keyshortcuts": k } : null);

// Haptics are native-only; never let an unsupported platform reject loudly.
const tick = () => {
  try {
    Haptics.selectionAsync()?.catch?.(() => {});
  } catch {}
};

// "Question: Why?" + ". Show the answer" without doubling the punctuation.
const sentence = (t) => {
  const x = String(t ?? "").trim();
  return /[.?!…:]$/.test(x) ? x : `${x}.`;
};

export default function FlipDrill({
  deckId,
  cards,
  template = null,
  startOrdinal = null,
  jump = null,
  navigation,
  onOpenTemplate = null, // header "Template" button (short / desktop layouts)
}) {
  const { width, height, layoutClass } = useLayout();
  const insets = useSafeAreaInsets();
  const L = flipDrillLayout({ layoutClass, width, height, insets });
  const T = studyText(layoutClass);
  const isFocused = useIsFocused();

  // ——— State ———
  const total = cards.length;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false); // answer shown on this card visit
  const [showSource, setShowSource] = useState(true);

  // Measured: the short layout's body height, and each face's text height
  // (the card grows to fit long text rather than clipping it).
  const [bodyH, setBodyH] = useState(0);
  const [textH, setTextH] = useState({ front: 0, back: 0 });
  const measureFace = (face) => (e) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setTextH((prev) => (prev[face] === h ? prev : { ...prev, [face]: h }));
  };
  const baseCardH = layoutClass === "short" && bodyH > 0 ? Math.max(160, bodyH) : L.baseCardH;
  const CARD_W = L.cardW;
  const CARD_H = flipCardHeight(baseCardH, Math.max(textH.front, textH.back));

  const flipAnim = useRef(new Animated.Value(0)).current; // 0 -> front, 180 -> back
  const panX = useRef(new Animated.Value(0)).current;
  const cardRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Every card change goes through here: question side, instantly.
  const goTo = useCallback(
    (nextIdx) => {
      flipAnim.stopAnimation();
      flipAnim.setValue(0);
      setFlipped(false);
      setRevealed(false);
      setIdx(nextIdx);
    },
    [flipAnim]
  );

  // ——— Initial load, resume and TOC jumps (a new `jump` token per jump) ———
  useEffect(() => {
    if (!total) return;
    goTo(indexForOrdinal(startOrdinal, total) ?? 0);
  }, [total, startOrdinal, jump, goTo]);

  // ——— Flip animation (rotate entire shell; instant under reduced motion) ———
  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 180 : 0,
      duration: reduceMotion ? 0 : motion.duration.deliberate,
      useNativeDriver: USE_NATIVE_DRIVER,
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

  const toggleFlip = () => {
    tick();
    const next = !flipped;
    setFlipped(next);
    if (next) setRevealed(true);
  };

  const nextCard = () => {
    if (!total) return;
    tick();
    goTo((idx + 1) % total);
  };
  const prevCard = () => {
    if (!total) return;
    tick();
    goTo((idx - 1 + total) % total);
  };

  // ——— Swipe nav (handlers read the latest state through a ref) ———
  const navRef = useRef({ next: nextCard, prev: prevCard, threshold: 100 });
  navRef.current = { next: nextCard, prev: prevCard, threshold: swipeThreshold(CARD_W) };
  const springBack = () => {
    if (reduceMotion) panX.setValue(0);
    else Animated.spring(panX, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER }).start();
  };
  const springRef = useRef(springBack);
  springRef.current = springBack;

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Clearly horizontal drags only, so vertical scrolling keeps working.
        onMoveShouldSetPanResponder: (_, g) => isHorizontalSwipe(g.dx, g.dy),
        onPanResponderMove: (_, g) => panX.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          const dir = swipeDirection(g.dx, navRef.current.threshold);
          if (dir === "next") navRef.current.next();
          else if (dir === "prev") navRef.current.prev();
          springRef.current();
        },
        onPanResponderTerminate: () => springRef.current(),
      }),
    [panX]
  );

  // ——— Web keyboard (only while this screen is the visible one) ———
  useStudyKeys({
    enabled: isFocused,
    getContext: () => ({ mode: "flip" }),
    onAction: (a) => {
      if (a.type === "flip") toggleFlip();
      else if (a.type === "next") nextCard();
      else if (a.type === "prev") prevCard();
    },
  });

  // Web: arriving here (from the Picker, or back from a TOC jump whose row was
  // removed) leaves focus nowhere useful; put it on the card.
  useEffect(() => {
    if (!IS_WEB || !isFocused) return undefined;
    const raf = requestAnimationFrame(() => {
      if (focusIsLost()) focusRef(cardRef);
    });
    return () => cancelAnimationFrame(raf);
  }, [isFocused]);

  const handleBack = () => navigation?.dispatch(backToPickerAction(deckId));
  const openToc = () => navigation?.dispatch(openTocAction({ from: "Game2", deckId, currentOrdinal: idx + 1 }));

  const card = cards[idx] || {};
  const desktop = layoutClass === "desktop";
  const pointerHint = desktop && IS_WEB;

  // ——— Pieces ———
  const header = (
    <StudyHeader
      index={idx + 1}
      total={total}
      compact={width < 480}
      maxWidth={L.columns === 2 ? L.rowW : L.cardW}
      left={<Button title="Back" variant="secondary" size="sm" accessibilityLabel="Back to deck" onPress={handleBack} />}
      right={
        <>
          {L.templatePlacement === "header" && onOpenTemplate ? (
            <Button
              title="Template"
              variant="secondary"
              size="sm"
              accessibilityLabel="Open study template"
              onPress={onOpenTemplate}
            />
          ) : null}
          {navigation ? (
            <Button title="Contents" variant="secondary" size="sm" accessibilityLabel="Table of contents" onPress={openToc} />
          ) : null}
        </>
      }
    />
  );

  const cardEl = (
    <Animated.View
      {...responder.panHandlers}
      style={[{ width: CARD_W, height: CARD_H }, { transform: [{ translateX: panX }] }]}
    >
      {/* FRONT — hidden from assistive tech while the answer shows */}
      <Animated.View
        aria-hidden={flipped}
        importantForAccessibility={flipped ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={flipped}
        style={[
          StyleSheet.absoluteFillObject,
          { backfaceVisibility: "hidden" },
          { transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
        ]}
      >
        <CardShell width={CARD_W} height={CARD_H} variant="front">
          <Text style={styles.faceLabel}>Question</Text>
          <View style={styles.cardInner}>
            <View style={styles.measure} onLayout={measureFace("front")}>
              <Text style={[styles.textFront, T.front]}>{card.front}</Text>
            </View>
          </View>
          <Text style={styles.faceHint}>
            {pointerHint ? "Click the card or press Space to show the answer" : "Tap the card to show the answer"}
          </Text>
        </CardShell>
      </Animated.View>

      {/* BACK — not exposed to assistive tech until revealed */}
      <Animated.View
        aria-hidden={!flipped}
        importantForAccessibility={flipped ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={!flipped}
        style={[
          StyleSheet.absoluteFillObject,
          { backfaceVisibility: "hidden" },
          { transform: [{ perspective: 1000 }, { rotateY: backRot }] },
        ]}
      >
        <CardShell width={CARD_W} height={CARD_H} variant="back">
          <Text style={[styles.faceLabel, styles.faceLabelBack]}>Answer</Text>
          <View style={styles.cardInner}>
            <View style={styles.measure} onLayout={measureFace("back")}>
              <Text style={[styles.textBack, T.back]}>{flipped || revealed ? card.back : ""}</Text>
            </View>
          </View>
          <Text style={[styles.faceHint, styles.faceLabelBack]}>
            {pointerHint ? "Click or press Space to see the question again" : "Tap to see the question again"}
          </Text>
        </CardShell>
      </Animated.View>

      {/* Tap to flip: one target for both faces, so focus stays put on flip */}
      <Pressable
        ref={cardRef}
        style={StyleSheet.absoluteFillObject}
        accessibilityRole="button"
        accessibilityLabel={
          flipped
            ? `Answer: ${sentence(card.back)} Show the question`
            : `Question: ${sentence(card.front)} Show the answer`
        }
        accessibilityState={{ expanded: flipped }}
        onPress={toggleFlip}
        {...keys("Space Enter")}
      />
    </Animated.View>
  );

  const source = (style) => (
    <SourcePanel
      card={card}
      template={template}
      revealed={revealed}
      showSource={showSource}
      onToggleSource={setShowSource}
      style={style}
    />
  );

  const navRow = (style) => (
    <View style={[styles.navRow, style]}>
      <Button
        title="Previous"
        variant="secondary"
        accessibilityLabel="Previous card"
        onPress={prevCard}
        style={styles.navBtn}
        {...keys("ArrowLeft")}
      />
      <Button title="Next" accessibilityLabel="Next card" onPress={nextCard} style={styles.navBtn} {...keys("ArrowRight")} />
    </View>
  );

  // ——— Short landscape: card | source + controls ———
  if (layoutClass === "short") {
    return (
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.container}>
        <View style={[styles.headerWrap, styles.headerWrapShort, { paddingHorizontal: L.gutter }]}>{header}</View>
        <View
          style={[styles.shortBody, { width: L.rowW }]}
          onLayout={(e) => setBodyH(Math.floor(e.nativeEvent.layout.height) - spacing.sm)}
        >
          <ScrollView style={{ width: CARD_W, flexGrow: 0 }} contentContainerStyle={styles.shortCardScroll}>
            {cardEl}
          </ScrollView>
          <View style={[styles.side, { width: L.sideW }]}>
            <ScrollView style={styles.fill} contentContainerStyle={styles.sideScroll}>
              {source({ width: "100%" })}
            </ScrollView>
            {navRow(styles.navRowSide)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ——— Desktop: card + controls | source ———
  if (desktop) {
    return (
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.container}>
        <View style={[styles.headerWrap, { paddingHorizontal: L.gutter }]}>{header}</View>
        <ScrollView style={styles.fill} contentContainerStyle={[styles.desktopScroll, { paddingHorizontal: L.gutter }]}>
          <View style={[styles.desktopRow, { width: L.rowW }]}>
            <View style={{ width: CARD_W }}>
              {cardEl}
              {navRow(styles.navRowUnder)}
              {L.showKeyHint && IS_WEB ? <Text style={styles.keyHint}>{shortcutHint("flip")}</Text> : null}
            </View>
            {source({ width: L.sideW })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— Phone / tablet: one column, controls pinned above the template bar ———
  const barShown = L.templatePlacement === "bar";
  return (
    <SafeAreaView edges={barShown ? ["top", "left", "right"] : ["top", "bottom", "left", "right"]} style={styles.container}>
      <View style={[styles.headerWrap, { paddingHorizontal: L.gutter }]}>{header}</View>
      <ScrollView style={styles.fill} contentContainerStyle={[styles.columnScroll, { paddingHorizontal: L.gutter }]}>
        {cardEl}
        {source({ width: CARD_W, marginTop: spacing.md })}
      </ScrollView>
      <View style={[styles.footer, { paddingHorizontal: L.gutter }]}>{navRow({ width: CARD_W })}</View>
    </SafeAreaView>
  );
}
