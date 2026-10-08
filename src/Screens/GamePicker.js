// src/Screens/GamePicker.js
//
// The deck's home (F3): what the deck is, whether the server still has it,
// and the ways to study it.
//   • Identity: the document's name (resume metadata, else the saved
//     template's title); "Untitled deck" when neither is known. The numeric
//     id is secondary.
//   • Before study, the server is asked whether the deck still exists
//     (GET toc). A deck it no longer has can't strand the learner in a study
//     screen: it gets "no longer available", Back to Upload and Forget.
//   • Export: web downloads printable cards as HTML; native shares that HTML
//     or renders a real PDF. Labels say which.
import React, { useState } from "react";
import { View, Text, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { deckToPrintableHTML, saveHTML } from "../utils/exportHTML";
import { clearAllCache, delCache, deckHandKey, deckTocKey, forgetDeck } from "../utils/cache";
import TemplateSheet from "../components/study/TemplateSheet";
import { deckSource, loadTemplateForViewing, useDeckCheck } from "../study/useDeck";
import { deckSubtitle, describeDeckState, exportStem } from "../study/deck";
import { backToUploadAction, studyParams } from "../study/tocNav";
import { Button, MetaLabel, Notice, PageHeader, Screen, StatusView, Surface, notify } from "../ui";
import styles from "../styles/screens/GamePicker.styles";

// Developer-only controls (cache clearing, raw template JSON) are hidden from
// the normal UI. Set EXPO_PUBLIC_SHOW_DEV_TOOLS=1 (e.g. in .env.local) to show them.
const SHOW_DEV_TOOLS = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === "1";
const IS_WEB = Platform.OS === "web";

export default function GamePicker({ route, navigation }) {
  const { deckId, buildMs: buildMsFromNav } = route.params || {};
  const check = useDeckCheck(deckId, typeof buildMsFromNav === "number" ? buildMsFromNav : null);
  const { identity } = check;
  const [busy, setBusy] = useState(null); // "html" | "pdf" | null

  // Template sheet (one owner: this screen)
  const [showTpl, setShowTpl] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [tplError, setTplError] = useState("");

  const toUpload = () => navigation.dispatch(backToUploadAction());

  async function forget() {
    await forgetDeck(deckId);
    toUpload();
  }

  async function clearDeckCache() {
    await delCache(deckHandKey(deckId, "doc", "all"));
    await delCache(deckTocKey(deckId));
    notify("Cache", "Cleared cache for this deck.");
  }
  async function clearAll() {
    await clearAllCache();
    notify("Cache", "Cleared ALL cached decks/TOCs.");
  }

  async function deckCards() {
    const { items } = await deckSource.loadHand(deckId);
    if (!items.length) throw new Error("This deck has no cards to export.");
    return items;
  }

  // Printable HTML: a download on web, the share sheet on native.
  async function exportHTMLCards() {
    try {
      setBusy("html");
      const cards = await deckCards();
      const html = deckToPrintableHTML({ deckName: identity.displayTitle, cards });
      await saveHTML({ html, filename: `${exportStem({ title: identity.title, deckId })}-cards.html` });
    } catch (e) {
      console.error(e);
      notify("Export failed", e?.message ? String(e.message).slice(0, 280) : "The printable cards couldn't be created.");
    } finally {
      setBusy(null);
    }
  }

  // Native only: the same document rendered to a real PDF by expo-print.
  async function exportPDF() {
    try {
      setBusy("pdf");
      const cards = await deckCards();
      const html = deckToPrintableHTML({ deckName: identity.displayTitle, cards });
      const { uri } = await Print.printToFileAsync({ html });
      const dest = `${FileSystem.documentDirectory}${exportStem({ title: identity.title, deckId })}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, { mimeType: "application/pdf" });
      } else {
        notify("Exported", `Saved PDF to:\n${dest}`);
      }
    } catch (e) {
      console.error(e);
      notify("Export failed", e?.message ? String(e.message).slice(0, 280) : "The PDF couldn't be created.");
    } finally {
      setBusy(null);
    }
  }

  async function onViewTemplate() {
    // The button stays enabled while loading (a disabled button drops focus,
    // so the sheet couldn't hand it back on close); repeat presses are ignored.
    if (tplLoading) return;
    setShowTpl(true);
    setTplError("");
    setTplLoading(true);
    try {
      setTemplate(await loadTemplateForViewing(deckId, identity.title));
    } catch (e) {
      console.error(e);
      setTemplate(null);
      setTplError("The deck's cards couldn't be loaded to rebuild an outline. Check the connection and try again.");
    } finally {
      setTplLoading(false);
    }
  }

  if (check.status === "error" && check.reason === "no-deck") {
    const copy = describeDeckState(check);
    return (
      <StatusView
        tone="error"
        title={copy.title}
        message={copy.message}
        action={<Button title="Back to Upload" size="sm" onPress={toUpload} />}
      />
    );
  }

  const checking = check.status === "loading";
  const gone = check.status === "missing" || check.status === "empty";
  const offline = check.status === "error";
  const cardCount = check.status === "ready" ? check.items.length : null;
  const studyDisabled = checking || gone || !!busy;
  const problem = gone || offline ? describeDeckState(check, { deckId }) : null;

  // Mode card: the whole surface is the button; "Start" is its visual affordance.
  const Card = ({ title, subtitle, onPress }) => (
    <Surface
      variant="raised"
      padding="xl"
      style={styles.card}
      onPress={onPress}
      disabled={studyDisabled}
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      <View style={[styles.cardBtn, studyDisabled && styles.cardBtnDisabled]}>
        <Text style={[styles.cardBtnTxt, studyDisabled && styles.cardBtnTxtDisabled]}>
          {checking ? "Checking deck…" : busy ? "Working…" : "Start"}
        </Text>
      </View>
    </Surface>
  );

  return (
    <Screen scroll maxWidth="content">
      <PageHeader
        left={<Button title="New deck" variant="secondary" size="sm" accessibilityLabel="Back to Upload to make a new deck" onPress={toUpload} />}
        eyebrow={<MetaLabel>Your deck</MetaLabel>}
        title={identity.displayTitle}
        subtitle={deckSubtitle(gone ? { ...identity, cardsCount: null } : identity, cardCount)}
      />

      {gone && (
        <Notice
          tone="warning"
          title={problem.title}
          message={problem.message}
          style={styles.notice}
          action={
            <>
              <Button title="Back to Upload" size="sm" onPress={toUpload} />
              <Button
                title="Forget this deck"
                size="sm"
                variant="secondary"
                accessibilityHint="Removes this deck's saved copy and resume entry from this device"
                onPress={forget}
              />
            </>
          }
        />
      )}

      {offline && (
        <Notice
          tone="warning"
          title={problem.title}
          message={`${problem.message} You can still try a study mode: it will use the copy saved on this device, if there is one.`}
          style={styles.notice}
          action={<Button title="Try again" size="sm" variant="secondary" onPress={check.retry} />}
        />
      )}

      {!gone && (
        <>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Choose a study mode
          </Text>
          {/* "Game 1 — Curate" (route Game1) is a verified placeholder with no
              functionality; it is hidden from the picker until it exists. */}
          <View style={styles.grid}>
            <Card
              title="Flip Drill"
              subtitle="Read the question, think of the answer, then flip the card to check it against its source."
              onPress={() => navigation.navigate("Game2", studyParams({ route: "Game2", deckId }))}
            />
            <Card
              title="Multiple Choice"
              subtitle="Pick the answer from four options, then see where it comes from in the document."
              onPress={() => navigation.navigate("GameMC", studyParams({ route: "GameMC", deckId }))}
            />
          </View>

          <Surface style={styles.tools}>
            <MetaLabel>Deck tools</MetaLabel>
            <View style={styles.toolRow}>
              <Button
                title="Table of contents"
                variant="secondary"
                onPress={() => navigation.navigate("TOC", { deckId, returnTo: "Game2" })}
                disabled={checking}
              />
              <Button
                title={tplLoading ? "Loading template…" : "Study template"}
                variant="secondary"
                onPress={onViewTemplate}
              />
              <Button
                title={
                  busy === "html"
                    ? "Preparing cards…"
                    : IS_WEB
                    ? "Download printable cards (HTML)"
                    : "Share printable cards (HTML)"
                }
                variant="secondary"
                onPress={exportHTMLCards}
                disabled={!!busy || checking}
                loading={busy === "html"}
              />
              {!IS_WEB && (
                <Button
                  title={busy === "pdf" ? "Preparing PDF…" : "Export PDF"}
                  variant="secondary"
                  onPress={exportPDF}
                  disabled={!!busy || checking}
                  loading={busy === "pdf"}
                />
              )}
            </View>
            <Text style={styles.toolNote}>
              Printable cards are laid out for double-sided printing (flip on the long edge), six per sheet.
            </Text>
          </Surface>
        </>
      )}

      {SHOW_DEV_TOOLS && (
        <View style={styles.devRow}>
          <Button title="Dev: Clear cache (this deck)" variant="quiet" size="sm" onPress={clearDeckCache} />
          <Button title="Dev: Clear ALL cache" variant="quiet" size="sm" onPress={clearAll} />
          <Button
            title="Dev: Print template JSON"
            variant="quiet"
            size="sm"
            onPress={() => {
              try { console.log("Template JSON", JSON.stringify(check.template ?? template, null, 2)); } catch {}
              notify("Template", "Printed full JSON to the console.");
            }}
          />
        </View>
      )}

      <TemplateSheet
        visible={showTpl}
        onClose={() => setShowTpl(false)}
        template={template}
        loading={tplLoading}
        error={tplError}
        deckTitle={identity.title}
      />
    </Screen>
  );
}
