// src/Screens/TOCScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE } from "../config";
import styles from "../styles/screens/TOCScreen.styles";

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
    navigation.navigate(returnTo, {
      deckId,
      mode,
      n: "all",
      order: "doc",
      startOrdinal: ordinal,
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#003262",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
        }}
      >
        <ActivityIndicator size="large" color="#FDB515" />
        <Text style={{ color: "#E6ECF0", marginTop: 8 }}>Loading table of contents…</Text>
      </SafeAreaView>
    );
  }

  if (err) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#003262",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
        }}
      >
        <Text style={{ color: "#FDB515" }}>{err}</Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }) => {
    const ordinal = item.ordinal ?? (index + 1);
    return (
      <Pressable
        onPress={() => openAt(ordinal)}
        style={{
          marginHorizontal: 8,
          marginVertical: 8,
          backgroundColor: "#0b1226",
          borderColor: "#0C4A6E",
          borderWidth: 1.5,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#93c5fd", fontWeight: "900" }}>#{ordinal}</Text>
          {item.page != null && <Text style={{ color: "#93c5fd", fontWeight: "700" }}>p.{item.page}</Text>}
        </View>
        {!!item.section && (
          <Text style={{ color: "#FFCD00", fontWeight: "800", marginTop: 8 }}>
            {item.section}
          </Text>
        )}
        <Text style={{ color: "#E6ECF0", marginTop: 8, lineHeight: 20 }}>
          {item.front}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#003262",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
      }}
    >
      <LinearGradient
        colors={["#032e5d", "#003262"]}
        style={{
          height: 104,                // slightly taller and below the safe area
          justifyContent: "flex-end",
          paddingHorizontal: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#0C4A6E",
        }}
      >
        <Text style={{ color: "#E6ECF0", fontWeight: "900", fontSize: 22 }}>Table of Contents</Text>
        <Text style={{ color: "#94a3b8", marginTop: 4 }}>Tap to jump to a card</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by section or question…"
          placeholderTextColor="#7c8799"
          style={{
            marginTop: 8,
            borderWidth: 1.5,
            borderColor: "#0C4A6E",
            borderRadius: 10,
            backgroundColor: "#0b1226",
            color: "#E6ECF0",
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(it, i) => String(it.id ?? `${it.front}-${i}`)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
