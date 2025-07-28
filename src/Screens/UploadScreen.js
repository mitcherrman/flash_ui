// src/Screens/UploadScreen.js
// ——————————————————————————————————————————————
// 1. Let the user pick a local PDF.
// 2. Collect “test‑chunks” (optional) and “cards wanted” (slider).
// 3. Navigate to <BuildScreen> with all three params.
// ——————————————————————————————————————————————

import React, { useState } from "react";
import { View, Text, Button, Alert, TextInput } from "react-native";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";

export default function UploadScreen({ navigation }) {
  /* ---------------- state ---------------- */
  const [file, setFile]       = useState(null);   // { uri, name, … }
  const [testN, setTestN]     = useState("");     // quick random‑chunk demo
  const [cardsWanted, setCardsWanted] = useState(12);

  /* -------------- pick PDF --------------- */
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

  /* -------------- go next ---------------- */
  function next() {
    if (!file) return Alert.alert("Choose a PDF first");
    const n = parseInt(testN, 10) || 0;
    navigation.navigate("Build", {
      file,
      testN: n,
      cardsWanted,
    });
  }

  /* -------------- UI --------------------- */
  return (
    <View style={styles.center}>
      <Button title="Choose PDF" onPress={pick} />

      {file && <Text style={styles.fileName}>{file.name}</Text>}

      {file && (
        <>
          {/* optional test chunks */}
          <TextInput
            value={testN}
            onChangeText={setTestN}
            placeholder="Test chunks (0‑5)"
            keyboardType="number-pad"
            maxLength={1}
            style={styles.input}
          />

          {/* slider for #cards */}
          <View style={{ width: 220, marginVertical: 20 }}>
            <Text>Cards to generate: {cardsWanted}</Text>
            <Slider
              minimumValue={3}
              maximumValue={30}
              step={1}
              value={cardsWanted}
              onValueChange={setCardsWanted}
            />
          </View>

          <Button title="Upload & Build" onPress={next} />
        </>
      )}
    </View>
  );
}

/* ---------- styles ---------- */
const styles = {
  center:   { flex: 1, justifyContent: "center", alignItems: "center" },
  fileName: { marginVertical: 8, fontSize: 16 },
  input: {
    width: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    marginVertical: 8,
    textAlign: "center",
  },
};
