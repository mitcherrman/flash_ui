// src/Screens/HomeProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { loadProfile } from "../utils/profileStore";

export default function HomeProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadProfile();
      if (!alive) return;
      setProfile(p);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const name = profile?.name?.trim() ? profile.name.trim() : "No profile yet";
  const age =
    profile?.age == null || !Number.isFinite(profile.age) ? "—" : String(profile.age);
  const location = profile?.location?.trim() ? profile.location.trim() : "—";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backTxt}>Back</Text>
        </Pressable>

        <Text style={s.h1}>Profile</Text>

        <Pressable
          onPress={() => navigation.navigate("CreateProfile")}
          hitSlop={10}
        >
          <Text style={s.editTxt}>Edit</Text>
        </Pressable>
      </View>

      {/* Card */}
      <View style={s.card}>
        <Text style={s.bigName} numberOfLines={1}>
          {name}
        </Text>

        <View style={{ height: 12 }} />

        <Row label="Age" value={age} />
        <Divider />
        <Row label="Location" value={location} />

        <View style={{ height: 14 }} />

        {!profile?.name?.trim() ? (
          <>
            <Text style={s.hint}>
              Create your profile to personalize your decks later.
            </Text>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => navigation.navigate("CreateProfile")}
              style={s.primaryBtn}
            >
              <Text style={s.primaryTxt}>Create profile</Text>
            </Pressable>
          </>
        ) : (
          <Text style={s.hint}>
            This will sync to your backend later. For now it’s stored locally.
          </Text>
        )}
      </View>

      {/* Future sections placeholder */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Coming soon</Text>
        <Text style={s.sectionSub}>
          Profile photo • Badges • Stats • Cloud sync
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
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
  editTxt: { color: "#007AFF", fontSize: 16, fontWeight: "600" },
  h1: { fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.2 },

  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  bigName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: { color: "#6E6E73", fontWeight: "600" },
  rowValue: { color: "#111", fontWeight: "700", maxWidth: "70%" },

  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  hint: {
    color: "#6E6E73",
    fontWeight: "500",
    lineHeight: 18,
  },

  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryTxt: { color: "white", fontWeight: "700", fontSize: 16 },

  sectionCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  sectionTitle: { color: "#111", fontWeight: "800", fontSize: 16 },
  sectionSub: { color: "#6E6E73", marginTop: 6, fontWeight: "500" },
});
