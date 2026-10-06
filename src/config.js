// src/config.js
// Single source of truth for the backend URL.
//
// Override with EXPO_PUBLIC_API_BASE (Expo inlines EXPO_PUBLIC_* at bundle
// time from the shell or a .env / .env.local file; see .env.example).
// It must be the server origin only, e.g. "http://192.168.0.42:8000" —
// screens append "/api/flashcards/...".
//
// Unset (the default for a fresh clone):
//   web    → http://127.0.0.1:8000
//   native → http://<LAN IP of the Metro/Expo dev host>:8000
import { Platform, NativeModules } from "react-native";
import Constants from "expo-constants";

function guessHostFromScriptURL() {
  // e.g. "http://10.0.0.139:8081/index.bundle?..."
  const url = NativeModules?.SourceCode?.scriptURL || "";
  const m = url.match(/https?:\/\/([\d.]+):\d+/);
  return m ? m[1] : null;
}

function guessHostFromConstants() {
  // newer Expo exposes a host string; we just need the ip part
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.developer?.host ||
    "";
  const m = hostUri.match(/^([\d.]+):\d+$/);
  return m ? m[1] : null;
}

function getLanHost() {
  return guessHostFromScriptURL() || guessHostFromConstants() || "127.0.0.1";
}

// Must stay a literal `process.env.EXPO_PUBLIC_…` access so Expo can inline it.
const OVERRIDE = (process.env.EXPO_PUBLIC_API_BASE || "").trim().replace(/\/+$/, "");

export const API_BASE =
  OVERRIDE ||
  Platform.select({
    web: "http://127.0.0.1:8000",
    default: `http://${getLanHost()}:8000`,
  });
