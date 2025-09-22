import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import UploadScreen from "../Screens/UploadScreen";
import BuildScreen  from "../Screens/BuildScreen";
import GamePicker   from "../Screens/GamePicker";
import Game1Screen  from "../Screens/Game1Screen";
import Game2Screen  from "../Screens/Game2Screen";
import TOCScreen    from "../Screens/TOCScreen";

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Upload"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Build"  component={BuildScreen} />
      <Stack.Screen name="Picker" component={GamePicker} />
      <Stack.Screen name="Game1"  component={Game1Screen} />
      <Stack.Screen name="Game2"  component={Game2Screen} />
      <Stack.Screen name="TOC"    component={TOCScreen} options={{ title: "Contents" }} />
    </Stack.Navigator>
  );
}
