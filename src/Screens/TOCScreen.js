// src/Screens/TOCScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet, 
} from "react-native";
import { API_BASE } from "../config";



export default function TOCScreen({ route, navigation }) {
  const { deckId, returnTo = "Game2", mode = "basic" } = route.params || {};
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/api/flashcards/toc/?deck_id=${deckId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
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
    // Jump into FlipDrill with server-side rotation
    navigation.navigate(returnTo, {
      deckId,
      mode,
      n: "all",
      order: "doc",
      startOrdinal: ordinal, // 1-based
    });
  };

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor:"#003262", justifyContent:"center", alignItems:"center" }}>
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={{ color:"#E6ECF0", marginTop:10 }}>Loading table of contents…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={{ flex:1, backgroundColor:"#003262", justifyContent:"center", alignItems:"center", padding:16 }}>
        <Text style={{ color:"#FDB515" }}>{err}</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }) => {
    const ordinal = item.ordinal ?? (index + 1); // robust numbering
    return (
      <Pressable
        onPress={() => openAt(ordinal)}
        style={{
          marginHorizontal: 10,
          marginVertical: 6,
          backgroundColor: "#0b1226",
          borderColor: "#0C4A6E",
          borderWidth: 1.5,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
          <Text style={{ color:"#93c5fd", fontWeight:"900" }}>#{ordinal}</Text>
          {item.page != null && <Text style={{ color:"#93c5fd", fontWeight:"700" }}>p.{item.page}</Text>}
        </View>
        {!!item.section && (
          <Text style={{ color:"#FFCD00", fontWeight:"800", marginTop:6 }}>
            {item.section}
          </Text>
        )}
        <Text style={{ color:"#E6ECF0", marginTop:4 }}>
          {item.front}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor:"#003262" }}>
      <View style={{ paddingHorizontal:10, paddingTop:8, paddingBottom:6 }}>
        <Text style={{ color:"#E6ECF0", fontWeight:"900", fontSize:22 }}>Table of Contents</Text>
        <Text style={{ color:"#94a3b8", marginTop:2 }}>Tap to jump to a card</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by section or question…"
          placeholderTextColor="#7c8799"
          style={{
            marginTop:10,
            borderWidth:1.5, borderColor:"#0C4A6E", borderRadius:10,
            backgroundColor:"#0b1226", color:"#E6ECF0", paddingHorizontal:12, paddingVertical:10,
          }}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(it, i) => String(it.id ?? `${it.front}-${i}`)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom:20 }}
      />
    </View>
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
