import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";

export default function BuildScreen({ route, navigation }) {
  const { file, testChunks } = route.params;

  useEffect(() => {
    (async () => {
      const body = new FormData();
      body.append("file", {
        uri : file.uri,
        name: file.name,
        type: "application/pdf",
      });
      body.append("deck_name", file.name.replace(".pdf",""));
      if (testChunks) body.append("test_chunks", String(testChunks));

      try {
        const res = await fetch("http://127.0.0.1:8000/api/builder/generate/", {
          method : "POST",
          body,
        }).then(r=>r.json());

        navigation.replace("Picker", { deckId: res.deck_id });
      } catch (err) {
        console.error(err);
        Alert.alert("Upload failed", err.message);
        navigation.goBack();
      }
    })();
  }, []);

  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <ActivityIndicator size="large" />
      <Text style={{marginTop:16}}>Building deck…</Text>
    </View>
  );
}
