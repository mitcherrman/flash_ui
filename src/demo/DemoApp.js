// src/demo/DemoApp.js
// Root of the offline portfolio demo (F6). Only index.js loads this, and only
// in a build made with EXPO_PUBLIC_FLASH_DEMO=1 (npm run export:demo); the
// normal app never imports it.
//
// It runs the real study screens — Picker, Flip Drill, Multiple Choice,
// Contents and the study template — over one bundled synthetic deck:
//   • the app's `deckSource` seam is pointed at the fixture (no fetch, no
//     storage reads or writes);
//   • fetch / XMLHttpRequest are replaced by a guard, so any request that
//     slipped in would fail locally instead of reaching a server;
//   • the source screen takes the "Upload" route, so the screens' own
//     "New deck" / "Back to Upload" actions land there. There is no Build
//     route: the demo can't make decks.
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import fixture from "./fixture/harbor-point-deck.json";
import { installDemoSource } from "./demoSource";
import { blockNetwork } from "./network";
import { DEMO_SOURCE_ROUTE } from "./demoNav";
import DemoSourceScreen from "./DemoSourceScreen";
import { deckSource } from "../study/useDeck";
import { navTheme, rootScreenOptions } from "../navigation/navTheme";
import GamePicker from "../Screens/GamePicker";
import Game2Screen from "../Screens/Game2Screen";
import GameMC from "../Screens/GameMC";
import TOCScreen from "../Screens/TOCScreen";
import { NotifyHost, installWebGlobalStyles, useReducedMotion } from "../ui";

blockNetwork();
installDemoSource(deckSource, fixture);
installWebGlobalStyles();

const Stack = createNativeStackNavigator();
const SourceRoute = (props) => <DemoSourceScreen {...props} fixture={fixture} />;

function DemoStack() {
  const reduceMotion = useReducedMotion();
  return (
    <Stack.Navigator initialRouteName={DEMO_SOURCE_ROUTE} screenOptions={rootScreenOptions(reduceMotion)}>
      <Stack.Screen name={DEMO_SOURCE_ROUTE} component={SourceRoute} />
      <Stack.Screen name="Picker" component={GamePicker} />
      <Stack.Screen name="Game2" component={Game2Screen} />
      <Stack.Screen name="TOC" component={TOCScreen} options={{ title: "Contents" }} />
      <Stack.Screen name="GameMC" component={GameMC} />
    </Stack.Navigator>
  );
}

export default function DemoApp() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => "Flashcard Maker · Offline demo" }}>
        <DemoStack />
      </NavigationContainer>
      <NotifyHost />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
