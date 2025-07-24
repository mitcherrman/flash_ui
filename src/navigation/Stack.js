import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Upload   from "flash_ui\src\Screens\UploadScreen.js";
import Build    from "flash_ui\src\Screens\BuildScreen";
import Picker   from "flash_ui\src\Screens\GamePicker.js";
import Game1    from "flash_ui\src\Screens\Game1Screen.js";
import Game2    from "flash_ui\src\Screens\Game2Screen.js";

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      <Stack.Screen name="Upload" component={Upload} />
      <Stack.Screen name="Build"  component={Build}  />
      <Stack.Screen name="Picker" component={Picker} />
      <Stack.Screen name="Game1"  component={Game1} />
      <Stack.Screen name="Game2"  component={Game2} />
    </Stack.Navigator>
  );
}
