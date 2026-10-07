// src/study/printable.js
// Printable cut-out cards as one standalone HTML document (F3). Pure: no
// React / React Native imports. Saving/sharing lives in utils/exportHTML.js.
//
// Layout: US Letter, 2 columns × 3 rows, printed double-sided.
//
// Duplex fixes (verified bug, F0 §14):
//   1. Column order. With a long-edge flip the back of a sheet is mirrored
//      left↔right, but backs used the fronts' left-to-right order, so each
//      answer landed behind the neighbouring column's question. Back rows are
//      now mirrored, with an empty cell where a short last row needs one.
//   2. Page order. All question pages came first, then all answer pages, so
//      with more than 6 cards a duplex printer put question sheet 2 on the
//      back of question sheet 1. Pages now alternate: questions 1, answers 1,
//      questions 2, answers 2, …
// The instructions block is screen-only, so it never shifts that pairing.

import { colors } from "../theme/tokens.js";

export const COLUMNS = 2;
export const ROWS = 3;
export const PER_PAGE = COLUMNS * ROWS;

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Back-page cell order for one sheet of fronts. Row by row, each row is
 * padded to full width and reversed; `null` is an empty cell.
 *   [a, b, c, d, e] → [b, a, d, c, null, e]
 */
export function mirroredBackCells(group, columns = COLUMNS) {
  const out = [];
  for (const row of chunk(group, columns)) {
    const padded = [...row];
    while (padded.length < columns) padded.push(null);
    out.push(...padded.reverse());
  }
  return out;
}

export function escapeHTML(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cell(card, side) {
  if (!card) return `<div class="card blank" aria-hidden="true"></div>`;
  const text = side === "front" ? card.front : card.back;
  return `
          <div class="card ${side}">
            <div class="side">${side === "front" ? "Question" : "Answer"}</div>
            <div class="inner">${escapeHTML(text || "")}</div>
          </div>`;
}

export function deckToPrintableHTML({ deckName = "Flashcards", cards = [] }) {
  const groups = chunk(Array.isArray(cards) ? cards : [], PER_PAGE);
  const total = groups.length;

  const sheet = (g, p, side) =>
    side === "front"
      ? `
      <section class="sheet">
        <header class="page-hint">Questions — sheet ${p + 1} of ${total} (front)</header>
        <div class="grid">${g.map((c) => cell(c, "front")).join("")}</div>
      </section>`
      : `
      <section class="sheet">
        <header class="page-hint">Answers — sheet ${p + 1} of ${total} (back; columns mirrored for long-edge duplex)</header>
        <div class="grid">${mirroredBackCells(g).map((c) => cell(c, "back")).join("")}</div>
      </section>`;

  // Front then back of each physical sheet, in order.
  const pages = groups.map((g, p) => sheet(g, p, "front") + sheet(g, p, "back")).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHTML(deckName)} — Printable cards</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: Letter; margin: 0.5in; }
    :root {
      --gap: 0.25in;
      --cut: 1px dashed ${colors.borderStrong};
      --radius: 0.15in;
      --front-bg: ${colors.cardFront};
      --back-bg: ${colors.cardBack};
      --back-rule: ${colors.cardBackBorder};
      --front-rule: ${colors.accentSoft};
      --text: ${colors.text};
      --muted: ${colors.textMuted};
      --paper: ${colors.bg};
    }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      color: var(--text);
      margin: 0;
    }
    .intro { padding: 0 0 0.25in; font-size: 11pt; line-height: 1.5; }
    .intro h1 { font-size: 16pt; margin: 0 0 0.08in; }
    .sheet { break-after: page; page-break-after: always; }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    .grid {
      display: grid;
      grid-template-columns: repeat(${COLUMNS}, 1fr);
      grid-template-rows: repeat(${ROWS}, 1fr);
      gap: var(--gap);
      height: calc(11in - 1in);
    }
    .card {
      position: relative;
      border: var(--cut);
      border-radius: var(--radius);
      padding: 0.3in 0.25in 0.25in;
      display: flex; align-items: center; justify-content: center;
      text-align: center;
      overflow: hidden;
    }
    .card.blank { border-color: transparent; }
    .front { background: var(--front-bg); font-weight: 600; box-shadow: inset 0 6px 0 var(--front-rule); }
    .back  { background: var(--back-bg); font-weight: 500; box-shadow: inset 0 6px 0 var(--back-rule); }
    .side {
      position: absolute; top: 0.12in; left: 0; right: 0;
      font-size: 7pt; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
    }
    .inner { width: 100%; font-size: 12pt; line-height: 1.35; overflow-wrap: anywhere; }
    .page-hint { font-size: 10pt; color: var(--muted); margin: 0 0 0.2in 0; }
    @media print {
      .intro, .page-hint { display: none; }
    }
    @media screen {
      body { background: var(--paper); padding: 0.5in; }
      .sheet { margin-bottom: 0.5in; }
      .grid { height: 9in; max-width: 7.5in; }
    }
  </style>
</head>
<body>
  <section class="intro">
    <h1>${escapeHTML(deckName)}</h1>
    Printable flashcards: ${cards.length} ${cards.length === 1 ? "card" : "cards"}.<br/>
    Print double-sided and flip on the <em>long edge</em>. Each sheet has questions on the front and
    their answers on the back, so every answer prints behind its own question. Cut along the dashed lines.
    (This note is not printed.)
  </section>
  ${pages}
</body>
</html>`;
}
