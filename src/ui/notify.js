// src/ui/notify.js
// Cross-platform replacement for Alert.alert (which is a no-op on
// react-native-web 0.20).
//
//   notify(title, message?, buttons?)   — same arguments as Alert.alert
//
// • iOS/Android: calls Alert.alert unchanged (native dialog, same behaviour).
// • Web: queues a themed modal dialog rendered by <NotifyHost/> (mounted once
//   in App.js, outside the navigator so it survives navigation).
//
// Buttons: [{ text, style?: "default" | "cancel" | "destructive", onPress? }]
import { Alert, Platform } from "react-native";
import { enqueue, makeDialog } from "./notifyStore";

export function notify(title, message, buttons) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  enqueue(makeDialog(title, message, buttons));
}

export default notify;
