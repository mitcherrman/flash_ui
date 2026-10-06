// src/Screens/BuildScreen.js
// One generate request per attempt. The API is a single request with no
// server-side progress, so the working state is honestly indeterminate:
// filename, requested size, elapsed time — no stages or percentages.
//
// Leaving (Cancel / Back / Home / OS back) unmounts the screen, which aborts
// the request and deactivates the run: a late response can no longer
// navigate, write storage or set state (src/source/buildRun.js).
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, View } from "react-native";
import { API_BASE } from "../config";
import { saveLastDeck, saveTemplate } from "../utils/cache";
import {
  GENERATE_PATH, appendFile, deckNameFor, describeGenerateError, generateFields, postMultipart,
} from "../source/api";
import { completeBuild, createRun, formatDuration, resolveBuildMs, runRequest } from "../source/buildRun";
import {
  BrandMark, Button, CardStackGlyph, Notice, PageHeader, Screen, Surface,
  USE_NATIVE_DRIVER, useReducedMotion,
} from "../ui";
import { breakWord } from "../components/source/SourceCard";
import styles from "../styles/screens/BuildScreen.styles";

const IS_WEB = Platform.OS === "web";

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

// Static description of what the single request does. Not live progress.
const STEPS = ["Source", "Structure", "Cards"];

export default function BuildScreen({ route, navigation }) {
  const { file, cardsWanted = 12, allocations = [] } = route.params || {};
  const fileName = file?.name ?? "document.pdf";
  const deckName = deckNameFor(fileName);
  const plannedSections = allocations.filter((a) => a.cards > 0).length;

  // phase: working | review (success with warnings) | error
  const [view, setView] = useState({ phase: "working" });
  const [attempt, setAttempt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: "Upload" }] });
  const goToPicker = (params) => navigation.reset({ index: 0, routes: [{ name: "Picker", params }] });
  const backToPlan = () => (navigation.canGoBack() ? navigation.goBack() : goHome());

  // One request per attempt (a mount is attempt 0; "Try again" is deliberate).
  useEffect(() => {
    const run = createRun();
    const t0 = Date.now();
    setElapsedMs(0);
    let timer = setInterval(() => {
      if (run.active) setElapsedMs(Date.now() - t0);
    }, 250);
    const stopTimer = () => {
      clearInterval(timer);
      timer = null;
    };

    runRequest({
      run,
      request: async (signal) => {
        const formData = await appendFile(new FormData(), file, {
          isWeb: IS_WEB,
          fetchImpl: fetch,
          signal,
          FileImpl: IS_WEB ? File : undefined,
        });
        for (const [k, v] of generateFields({ fileName, cardsWanted, allocations })) formData.append(k, v);
        return postMultipart({ fetchImpl: fetch, url: `${API_BASE}${GENERATE_PATH}`, formData, signal });
      },
      onSuccess: (json) => {
        stopTimer();
        const buildMs = resolveBuildMs(json, Date.now() - t0);
        setElapsedMs(buildMs);
        const out = completeBuild({
          json,
          deckName,
          buildMs,
          storage: { saveLastDeck, saveTemplate },
          goToPicker,
        });
        if (!out.navigated) {
          setView({
            phase: "review",
            warnings: out.warnings,
            pickerParams: out.pickerParams,
            created: json?.cards_created ?? null,
          });
        }
      },
      onError: (err) => {
        stopTimer();
        console.error("[BuildScreen] generate failed", err);
        setView({ phase: "error", error: describeGenerateError(err) });
      },
    });

    return () => {
      run.cancel();
      stopTimer();
    };
  }, [attempt]);

  // Guard against a double press creating two attempts.
  const retrying = useRef(false);
  useEffect(() => {
    retrying.current = false;
  }, [attempt]);
  const retry = () => {
    if (view.phase !== "error" || retrying.current) return;
    retrying.current = true;
    setView({ phase: "working" });
    setAttempt((a) => a + 1);
  };

  // Pulsing glyph while working (static under reduced motion).
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const working = view.phase === "working";
  useEffect(() => {
    if (reduceMotion || !working) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, working]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const requestLine =
    `${cardsWanted} ${cardsWanted === 1 ? "card" : "cards"} requested` +
    (plannedSections ? ` · ${plannedSections} ${plannedSections === 1 ? "section" : "sections"}` : "");

  const title =
    view.phase === "error"
      ? "The deck wasn't created"
      : view.phase === "review"
      ? "Your deck is ready"
      : "Creating your deck…";

  return (
    <Screen scroll center maxWidth="narrow">
      <PageHeader align="center" eyebrow={<BrandMark />} title={title} />

      <Surface variant="raised" padding="xl" style={styles.card}>
        <Text style={[styles.fileName, breakWord]} numberOfLines={3}>
          {fileName}
        </Text>
        <Text style={styles.requestLine}>{requestLine}</Text>

        {view.phase === "working" && (
          <>
            <Animated.View
              style={[styles.glyph, { transform: [{ scale }], opacity }]}
              accessibilityRole="progressbar"
              accessibilityLabel="Creating your deck"
              accessibilityState={{ busy: true }}
            >
              <CardStackGlyph size={56} />
            </Animated.View>

            <View style={styles.steps} accessibilityLabel="Source, structure, cards: one request writes the cards">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <Text style={styles.stepArrow}>→</Text>}
                  <Text style={styles.step}>{s}</Text>
                </React.Fragment>
              ))}
            </View>

            <Text style={styles.elapsed} accessibilityLabel={`Elapsed ${formatElapsed(elapsedMs)}`}>
              {formatElapsed(elapsedMs)} elapsed
            </Text>
            <Text style={styles.hint}>
              The server reads your PDF and writes cards for each section in one step, so there is no
              live progress to show. Larger documents and more cards take longer.
            </Text>

            <Button
              title="Cancel"
              variant="secondary"
              onPress={backToPlan}
              style={styles.cancelBtn}
              accessibilityHint="Stops waiting and returns to your plan"
            />
          </>
        )}

        {view.phase === "review" && (
          <>
            <Notice
              tone="success"
              title={view.created != null ? `${view.created} cards created` : "Deck created"}
              message={`Built in ${formatDuration(elapsedMs)}.`}
              style={styles.notice}
            />
            <Notice tone="warning" title="Some sections had less material" style={styles.notice}>
              {view.warnings.map((w, i) => (
                <Text key={i} style={styles.warningItem}>
                  • {w}
                </Text>
              ))}
            </Notice>
            <View style={styles.btnRow}>
              <Button title="Start studying" onPress={() => goToPicker(view.pickerParams)} />
              <Button title="Home" variant="secondary" onPress={goHome} />
            </View>
          </>
        )}

        {view.phase === "error" && (
          <>
            <Notice tone="error" title={view.error.title} message={view.error.message} style={styles.notice}>
              {view.error.status ? (
                <Text style={styles.errStatus}>Server response: HTTP {view.error.status}</Text>
              ) : null}
            </Notice>
            <View style={styles.btnRow}>
              <Button title="Try again" onPress={retry} />
              <Button title="Back to plan" variant="secondary" onPress={backToPlan} />
              <Button title="Home" variant="quiet" onPress={goHome} />
            </View>
          </>
        )}
      </Surface>
    </Screen>
  );
}
