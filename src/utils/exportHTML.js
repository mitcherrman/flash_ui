// src/utils/exportHTML.js
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

function escapeHTML(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Build a printable HTML doc:
 * - US Letter, 0.5in margins
 * - 2 columns × 3 rows (6 cards per page)
 * - Front pages first, then backs in matching positions
 */
export function deckToPrintableHTML({ deckName = "Flashcards", cards = [] }) {
  const perPage = 6; // 2 × 3 grid
  const groups = chunk(cards, perPage);

  const frontPages = groups
    .map((g, p) => {
      const cells = g
        .map(
          (c) => `
          <div class="card front">
            <div class="inner">${escapeHTML(c.front || "")}</div>
          </div>`
        )
        .join("");
      return `
        <section class="sheet">
          <header class="page-hint">Fronts — Page ${p + 1}</header>
          <div class="grid">${cells}</div>
          <div class="break"></div>
        </section>`;
    })
    .join("");

  const backPages = groups
    .map((g, p) => {
      const cells = g
        .map(
          (c) => `
          <div class="card back">
            <div class="inner">${escapeHTML(c.back || "")}</div>
          </div>`
        )
        .join("");
      return `
        <section class="sheet">
          <header class="page-hint">Backs — Page ${p + 1} (Print duplex, flip on long edge)</header>
          <div class="grid">${cells}</div>
          <div class="break"></div>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHTML(deckName)} — Printable Cards</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: Letter; margin: 0.5in; }
    :root {
      --gap: 0.25in;
      --border: 1px dashed #9aa4b2;
      --radius: 0.15in;
      --front-bg: #ffffff;
      --back-bg: #ffcd00;
      --text: #0f172a;
    }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      color: var(--text);
      margin: 0;
    }
    .sheet { page-break-after: always; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr; /* 2 columns */
      grid-auto-rows: 1fr;           /* equal-height rows */
      gap: var(--gap);
    }
    /* 3 rows per Letter page after margins: using fixed min height */
    .grid { min-height: calc(11in - 1in); } /* just ensures 3 rows layout */
    .card {
      border: var(--border);
      border-radius: var(--radius);
      padding: 0.25in;
      display: flex; align-items: center; justify-content: center;
      text-align: center;
      height: 100%;
    }
    .front { background: var(--front-bg); font-weight: 800; }
    .back  { background: var(--back-bg);  font-weight: 700; }
    .inner {
      width: 100%;
      /* Scales reasonably in print and on-screen previews */
      font-size: 12pt;
      line-height: 1.35;
      word-break: break-word;
    }
    .page-hint {
      font-size: 10pt; color: #334155; margin: 0 0 0.2in 0;
    }
    .break { break-after: page; }
    @media print {
      .page-hint { display: none; }
      .break { display: none; }
    }
    /* Tiny crop marks (optional): uncomment if you want outside marks
    .card::before, .card::after {
      content: ""; position: absolute; width: 8px; height: 8px; background: transparent;
      border-top: 1px solid #94a3b8; border-left: 1px solid #94a3b8;
      transform: translate(-50%, -50%);
    }
    */
  </style>
</head>
<body>
  <section class="sheet" style="page-break-after: avoid;">
    <div class="page-hint">
      <strong>${escapeHTML(deckName)}</strong> — Printable Flashcards<br/>
      Print duplex, Flip on <em>Long Edge</em>. Front pages first, then backs. Cut along dashed lines.
    </div>
  </section>
  ${frontPages}
  ${backPages}
</body>
</html>`;
}

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
