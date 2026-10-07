// src/Screens/TOCScreen.js
// Table of contents: every card in document order, searchable; pressing one
// returns to the study screen at that card (F3).
//
// Navigation: a jump dispatches POP_TO (src/study/tocNav.js), so the study
// screen underneath is reused instead of a new one being pushed each time.
// Template: this screen owns exactly one TemplateSheet.
//
// F4 positioning (decisions in src/study/tocList.js):
//   • opened from a study screen, the current card is scrolled into view
//     once, without animation, a third of the way down (virtualised rows
//     that aren't laid out yet are reached through onScrollToIndexFailed);
//   • opened from the Picker, the list starts at the top;
//   • typing a search shows results from the top; clearing it returns to
//     the current card.
// Web keyboard: Escape clears the search, or (empty search) goes back to
// studying. Focus moves to the current card's row on arrival.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import styles from "../styles/screens/TOCScreen.styles";
import DeckStatus from "../components/study/DeckStatus";
import TemplateSheet from "../components/study/TemplateSheet";
import { loadTemplateForViewing, useDeckToc } from "../study/useDeck";
import { cardPageLabel } from "../study/provenance";
import { backToPickerAction, tocJumpAction } from "../study/tocNav";
import {
  CURRENT_ROW_VIEW_POSITION,
  currentRowIndex,
  filterTocRows,
  initialRenderCount,
  scrollAfterQueryChange,
  tocCountLine,
  tocRows,
} from "../study/tocList";
import { isModalOpen } from "../study/useStudyKeys";
import { Badge, Button, PageHeader, Surface, TextField, useLayout } from "../ui";

let jumpSeq = 0;
const IS_WEB = Platform.OS === "web";

export default function TOCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", currentOrdinal = null } = route.params || {};
  const toc = useDeckToc(deckId);
  const [q, setQ] = useState("");
  const { gutter } = useLayout();
  const isFocused = useIsFocused();

  // Template sheet (one owner: this screen)
  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState("");

  const rows = useMemo(() => tocRows(toc.items), [toc.items]);
  const filtered = useMemo(() => filterTocRows(rows, q), [rows, q]);
  const currentIndex = useMemo(() => currentRowIndex(rows, currentOrdinal), [rows, currentOrdinal]);

  // ——— Bring the current card into view ———
  const listRef = useRef(null);
  const scrolledRef = useRef(false);
  const prevQueryRef = useRef(q);
  const retryRef = useRef(null);

  const scrollToRow = (index) => {
    const list = listRef.current;
    if (!list || index == null) return;
    list.scrollToIndex({ index, viewPosition: CURRENT_ROW_VIEW_POSITION, animated: false });
  };

  // The row isn't laid out yet (virtualised): jump near it by the average
  // row height, then aim again once it has rendered.
  const onScrollToIndexFailed = ({ index, averageItemLength }) => {
    listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: false });
    clearTimeout(retryRef.current);
    retryRef.current = setTimeout(() => scrollToRow(index), 60);
  };
  useEffect(() => () => clearTimeout(retryRef.current), []);

  const focusCurrentRow = () => {
    if (!IS_WEB || typeof document === "undefined") return;
    const el = document.querySelector('[data-toc-current="true"]');
    try {
      el?.focus?.({ preventScroll: true });
    } catch {}
  };

  // Once, when the list first lays out with a current card and no search.
  const onListLayout = () => {
    if (scrolledRef.current || toc.status !== "ready") return;
    scrolledRef.current = true;
    if (currentIndex == null || q.trim()) return;
    requestAnimationFrame(() => {
      scrollToRow(currentIndex);
      requestAnimationFrame(focusCurrentRow);
    });
  };

  // Search changes: results from the top; cleared → back to the current card.
  useEffect(() => {
    const plan = scrollAfterQueryChange(prevQueryRef.current, q, currentIndex);
    prevQueryRef.current = q;
    if (!plan) return;
    if (plan.to === "index") requestAnimationFrame(() => scrollToRow(plan.index));
    else listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [q]);

  // ——— Web: Escape clears the search, then goes back to studying ———
  const qRef = useRef(q);
  qRef.current = q;
  const onEscape = () => {
    if (qRef.current.trim()) setQ("");
    else if (navigation.canGoBack()) navigation.goBack();
  };
  useEffect(() => {
    if (!IS_WEB || !isFocused || typeof window === "undefined") return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.repeat || isModalOpen()) return;
      e.preventDefault();
      onEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocused, navigation]);

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

  const renderItem = ({ item: row }) => {
    const { item, ordinal } = row;
    const pageLabel = cardPageLabel(item.page);
    const isCurrent = currentOrdinal != null && Number(currentOrdinal) === ordinal;
    return (
      <Surface
        padding="md"
        style={[styles.item, isCurrent && styles.itemCurrent]}
        onPress={() => openAt(ordinal)}
        accessibilityLabel={`Card ${ordinal}, ${pageLabel}${item.section ? `, ${item.section}` : ""}${isCurrent ? ", current card" : ""}: ${item.front}`}
        accessibilityHint="Opens this card"
        {...(isCurrent && IS_WEB ? { "aria-current": "true", dataSet: { tocCurrent: "true" } } : null)}
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
            {...(IS_WEB ? { "aria-keyshortcuts": "Escape" } : null)}
            // The web TextInput stops key events from bubbling to the window
            // listener above, so the field handles its own Escape.
            onKeyPress={IS_WEB ? (e) => e.nativeEvent?.key === "Escape" && !e.nativeEvent?.repeat && onEscape() : undefined}
          />
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {tocCountLine(filtered.length, rows.length, q)}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(row, i) => String(row.item.id ?? `${row.item.front}-${i}`)}
        renderItem={renderItem}
        initialNumToRender={initialRenderCount(rows.length, currentIndex)}
        onLayout={onListLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        keyboardShouldPersistTaps="handled"
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
