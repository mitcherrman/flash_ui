// src/Screens/Leaderboard.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from "react-native";
import CardShell from "../components/CardShell";
import { API_BASE } from "../config";
import styles from "../styles/screens/Leaderboard.styles";
import { getDeckHand } from "../utils/customDeckStore";

const API_ROOT = `${API_BASE}/api/flashcards`;

export default function Leaderboard({ route, navigation }) {
  const deckId = route.params?.deckId;
  const { width } = useWindowDimensions();

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const CARD_W = useMemo(() => {
    const max = 520;
    const w = Math.min(max, Math.floor(width * 0.92));
    return Math.max(320, w);
  }, [width]);

  const CARD_H = Math.round(CARD_W * 0.62);

  useEffect(() => {
    if (!deckId) return;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await getDeckHand({
          deckId,
          n: "all",
          order: "random",
          apiRoot: API_ROOT,
        });

        setCards(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]);

  const goBack = () => navigation.goBack();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingTxt}>Loading cards…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMsg}>{err}</Text>
        <Pressable onPress={goBack} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnTxt}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10}>
          <Text style={styles.backTxt}>Back</Text>
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>{cards.length} cards</Text>
        </View>

        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <View style={styles.rankPill}>
              <Text style={styles.rankTxt}>#{index + 1}</Text>
            </View>

            <View style={styles.depthWrap}>
              <View style={styles.outline}>
                <CardShell
                  width={CARD_W}
                  height={CARD_H}
                  variant="front"
                  imageUri={item.imageUri || null}
                  label={item.front || ""}
                  style={{
                    shadowOpacity: 0,
                    elevation: 0,
                    borderRadius: 26,
                  }}
                >
                  {/* non-custom decks still use children */}
                  <Text style={styles.cardFront} numberOfLines={4}>
                    {item.front || "—"}
                  </Text>
                </CardShell>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTxt}>No cards.</Text>
          </View>
        }
      />
    </View>
  );
}
