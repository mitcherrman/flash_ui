// src/Screens/CustomDeckScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { saveCustomDeck } from "../utils/customDeckStore";

export default function CustomDeckScreen({ navigation }) {
  const [deckTitle, setDeckTitle] = useState("My Custom Deck");
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [cards, setCards] = useState([]);

  const canAdd = useMemo(() => {
    return String(name || "").trim().length > 0 && !!imageUri;
  }, [name, imageUri]);

  async function pickImage() {
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Please allow photo access to pick an image.");
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
        aspect: [1, 1], // helps for circle crop feel
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) setImageUri(uri);
    } catch (e) {
      Alert.alert("Image picker error", String(e));
    }
  }

  function addCard() {
    if (!canAdd) return;

    const newCard = {
      id: `c_${Date.now()}`,
      front: String(name).trim(), // treat this as “label”
      back: "",                   // optional later
      imageUri,
      section: "Custom",
      page: null,
    };

    setCards((prev) => [newCard, ...prev]);
    setName("");
    setImageUri(null);
  }

  async function createDeck() {
    if (!cards.length) {
      Alert.alert("Add at least one card", "Add a name + image first.");
      return;
    }

    const deckId = `custom_${Date.now()}`;

    await saveCustomDeck({
      deckId,
      title: String(deckTitle || "Custom Deck").trim(),
      cards,
    });

    // go to picker (works as long as other screens use getDeckHand)
    navigation.reset({
      index: 0,
      routes: [{ name: "Picker", params: { deckId } }],
    });
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backTxt}>Back</Text>
        </Pressable>
        <Text style={s.h1}>Custom Deck</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.panel}>
        <Text style={s.label}>Deck name</Text>
        <TextInput
          value={deckTitle}
          onChangeText={setDeckTitle}
          placeholder="My Custom Deck"
          placeholderTextColor="#9CA3AF"
          style={s.input}
        />
      </View>

      <View style={s.panel}>
        <Text style={s.label}>Card label</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mogsy"
          placeholderTextColor="#9CA3AF"
          style={s.input}
        />

        <View style={{ height: 12 }} />

        <Pressable onPress={pickImage} style={s.secondaryBtn}>
          <Text style={s.secondaryTxt}>{imageUri ? "Change image" : "Pick an image"}</Text>
        </Pressable>

        {imageUri ? (
          <View style={s.previewRow}>
            <Image source={{ uri: imageUri }} style={s.previewCircle} />
            <Text style={s.previewTxt} numberOfLines={2}>
              {String(name || "").trim() || "Card label…"}
            </Text>
          </View>
        ) : null}

        <View style={{ height: 12 }} />

        <Pressable
          onPress={addCard}
          style={[s.primaryBtn, !canAdd && { opacity: 0.45 }]}
          disabled={!canAdd}
        >
          <Text style={s.primaryTxt}>Add card</Text>
        </Pressable>
      </View>

      <View style={s.panel}>
        <Text style={s.label}>Cards ({cards.length})</Text>
        {cards.length === 0 ? (
          <Text style={s.muted}>No cards yet. Add your first name + image above.</Text>
        ) : (
          cards.slice(0, 12).map((c) => (
            <View key={c.id} style={s.row}>
              <Image source={{ uri: c.imageUri }} style={s.rowCircle} />
              <Text style={s.rowTxt} numberOfLines={1}>{c.front}</Text>
            </View>
          ))
        )}

        <View style={{ height: 12 }} />
        <Pressable
          onPress={createDeck}
          style={[s.primaryBtn, !cards.length && { opacity: 0.45 }]}
          disabled={!cards.length}
        >
          <Text style={s.primaryTxt}>Create deck</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  inner: { paddingTop: Platform.OS === "web" ? 24 : 52, paddingBottom: 32 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  backTxt: { color: "#007AFF", fontSize: 16, fontWeight: "500" },
  h1: { fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.2 },

  panel: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  label: { color: "#111", fontWeight: "700", marginBottom: 8 },
  muted: { color: "#6E6E73", fontWeight: "500" },

  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    fontWeight: "600",
  },

  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryTxt: { color: "white", fontWeight: "700", fontSize: 16 },

  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  secondaryTxt: { color: "#007AFF", fontWeight: "700", fontSize: 16 },

  previewRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  previewCircle: { width: 56, height: 56, borderRadius: 999, backgroundColor: "#E5E7EB" },
  previewTxt: { flex: 1, color: "#111", fontWeight: "700" },

  row: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  rowCircle: { width: 34, height: 34, borderRadius: 999, backgroundColor: "#E5E7EB" },
  rowTxt: { flex: 1, color: "#111", fontWeight: "700" },
});
