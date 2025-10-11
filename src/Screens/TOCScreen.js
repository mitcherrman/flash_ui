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
import { fetchWithCache, deckTocKey } from "../utils/cache";

import TemplateBar from "../components/TemplateBar";
import { requestTemplateOpen } from "../utils/TemplateBus";

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

        {/* Hidden bar so the modal is available */}
        <TemplateBar deckId={deckId} hidden />
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

        {/* Hidden bar so the modal is available */}
        <TemplateBar deckId={deckId} hidden />
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
      {/* Header with Back / Home / Template */}
      <LinearGradient
        colors={["#032e5d", "#003262"]}
        style={{
          paddingTop: 6,
          paddingHorizontal: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#0C4A6E",
        }}
      >
        {/* Top button row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => navigation.goBack()} style={headerBtnStyle}>
              <Text style={headerBtnTxt}>Back</Text>
            </Pressable>
            <Pressable onPress={goHome} style={[headerBtnStyle, { backgroundColor: "#0ea5e9" }]}>
              <Text style={[headerBtnTxt, { color: "white" }]}>Home</Text>
            </Pressable>
          </View>

          <Pressable onPress={openTemplate} style={[headerBtnStyle, { backgroundColor: "#FDB515" }]}>
            <Text style={{ color: "#032e5d", fontWeight: "800" }}>Template</Text>
          </Pressable>
        </View>

        {/* Title + Search */}
        <Text style={{ color: "#E6ECF0", fontWeight: "900", fontSize: 22, marginTop: 10 }}>
          Table of Contents
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 2 }}>Tap to jump to a card</Text>
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

      {/* Hidden TemplateBar: modal only */}
      <TemplateBar deckId={deckId} hidden />
    </SafeAreaView>
  );
}

const headerBtnStyle = {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 10,
  backgroundColor: "rgba(255,255,255,0.1)",
};
const headerBtnTxt = { color: "#E6ECF0", fontWeight: "800" };
