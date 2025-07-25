// src/Screens/UploadScreen.js
// ——————————————————————————————————————————————
// 1. Let the user pick a local PDF.
// 2. When a file is chosen, navigate to <BuildScreen>
//    with the picked file and an optional “test chunks” count.
// ——————————————————————————————————————————————

import React, { useState } from "react";
import { View, Text, Button, Alert, TextInput } from "react-native";
import * as DocumentPicker from "expo-document-picker";

export default function UploadScreen({ navigation }) {
  /* ---- component state ------------------------------------------------ */
  const [file,   setFile]  = useState(null);  // { uri, name, size, mimeType, … }
  const [testN,  setTestN] = useState("");    // string for <TextInput>

  /* ---- open document picker ------------------------------------------ */
  async function choosePdf() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,          // local tmp copy for web
      });

      if (res.canceled) return;

      const picked = res.assets[0];
      if (!picked.name.toLowerCase().endsWith(".pdf")) {
        Alert.alert("Please choose a .pdf file");
        return;
      }
      setFile(picked);
    } catch (err) {
      console.error("DocumentPicker error:", err);
      Alert.alert("Could not open the file picker.");
    }
  }

  /* ---- go to BuildScreen --------------------------------------------- */
  function proceed() {
    if (!file) {
      Alert.alert("Choose a PDF first");
      return;
    }
    const n = parseInt(testN, 10) || 0;
    navigation.navigate("Build", { file, testN: n });
  }

  /* ---- tiny UI ------------------------------------------------------- */
  return (
    <View style={styles.center}>
      <Button title="Choose PDF" onPress={choosePdf} />

      {file && <Text style={styles.fileName}>{file.name}</Text>}

      {/* optional quick “test chunks” input (0 = off) */}
      {file && (
        <TextInput
          value={testN}
          onChangeText={setTestN}
          placeholder="Test chunks (0–5)"
          keyboardType="number-pad"
          maxLength={1}
          style={styles.input}
        />
      )}

      {file && (
        <Button title="Upload & Build" onPress={proceed} />
      )}
    </View>
  );
}

/* ---------------- inline styles --------------------------------------- */
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
