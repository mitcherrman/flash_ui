import React from "react";
import { View, Button } from "react-native";

export default function Pick({ route, navigation }) {
  const { deckId } = route.params;
  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <Button title="Game 1 – Curate" onPress={() => navigation.navigate("Game1",{deckId})}/>
      <Button title="Game 2 – Mastery" onPress={() => navigation.navigate("Game2",{deckId, mode:"basic"})}/>
      <Button title="Game 2 – MC"      onPress={() => navigation.navigate("Game2",{deckId, mode:"mc"})}/>
    </View>
  );
}
