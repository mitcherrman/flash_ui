// src/Screens/UploadScreen.js
// 1) Let the user pick a local PDF
// 2) Collect test-chunks (optional) + cards wanted (slider)
// 3) Navigate to <BuildScreen>
// UC Berkeley colorway + larger fonts

import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";

const COLORS = {
  blue: "#003262",
  gold: "#FDB515",
  white: "#FFFFFF",
  pale: "#FFF6DB",
  slate: "#CBD5E1",
};

function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={styles.btnTxt}>{title}</Text>
    </Pressable>
  );
}

export default function UploadScreen({ navigation }) {
  const [file, setFile]               = useState(null);   // { uri, name, … }
  const [testN, setTestN]             = useState("");     // 0–5 demo
  const [cardsWanted, setCardsWanted] = useState(12);     // 3–30

  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!res.canceled) setFile(res.assets[0]);
    } catch (err) {
      console.error(err);
      Alert.alert("Could not open the file picker.");
    }
  }

  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    const n = parseInt(testN, 10) || 0;
    navigation.navigate("Build", { file, testN: n, cardsWanted });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Build Flashcards</Text>

      <PrimaryButton title="Choose PDF" onPress={pick} />

      {file && <Text style={styles.fileName}>{file.name}</Text>}

      {file && (
        <>
          <Text style={styles.sectionLabel}>Quick test (0–5 chunks, optional)</Text>
          <TextInput
            value={testN}
            onChangeText={setTestN}
            placeholder="0"
            keyboardType="number-pad"
            maxLength={1}
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
            Cards to generate: <Text style={{ fontWeight: "900" }}>{cardsWanted}</Text>
          </Text>
          <Slider
            minimumValue={3}
            maximumValue={30}
            step={1}
            value={cardsWanted}
            onValueChange={setCardsWanted}
            style={{ width: 260, height: 40 }}
            minimumTrackTintColor={COLORS.gold}
            maximumTrackTintColor="#8FA3B7"
            thumbTintColor={COLORS.white}
          />

          <PrimaryButton title="Upload & Build" onPress={next} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  fileName: {
    marginVertical: 10,
    fontSize: 18,
    color: COLORS.white,
    textAlign: "center",
  },
  sectionLabel: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  input: {
    width: 120,
    height: 46,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  btn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginTop: 14,
  },
  btnTxt: {
    color: COLORS.blue,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
