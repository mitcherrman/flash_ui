// src/Screens/UploadScreen.js
// Source → Structure → plan. Pick a PDF, analyze it (one request per pick),
// review the recommendation, adjust the deck size / section plan, build.
// State lives in src/source/plan.js (pure, unit-tested).
import React, { useEffect, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE } from "../config";

import { loadLastDeck, clearCache } from "../utils/cache";
import {
  ANALYZE_PATH, appendFile, describeAnalyzeError, postMultipart,
} from "../source/api";
import { createRun, runRequest } from "../source/buildRun";
import { deckSubtitle, isValidDeckId, resolveDeckIdentity } from "../study/deck";
import {
  buildParams, initialPlanState, isChangedFromRecommendation, isPdfFile,
  planLimits, planReducer, planSummary, validatePlan,
} from "../source/plan";

import { colors } from "../theme";
import {
  Button, BrandMark, MetaLabel, Notice, PageHeader, ProductSteps, Screen, Surface, notify,
} from "../ui";
import SourceCard from "../components/source/SourceCard";
import StructureSummary from "../components/source/StructureSummary";
import CardCountControl from "../components/source/CardCountControl";
import SectionPlan from "../components/source/SectionPlan";
import styles from "../styles/screens/UploadScreen.styles";

const IS_WEB = Platform.OS === "web";

export default function UploadScreen({ navigation }) {
  const [plan, dispatch] = useReducer(planReducer, initialPlanState);
  const seq = useRef(0); // analysis request ids
  const runRef = useRef(null); // the in-flight analyze request

  // Leaving the screen drops any in-flight analysis.
  useEffect(() => () => runRef.current?.cancel(), []);

  function analyze(file, requestId) {
    runRef.current?.cancel();
    const run = createRun();
    runRef.current = run;
    runRequest({
      run,
      request: async (signal) => {
        const formData = await appendFile(new FormData(), file, {
          isWeb: IS_WEB,
          fetchImpl: fetch,
          signal,
          FileImpl: IS_WEB ? File : undefined,
        });
        return postMultipart({ fetchImpl: fetch, url: `${API_BASE}${ANALYZE_PATH}`, formData, signal });
      },
      onSuccess: (stats) => dispatch({ type: "analyzed", requestId, stats }),
      onError: (err) => {
        console.error("[UploadScreen] analyze failed", err);
        dispatch({ type: "analyzeFailed", requestId, error: { ...describeAnalyzeError(err), retryable: true } });
      },
    });
  }

  async function pick() {
    let res;
    try {
      res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
    } catch (e) {
      console.error("[UploadScreen] picker failed", e);
      notify("Couldn't open the file picker", "Try again.");
      return;
    }
    if (res.canceled || !res.assets?.length) return; // keep the current document

    const a = res.assets[0];
    // Plain, serializable descriptor (the web File object stays out of nav params).
    const file = {
      uri: a.uri,
      name: a.name ?? "document.pdf",
      mimeType: a.mimeType ?? "application/pdf",
      size: a.size ?? null,
    };
    const requestId = ++seq.current;
    runRef.current?.cancel();
    dispatch({ type: "pick", file, requestId });

    if (!isPdfFile(file)) {
      dispatch({
        type: "analyzeFailed",
        requestId,
        error: { title: "That file isn't a PDF", message: "Choose a PDF document.", retryable: false },
      });
      return;
    }
    analyze(file, requestId);
  }

  function retry() {
    if (!plan.file) return;
    const requestId = ++seq.current;
    dispatch({ type: "retry", requestId });
    analyze(plan.file, requestId);
  }

  function remove() {
    runRef.current?.cancel();
    dispatch({ type: "clear", requestId: ++seq.current });
  }

  // ── resume last deck ──
  const [cached, setCached] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const meta = await loadLastDeck();
      if (alive) setCached(meta);
    })();
    return () => { alive = false; };
  }, []);

  function resumeCached() {
    if (!isValidDeckId(cached?.deckId)) return;
    navigation.navigate("Picker", { deckId: cached.deckId });
  }

  async function discardCached() {
    await clearCache();
    setCached(null);
  }

  // The deck's name and card count; the opaque deck id is never shown.
  const resume = isValidDeckId(cached?.deckId) ? resolveDeckIdentity({ deckId: cached.deckId, meta: cached }) : null;
  const resumeMeta = resume ? deckSubtitle(resume) : "";

  // ── build ──
  const validity = validatePlan(plan);
  function build() {
    if (!validity.ok) return;
    navigation.navigate("Build", { file: plan.file, ...buildParams(plan) });
  }

  const ready = plan.status === "ready";
  const hasFile = !!plan.file;
  const changed = isChangedFromRecommendation(plan);
  const limits = planLimits(plan);
  const summary = planSummary(plan);

  return (
    <Screen scroll maxWidth="narrow" center={!hasFile}>
      <PageHeader
        eyebrow={<BrandMark showTagline />}
        title="Make flashcards"
        subtitle={hasFile ? "Review the structure, then choose how many cards to write." : "Upload a PDF. Its sections and pages are found first, then cards are written for each section."}
      />

      {resume && (
        <Surface style={styles.resumeCard}>
          <MetaLabel>Resume last deck</MetaLabel>
          <Text style={styles.resumeName} numberOfLines={2}>
            {resume.displayTitle}
          </Text>
          {!!resumeMeta && <Text style={styles.resumeMeta}>{resumeMeta}</Text>}
          <View style={styles.buttonRow}>
            <Button
              title="Resume"
              size="sm"
              onPress={resumeCached}
              accessibilityLabel={`Resume ${resume.displayTitle}`}
            />
            <Button title="Discard" size="sm" variant="secondary" onPress={discardCached} accessibilityHint="Forgets the saved deck on this device" />
          </View>
        </Surface>
      )}

      {!hasFile ? (
        <Surface variant="raised" padding="xl">
          <ProductSteps />
          <Button
            title="Choose PDF"
            size="lg"
            onPress={pick}
            accessibilityLabel="Choose a PDF"
            accessibilityHint="Opens a file picker for PDF documents"
            style={styles.heroBtn}
          />
          <Text style={styles.heroNote}>PDF only.</Text>
        </Surface>
      ) : (
        <View style={styles.flow}>
          <SourceCard file={plan.file} status={plan.status} onReplace={pick} onRemove={remove} />

          {plan.status === "analyzing" && (
            <Surface style={styles.inlineRow} accessibilityRole="progressbar" accessibilityLabel="Analyzing document">
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.panelText}>Finding pages, words and sections…</Text>
            </Surface>
          )}

          {plan.status === "error" && plan.error && (
            <Notice
              tone="error"
              title={plan.error.title}
              message={plan.error.message}
              action={
                <>
                  {plan.error.retryable !== false && <Button title="Try again" size="sm" onPress={retry} />}
                  <Button title="Choose another PDF" size="sm" variant="secondary" onPress={pick} />
                </>
              }
            >
              {plan.error.status ? <Text style={styles.errStatus}>Server response: HTTP {plan.error.status}</Text> : null}
            </Notice>
          )}

          {ready && (
            <>
              <StructureSummary stats={plan.stats} sectionCount={plan.sections.length} />

              <CardCountControl
                total={plan.total}
                recommendation={plan.recommendation}
                sectionCount={plan.sections.length}
                limits={limits}
                changed={changed}
                manual={plan.manual}
                onChangeTotal={(total) => dispatch({ type: "setTotal", total })}
                onReset={() => dispatch({ type: "reset" })}
              />

              {plan.sections.length > 0 && (
                <SectionPlan
                  sections={plan.sections}
                  total={plan.total}
                  limits={limits}
                  manual={plan.manual}
                  summary={summary}
                  onBump={(index, delta) => dispatch({ type: "bumpSection", index, delta })}
                  onSet={(index, value) => dispatch({ type: "setSectionCards", index, value })}
                />
              )}

              {!validity.ok && <Notice tone="warning" message={validity.reason} />}
            </>
          )}

          <Button
            title={ready ? `Create ${plan.total} ${plan.total === 1 ? "card" : "cards"}` : "Create cards"}
            size="lg"
            fullWidth
            disabled={!validity.ok}
            onPress={build}
            accessibilityHint={validity.ok ? "Uploads the PDF and writes the cards" : validity.reason}
          />
        </View>
      )}
    </Screen>
  );
}
