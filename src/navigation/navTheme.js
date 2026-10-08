// src/navigation/navTheme.js
// Navigator chrome that follows the app theme (no white flashes between
// screens). Shared by the app's stack (Stack.js, App.js) and the offline
// demo's (src/demo/DemoApp.js) without the demo importing the app's routes.
import { DefaultTheme } from "@react-navigation/native";
import { colors } from "../theme";

export const navTheme = {
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

export function rootScreenOptions(reduceMotion) {
  return {
    headerShown: false,
    animation: reduceMotion ? "none" : "slide_from_right",
    contentStyle: { backgroundColor: colors.bg },
  };
}
