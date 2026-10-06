// src/Screens/TOCScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../config";
import styles from "../styles/screens/TOCScreen.styles";
import { fetchWithCache, deckTocKey } from "../utils/cache";

import TemplateBar from "../components/TemplateBar";
import { requestTemplateOpen } from "../utils/TemplateBus";
import { Badge, Button, PageHeader, StatusView, Surface, TextField, useLayout } from "../ui";

export default function TOCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", mode = "basic" } = route.params || {};
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const { gutter } = useLayout();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchWithCache({
          key: deckTocKey(deckId),
          fetcher: async () => {
            const r = await fetch(`${API_BASE}/api/flashcards/toc/?deck_id=${deckId}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          },
        });
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [deckId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.toLowerCase();
    return items.filter(it =>
      (it.section || "").toLowerCase().includes(needle) ||
      (it.front || "").toLowerCase().includes(needle)
    );
  }, [items, q]);

  const openAt = (ordinal) => {
    navigation.navigate(returnTo, {
      deckId,
      mode,
      n: "all",
      order: "doc",
      startOrdinal: ordinal,
    });
  };

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Picker", params: { deckId } }],
    });
  };

  const openTemplate = () => {
    // fires the TemplateBar modal without showing the bar
    requestTemplateOpen();
  };

  if (loading) {
    return (
      <>
        <StatusView loading title="Loading table of contents…" />

        {/* Hidden bar so the modal is available */}
        <TemplateBar deckId={deckId} hidden />
      </>
    );
  }

  if (err) {
    return (
      <>
        <StatusView tone="error" title="Couldn't load the table of contents" message={err} />

        {/* Hidden bar so the modal is available */}
        <TemplateBar deckId={deckId} hidden />
      </>
    );
  }

  const renderItem = ({ item, index }) => {
    const ordinal = item.ordinal ?? (index + 1);
    return (
      <Surface
        padding="md"
        style={styles.item}
        onPress={() => openAt(ordinal)}
        accessibilityLabel={`Card ${ordinal}${item.page != null ? `, page ${item.page}` : ""}${item.section ? `, ${item.section}` : ""}: ${item.front}`}
      >
        <View style={styles.itemTop}>
          <Badge>#{ordinal}</Badge>
          {item.page != null && <Text style={styles.itemPage}>p.{item.page}</Text>}
        </View>
        {!!item.section && (
          <Text style={styles.itemSection}>{item.section}</Text>
        )}
        <Text style={styles.itemFront}>{item.front}</Text>
      </Surface>
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Header with Back / Home / Template */}
      <View style={[styles.headerWrap, { paddingHorizontal: gutter }]}>
        <View style={styles.column}>
          <PageHeader
            style={styles.header}
            left={
              <>
                <Button title="Back" variant="secondary" size="sm" onPress={() => navigation.goBack()} />
                <Button title="Home" variant="secondary" size="sm" onPress={goHome} />
              </>
            }
            right={<Button title="Template" variant="secondary" size="sm" onPress={openTemplate} />}
            title="Table of Contents"
            subtitle="Tap to jump to a card"
          />
          <TextField
            value={q}
            onChangeText={setQ}
            placeholder="Search by section or question…"
            accessibilityLabel="Search by section or question"
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it, i) => String(it.id ?? `${it.front}-${i}`)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
      />

      {/* Hidden TemplateBar: modal only */}
      <TemplateBar deckId={deckId} hidden />
    </SafeAreaView>
  );
}
