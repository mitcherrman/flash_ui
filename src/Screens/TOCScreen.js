// src/Screens/TOCScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, SafeAreaView, ActivityIndicator, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { API_BASE } from "../config";
const API_ROOT = `${API_BASE}/api/flashcards`;

export default function TOCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", mode } = route.params || {};
  const [cards, setCards] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_ROOT}/hand/?deck_id=${deckId}&n=all&order=doc`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setCards(await r.json());
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [deckId]);

  const grouped = useMemo(() => {
    const map = new Map();
    const needle = q.trim().toLowerCase();
    for (const c of cards) {
      if (needle) {
        const hay = `${c.front} ${c.back} ${c.section ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) continue;
      }
      const sec = (c.section && String(c.section).trim()) || "(No section)";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec).push(c);
    }
    return Array.from(map.entries()); // [ [section, cards[]], ... ]
  }, [cards, q]);

  const jump = (ordinal) => {
    navigation.navigate(returnTo, { deckId, mode, startOrdinal: ordinal });
  };

  if (err) {
    return <SafeAreaView style={s.root}><Text style={{color:"#ef4444"}}>{err}</Text></SafeAreaView>;
  }
  if (!cards.length) {
    return <SafeAreaView style={s.root}><ActivityIndicator/><Text style={s.dim}>Loading…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Table of Contents</Text>
        <TextInput
          placeholder="Search cards…"
          placeholderTextColor="#94a3b8"
          value={q}
          onChangeText={setQ}
          style={s.search}
        />
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([sec]) => sec}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const [section, arr] = item;
          return (
            <View style={s.sectionBlock}>
              <Text style={s.sectionTitle}>{section}</Text>
              {arr.map(c => (
                <TouchableOpacity key={c.id} style={s.row} onPress={() => jump(c.ordinal)}>
                  <Text style={s.num}>#{c.ordinal}</Text>
                  <Text style={s.front} numberOfLines={1}>{c.front}</Text>
                  <Text style={s.meta}>p.{c.page ?? "—"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:"white" },
  header: { paddingHorizontal:16, paddingTop:12, paddingBottom:8 },
  title: { fontSize:18, fontWeight:"800", marginBottom:8 },
  search: {
    borderWidth:1, borderColor:"#e5e7eb", borderRadius:10, paddingVertical:8, paddingHorizontal:12, color:"#0f172a"
  },
  sectionBlock: { paddingHorizontal:16, paddingTop:12 },
  sectionTitle: { fontSize:16, fontWeight:"800", marginBottom:6 },
  row: { flexDirection:"row", alignItems:"center", gap:8, paddingVertical:8, borderBottomWidth:1, borderBottomColor:"#f1f5f9" },
  num: { width:48, color:"#0ea5e9", fontWeight:"800" },
  front: { flex:1, color:"#0b1730" },
  meta: { color:"#64748b", marginLeft:8 },
  dim: { color:"#64748b", marginTop:8 },
});
