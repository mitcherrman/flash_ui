import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";

/* Shows a spinner while the backend builds the deck. 
   Expects { file, testChunks } params from UploadScreen. */
export default function Build({ route, navigation }) {
  const { file, testN } = route.params;

  useEffect(() => {
    (async () => {
      const body = new FormData();
      body.append("file",   file);
      body.append("deck_name", file.name.replace(".pdf", ""));
      if (testN) body.append("test_chunks", String(testN));

      const res = await fetch("http://127.0.0.1:8000/api/builder/generate/", {
        method: "POST",
        body,
      }).then(r => r.json());

      navigation.replace("Picker", { deckId: res.deck_id });
    })();
  }, []);

  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <ActivityIndicator size="large" />
      <Text style={{marginTop:16}}>Building deck…</Text>
    </View>
  );
}
