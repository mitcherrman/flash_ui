// App.js – root providers
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Stack from "./src/navigation/Stack";
import { navTheme } from "./src/navigation/navTheme";
import { NotifyHost, installWebGlobalStyles } from "./src/ui";
import { purgeOldCacheVersions } from "./src/utils/cache";

installWebGlobalStyles();
// Saved decks from an older cache version can't be opened any more (F5).
purgeOldCacheVersions();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => "Flashcard Maker" }}>
        <Stack />
      </NavigationContainer>
      {/* Web dialogs for notify(); outside the navigator so they survive navigation */}
      <NotifyHost />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
