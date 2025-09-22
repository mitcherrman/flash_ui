// src/Screens/ToCScreen.js
// Blocky UC-Berkeley themed Table of Contents for a deck.
// - Fetches all cards in document order
// - Search filter
// - Tapping an item returns to the drill at that card's ordinal

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { API_BASE } from "../config";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function ToCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", mode = "basic" } = route.params || {};

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_ROOT}/hand/?deck_id=${deckId}&n=all&order=doc`;
        const r = await fetch(url);
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`HTTP ${r.status} – ${t.slice(0, 150)}`);
        }
        const data = await r.json();
        setCards(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]);

  const filtered = useMemo(() => {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((c) => {
      const section = (c.section?.title || c.section || "").toLowerCase();
      const front   = String(c.front || "").toLowerCase();
      return section.includes(needle) || front.includes(needle);
    });
  }, [q, cards]);

  const gotoCard = (ordinal) => {
    // Jump back to your drill (FlipDrill) at this ordinal
    navigation.navigate(returnTo, {
      deckId,
      mode,
      order: "doc",
      startOrdinal: ordinal,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FFCD00" />
        <Text style={styles.muted}>Loading table of contents…</Text>
      </SafeAreaView>
    );
  }
  if (err) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={[styles.muted, { color: "#FCA5A5" }]}>{err}</Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }) => {
    const ordinal = item.ordinal ?? index + 1;
    const section = item.section?.title || item.section || "";
    const page    = typeof item.page === "number" ? item.page : null;

    return (
      <TouchableOpacity style={styles.rowWrap} onPress={() => gotoCard(ordinal)}>
        {/* gold stripe */}
        <View style={styles.goldStripe} />
        {/* blocky card */}
        <View style={styles.rowCard}>
          <View style={styles.rowTop}>
            <Text style={styles.ordinal}>#{ordinal}</Text>
            {page != null && <Text style={styles.page}>p.{page}</Text>}
          </View>
          {!!section && <Text style={styles.section}>{section}</Text>}
          <Text numberOfLines={2} style={styles.front}>
            {String(item.front || "").trim()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Table of Contents</Text>
        <Text style={styles.caption}>Tap to jump to a card</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by section or question…"
          placeholderTextColor="#93c5fd"
          value={q}
          onChangeText={setQ}
          style={styles.search}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.id ?? item.card_key ?? item.ordinal ?? idx)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </SafeAreaView>
  );
}

/* —————— UC-Berkeley blocky aesthetic —————— */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#003262", // Berkeley Blue
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003262",
  },
  muted: { color: "#E6ECF0", marginTop: 10, fontSize: 16 },

  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderColor: "#0C4A6E",
    backgroundColor: "#012B57",
  },
  title: {
    color: "#FFCD00", // California Gold
    fontWeight: "900",
    fontSize: 22,
    letterSpacing: 0.4,
  },
  caption: { color: "#E6ECF0", marginTop: 2 },

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#003262",
  },
  search: {
    backgroundColor: "#0b1226",
    borderWidth: 2,
    borderColor: "#0C4A6E",
    color: "#E6ECF0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8, // blocky but slightly softened
    fontSize: 16,
  },

  sep: { height: 10 },

  rowWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
  },
  goldStripe: {
    width: 8,
    backgroundColor: "#FFCD00",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rowCard: {
    flex: 1,
    backgroundColor: "#0b1226",
    borderWidth: 2,
    borderColor: "#0C4A6E",
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  ordinal: {
    color: "#93c5fd",
    fontWeight: "900",
    fontSize: 16,
  },
  page: { color: "#E6ECF0", fontWeight: "700" },
  section: {
    color: "#FFCD00",
    fontWeight: "800",
    marginBottom: 2,
  },
  front: {
    color: "#E6ECF0",
    fontSize: 15,
    lineHeight: 20,
  },
});
