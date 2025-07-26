// src/config.js
// Central place for any values both web & native need.

// export const API_BASE = "http://127.0.0.1:8000/api/flashcards";

// If you run on a real phone replace 127.0.0.1 with your computer’s
// LAN IP, e.g. 192.168.0.42, or use an env‑style switch:
//
// export const API_BASE =
//   process.env.EXPO_PUBLIC_API ?? "http://192.168.0.42:8000/api/flashcards";

// src/config.js
import { Platform } from "react-native";

/** Change this to your computer’s LAN IP when you test on a phone! */
const LOCAL_LAN_IP = "192.168.1.42";   // <‑‑ replace

export const API_BASE = Platform.select({
  web    : "http://127.0.0.1:8000/api/flashcards",
  default: `http://${LOCAL_LAN_IP}:8000/api/flashcards`,
});
