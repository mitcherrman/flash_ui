// App.js – root providers
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Stack from "./src/navigation/Stack";
import { colors } from "./src/theme";
import { NotifyHost, installWebGlobalStyles } from "./src/ui";
import { purgeOldCacheVersions } from "./src/utils/cache";

installWebGlobalStyles();
// Saved decks from an older cache version can't be opened any more (F5).
purgeOldCacheVersions();

// Navigator chrome follows the app theme (no white flashes between screens).
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

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
