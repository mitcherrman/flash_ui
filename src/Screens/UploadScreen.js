// UploadScreen.js  – pick a PDF then jump to the “build” spinner
import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";

export default function UploadScreen({ navigation }) {
  const [file, setFile]       = useState(null);
  const [testN, setTestN]     = useState(0);   // ↔ BuildScreen uses testN

  /* choose a local PDF */
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: false,
    });
    if (!res.canceled) setFile(res.assets[0]);   // assets[0] has uri / name
  };

  /* go to build screen */
  const upload = () => {
    if (!file) return;
    navigation.navigate("Build", { file, testN });   // prop names match Build
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Button title="Choose PDF" onPress={pick} />

      {file && <Text style={{ marginVertical: 8 }}>{file.name}</Text>}

      {file && (
        <Button title="Upload & Build" onPress={upload} />
      )}
    </View>
  );
}
