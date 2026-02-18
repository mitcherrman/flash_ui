// src/Screens/CreateProfileScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { loadProfile, saveProfile, clearProfile } from "../utils/profileStore";

export default function CreateProfileScreen({ navigation }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState(""); // keep as string for input
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadProfile();
      if (!alive) return;
      if (p) {
        setName(p.name || "");
        setAge(p.age == null ? "" : String(p.age));
        setLocation(p.location || "");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canSave = useMemo(() => {
    const n = name.trim().length > 0;
    const a = age.trim().length === 0 || (Number(age) >= 0 && Number(age) <= 120);
    const l = location.trim().length > 0;
    return n && a && l;
  }, [name, age, location]);

  async function onSave() {
    if (!canSave) return;

    const parsedAge = age.trim() === "" ? null : Number(age);
    if (parsedAge != null && (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120)) {
      Alert.alert("Invalid age", "Please enter a valid age between 0 and 120.");
      return;
    }

    await saveProfile({
      name,
      age: parsedAge,
      location,
    });

    Alert.alert("Saved", "Your profile has been saved.");
    navigation.goBack();
  }

  async function onClear() {
    await clearProfile();
    setName("");
    setAge("");
    setLocation("");
    Alert.alert("Cleared", "Profile removed.");
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backTxt}>Back</Text>
        </Pressable>
        <Text style={s.h1}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.panel}>
        <Text style={s.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#9CA3AF"
          style={s.input}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <View style={{ height: 12 }} />

        <Text style={s.label}>Age (optional)</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 28"
          placeholderTextColor="#9CA3AF"
          style={s.input}
          keyboardType="number-pad"
          returnKeyType="next"
        />

        <View style={{ height: 12 }} />

        <Text style={s.label}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Berkeley, CA"
          placeholderTextColor="#9CA3AF"
          style={s.input}
          returnKeyType="done"
        />

        <View style={{ height: 16 }} />

        <Pressable
          onPress={onSave}
          disabled={!canSave || loading}
          style={[s.primaryBtn, (!canSave || loading) && { opacity: 0.45 }]}
        >
          <Text style={s.primaryTxt}>Save profile</Text>
        </Pressable>

        <Pressable onPress={onClear} style={s.secondaryBtn}>
          <Text style={s.secondaryTxt}>Clear</Text>
        </Pressable>

        <Text style={s.hint}>
          This is saved locally on your device (AsyncStorage).
        </Text>
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
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  secondaryTxt: { color: "#FF3B30", fontWeight: "700", fontSize: 16 },

  hint: {
    marginTop: 12,
    color: "#6E6E73",
    fontWeight: "500",
    textAlign: "center",
  },
});
