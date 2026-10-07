// src/utils/exportHTML.js
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// The document itself is built by the pure src/study/printable.js (duplex
// order, F1 colours); this module only saves or shares it.
export { deckToPrintableHTML } from "../study/printable";

/**
 * Save HTML to a file and present it to the user
 * - Web: downloads a .html file
 * - Native: writes to cache and opens the share dialog
 */
export async function saveHTML({ html, filename = "flashcards.html" }) {
  if (Platform.OS === "web") {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, html, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/html", dialogTitle: filename });
  }
  return uri;
}
