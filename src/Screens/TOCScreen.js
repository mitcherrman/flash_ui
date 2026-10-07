// src/Screens/TOCScreen.js
// Table of contents: every card in document order, searchable; pressing one
// returns to the study screen at that card (F3).
//
// Navigation: a jump dispatches POP_TO (src/study/tocNav.js), so the study
// screen underneath is reused instead of a new one being pushed each time.
// Template: this screen owns exactly one TemplateSheet.
import React, { useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles/screens/TOCScreen.styles";
import DeckStatus from "../components/study/DeckStatus";
import TemplateSheet from "../components/study/TemplateSheet";
import { loadTemplateForViewing, useDeckToc } from "../study/useDeck";
import { cardPageLabel } from "../study/provenance";
import { backToPickerAction, tocJumpAction } from "../study/tocNav";
import { Badge, Button, PageHeader, Surface, TextField, useLayout } from "../ui";

let jumpSeq = 0;

export default function TOCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", currentOrdinal = null } = route.params || {};
  const toc = useDeckToc(deckId);
  const [q, setQ] = useState("");
  const { gutter } = useLayout();

  // Template sheet (one owner: this screen)
  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState("");

  const items = toc.items;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (it) => (it.section || "").toLowerCase().includes(needle) || (it.front || "").toLowerCase().includes(needle)
    );
  }, [items, q]);

  const openAt = (ordinal) => {
    jumpSeq += 1;
    navigation.dispatch(tocJumpAction({ returnTo, deckId, ordinal, jump: `${Date.now()}-${jumpSeq}` }));
  };

  const goHome = () => navigation.dispatch(backToPickerAction(deckId));

  async function openTemplate() {
    setTplOpen(true);
    if (tpl) return;
    setTplLoading(true);
    setTplError("");
    try {
      setTpl(await loadTemplateForViewing(deckId));
    } catch (e) {
      console.warn("[TOC] template unavailable", e);
      setTplError("The deck's cards couldn't be loaded to rebuild an outline. Check the connection and try again.");
    } finally {
      setTplLoading(false);
    }
  }

  if (toc.status !== "ready") {
    return (
      <DeckStatus state={toc} deckId={deckId} navigation={navigation} loadingTitle="Loading table of contents…" />
    );
  }

  const renderItem = ({ item, index }) => {
    const ordinal = item.ordinal ?? index + 1;
    const pageLabel = cardPageLabel(item.page);
    const isCurrent = currentOrdinal != null && Number(currentOrdinal) === ordinal;
    return (
      <Surface
        padding="md"
        style={[styles.item, isCurrent && styles.itemCurrent]}
        onPress={() => openAt(ordinal)}
        accessibilityLabel={`Card ${ordinal}, ${pageLabel}${item.section ? `, ${item.section}` : ""}${isCurrent ? ", current card" : ""}: ${item.front}`}
        accessibilityHint="Opens this card"
      >
        <View style={styles.itemTop}>
          <View style={styles.itemBadges}>
            <Badge>#{ordinal}</Badge>
            {isCurrent && <Badge tone="accent">Current</Badge>}
          </View>
          <Text style={[styles.itemPage, item.page == null && styles.itemPageUnknown]}>{pageLabel}</Text>
        </View>
        {!!item.section && <Text style={styles.itemSection}>{item.section}</Text>}
        <Text style={styles.itemFront}>{item.front}</Text>
      </Surface>
    );
  };

  const countLine = q.trim()
    ? `${filtered.length} of ${items.length} cards match`
    : `${items.length} ${items.length === 1 ? "card" : "cards"} in document order`;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Header with Back / Deck / Template */}
      <View style={[styles.headerWrap, { paddingHorizontal: gutter }]}>
        <View style={styles.column}>
          <PageHeader
            style={styles.header}
            left={
              <>
                <Button title="Back" variant="secondary" size="sm" accessibilityLabel="Back to studying" onPress={() => navigation.goBack()} />
                <Button title="Deck" variant="secondary" size="sm" accessibilityLabel="Back to deck" onPress={goHome} />
              </>
            }
            right={
              <Button title="Template" variant="secondary" size="sm" accessibilityLabel="Open study template" onPress={openTemplate} />
            }
            title="Table of Contents"
            subtitle="Choose a card to study it"
          />
          <TextField
            value={q}
            onChangeText={setQ}
            placeholder="Search by section or question…"
            accessibilityLabel="Search cards by section or question"
            style={styles.searchInput}
          />
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {countLine}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it, i) => String(it.id ?? `${it.front}-${i}`)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
        ListEmptyComponent={
          <Text style={[styles.item, styles.empty]}>No cards match “{q.trim()}”.</Text>
        }
      />

      <TemplateSheet
        visible={tplOpen}
        onClose={() => setTplOpen(false)}
        template={tpl}
        loading={tplLoading}
        error={tplError}
      />
    </SafeAreaView>
  );
}
