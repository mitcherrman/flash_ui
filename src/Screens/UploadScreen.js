import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";

export default function Upload({ navigation }) {
  const [file, setFile] = useState(null);
  const [testN, setTestN] = useState(0);   // TODO slider / picker

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({ type:"application/pdf" });
    if (res.canceled) return;
    setFile(res.assets[0]);
  }

  async function upload() {
    const body = new FormData();
    body.append("file", {
      uri : file.uri,
      name: file.name,
      type: "application/pdf",
    });
    body.append("deck_name", file.name.replace(".pdf",""));
    if (testN) body.append("test_chunks", String(testN));

    const r = await fetch("http://127.0.0.1:8000/api/builder/generate/", {
      method : "POST",
      headers: { "Authorization": "Bearer dummy" },   // later JWT
      body,
    }).then(r=>r.json());

    navigation.navigate("Build", { file: pickedFile, testN });
  }

  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <Button title="Choose PDF" onPress={pick} />
      {file && <Text>{file.name}</Text>}
      {file && <Button title="Upload & Build" onPress={upload} />}
    </View>
  );
}
