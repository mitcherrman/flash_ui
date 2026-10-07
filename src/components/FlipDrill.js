// src/components/FlipDrill.js
// Flip Drill: question → think → tap to reveal → source → next (F3).
//
// Data comes from the screen (useDeckHand), so this component only renders a
// ready deck. Card changes (Next, Previous, swipe, TOC jump, initial load,
// resume) always land on the QUESTION side: the flip is reset instantly,
// never animated back, so the next card's answer is never visible mid-turn.
// The source excerpt stays hidden until the answer has been revealed on this
// card visit (it is the passage the answer was written from).
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CardShell from "./CardShell";
import SourcePanel from "./study/SourcePanel";
import { motion } from "../theme";
import { Button, USE_NATIVE_DRIVER, useReducedMotion } from "../ui";
import { indexForOrdinal } from "../study/deck";
import { backToPickerAction, openTocAction } from "../study/tocNav";
import styles from "../styles/components/FlipDrill.styles";

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

  // Web, landscape windows with room to spare (desktop/laptop): the source
  // panel, Prev/Next and the template bar sit below the card, so reserve
  // their height instead of letting the bar cover Next (seen at 1280×800).
  // Short landscape (phones) keeps the rule above; that layout is F4's.
  WEB_BELOW_CARD_H: 360,
  WEB_ROOMY_MIN_CARD_H: 300,
};

const SWIPE_ACTIVATE_PX = 20;
const SWIPE_TRIGGER_PX = 100;

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
    const roomyWeb = Platform.OS === "web" && availH - TUNE.WEB_BELOW_CARD_H >= TUNE.WEB_ROOMY_MIN_CARD_H;
    const reserve = roomyWeb ? TUNE.WEB_BELOW_CARD_H : TUNE.LANDSCAPE_CONTROLS_H + 16;
    const hForCard = Math.max(TUNE.LANDSCAPE_MIN_CARD_H, availH - reserve);
    CARD_W = Math.min(900, availW);
    CARD_H = Math.min(hForCard, Math.round(CARD_W * TUNE.CARD_ASPECT));
    // If card ends up too tall, clamp by height
    CARD_W = Math.min(CARD_W, Math.round(CARD_H / TUNE.CARD_ASPECT));
  }

  // ——— State ———
  const total = cards.length;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false); // answer shown on this card visit
  const [showSource, setShowSource] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current; // 0 -> front, 180 -> back
  const panX = useRef(new Animated.Value(0)).current;
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
  const navRef = useRef({ next: nextCard, prev: prevCard });
  navRef.current = { next: nextCard, prev: prevCard };
  const springBack = () => {
    if (reduceMotion) panX.setValue(0);
    else Animated.spring(panX, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER }).start();
  };
  const springRef = useRef(springBack);
  springRef.current = springBack;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > SWIPE_ACTIVATE_PX,
        onPanResponderMove: (_, g) => panX.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dx > SWIPE_TRIGGER_PX) navRef.current.prev();
          else if (g.dx < -SWIPE_TRIGGER_PX) navRef.current.next();
          springRef.current();
        },
        onPanResponderTerminate: () => springRef.current(),
      }),
    [panX]
  );

  const handleBack = () => navigation?.dispatch(backToPickerAction(deckId));
  const openToc = () => navigation?.dispatch(openTocAction({ from: "Game2", deckId, currentOrdinal: idx + 1 }));

  const card = cards[idx] || {};
  const counter = `Card ${idx + 1} of ${total}`;

  // ——— TOP BAR: uncluttered (Back • centered counter • Contents) ———
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
          <Button title="Back" variant="secondary" size="sm" accessibilityLabel="Back to deck" onPress={handleBack} />
        </View>

        {/* Center (always visible; absolute centering in landscape to prevent squish) */}
        <Text
          style={isLandscape ? styles.counterLandscape : styles.counter}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          {counter}
        </Text>

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {navigation ? (
            <Button title="Contents" variant="secondary" size="sm" accessibilityLabel="Table of contents" onPress={openToc} />
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
            <View style={local.cardInner}>
              <Text style={styles.textFront}>{card.front}</Text>
            </View>
            <Text style={styles.faceHint}>Tap the card to show the answer</Text>
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
            <View style={local.cardInner}>
              <Text style={styles.textBack}>{flipped || revealed ? card.back : ""}</Text>
            </View>
            <Text style={[styles.faceHint, styles.faceLabelBack]}>Tap to see the question again</Text>
          </CardShell>
        </Animated.View>

        {/* Tap to flip */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          accessibilityRole="button"
          accessibilityLabel={
            flipped
              ? `Answer: ${sentence(card.back)} Show the question`
              : `Question: ${sentence(card.front)} Show the answer`
          }
          accessibilityState={{ expanded: flipped }}
          onPress={toggleFlip}
        />
      </Animated.View>

      {/* ── Source panel: metadata always, excerpt only after reveal ───── */}
      {!(Platform.OS !== "web" && isLandscape) && (
        <SourcePanel
          card={card}
          template={template}
          revealed={revealed}
          showSource={showSource}
          onToggleSource={setShowSource}
          style={{ width: CARD_W, alignSelf: "center", marginTop: 12 }}
        />
      )}

      {/* Prev / Next — absolute, with web-safe positioning */}
      <View
        style={{
          position: Platform.OS === "web" ? "relative" : "absolute",
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: isLandscape
            ? TUNE.BUTTONS_GAP_LANDSCAPE
            : TUNE.BUTTONS_GAP_PORTRAIT,
          marginTop:
            Platform.OS === "web"
              ? 24 // on desktop, space below card
              : 0,
          bottom:
            Platform.OS !== "web"
              ? insets.bottom +
                (isLandscape
                  ? TUNE.BUTTONS_BOTTOM_LANDSCAPE
                  : TUNE.BUTTONS_BOTTOM_PORTRAIT)
              : undefined,
        }}
      >
        <Button title="Previous" variant="secondary" accessibilityLabel="Previous card" onPress={prevCard} style={styles.navBtn} />
        <Button title="Next" accessibilityLabel="Next card" onPress={nextCard} style={styles.navBtn} />
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
