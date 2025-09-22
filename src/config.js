// src/config.js
// Central place for any values both web & native need.

// export const API_BASE = "http://127.0.0.1:8000/api/flashcards";

// If you run on a real phone replace 127.0.0.1 with your computer’s
// LAN IP, e.g. 192.168.0.42, or use an env‑style switch:
//
// export const API_BASE =
//   process.env.EXPO_PUBLIC_API ?? "http://192.168.0.42:8000/api/flashcards";

// src/config.js
// import { Platform } from "react-native";

/** Change this to your computer’s LAN IP when you test on a phone! */
// const LOCAL_LAN_IP = "10.0.0.139:8081";   // <‑‑ replace

//export const API_BASE = Platform.select({
 // web    : "http://127.0.0.1:8000/api/flashcards",
  //default: `http://${LOCAL_LAN_IP}/api/flashcards`,
// });


// Single source of truth for the backend URL.
// Change the IP when you switch networks.



// export const API_BASE = "http://10.0.0.139:8000";

// src/config.js
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

export const API_BASE = Platform.select({
  web: "http://127.0.0.1:8000",
  default: `http://${getLanHost()}:8000`,
});
