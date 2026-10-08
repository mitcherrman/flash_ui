# Flashcard Maker — offline demo: integration specification

**Audience:** the portfolio workstream (Lovable / any React stack). **Status:** verified on `flashv2/f6-portfolio-certification` (FLASH-V2-F6, 2026-10-07). Everything here is read from the code or measured in the built demo; nothing needs the Flashcard Maker backend.

There are two ways to use the demo:

| Route | What you ship | Effort | Fidelity |
|---|---|---|---|
| **A. Embed** | The static build from `npm run export:demo` (a folder: `index.html`, one JS bundle, `favicon.ico`), served from any static host or a sub-path of the portfolio, shown in an `<iframe>` or linked full-screen | Low | Exact: it *is* the product's study screens |
| **B. Recreate** | Your own components, fed by `src/demo/fixture/harbor-point-deck.json`, following §2–§7 | Medium | As close as you follow this spec |

Route A is recommended for a "try it" panel. Route B suits a scroll-driven case-study section that shows one or two states inline. Both can coexist: recreate a hero state, link to the real demo.

---

## 1. Route A — embedding the real demo

**Build:** `npm ci && npm run export:demo` → `dist/demo/` (≈ 0.9 MB uncompressed JS, ≈ 260 KB gzip-transferred). Asset URLs in `index.html` are rewritten to be relative (`./_expo/...`), so the folder works at a domain root or under any sub-path. Verified served at `/flash-demo/`.

**Runtime guarantees (verified in headless Edge's network log and console):**

- Requests: exactly the static files (document, script, favicon). No API, model, font, analytics or third-party request. `fetch` and `XMLHttpRequest` are replaced with a guard that rejects locally, so even a regression couldn't reach a server.
- Storage: 0 `localStorage` / `sessionStorage` keys written or read during a full walk.
- No cookies, no URL changes (the demo doesn't touch `location` or history; see §8).
- Console: no errors or warnings in any walk.

**Embedding notes:**

- The app manages its own scrolling (`body { overflow: hidden }`, inner scroll views). Give the iframe an explicit height — `min(860px, 90vh)` works well on desktop — rather than relying on content height. On phones, prefer a "Open the demo" button that opens it full-screen (same URL) over a small iframe.
- `title="Flashcard Maker offline demo"` on the iframe; the page's own title is "Flashcard Maker · Offline demo".
- Serve with gzip/brotli (Lighthouse mobile performance 79 without compression, 98 with it; §9 of the handoff).
- Do not pass query parameters or ids in; the demo always opens on its source screen with one deck.

---

## 2. The fixture: data contract

File: `src/demo/fixture/harbor-point-deck.json` (≈ 28 KB, UTF-8). It is **synthetic**: a fictional operations brief written for the demo. The card *text* is hand-written; every page number, section range, ordinal and the document order were **computed by the real backend pipeline** (certified F5 SHA `9b9239d`) by `docs/portfolio/fixture/build_fixture.py`, which runs `analyze → generate → hand/toc` in-process with a scripted model stand-in and the network blocked. The source PDF is `docs/portfolio/fixture/harbor-point-operations-brief.pdf` (6 pages, 9 KB).

Top-level keys (every one is checked by `tests/f6Demo.test.mjs`):

| Key | Shape | Notes |
|---|---|---|
| `fixture` | `{ id, schema: "flash-demo-fixture/v1", synthetic: true, notice, provenance{…} }` | Provenance says what was hand-written vs. computed |
| `document` | `{ filename, file, title, notice, outline[{title,page}], pages[{page,text}] }` | The PDF's text per page (for "source → card" visuals) |
| `analysis` | exactly `POST /analyze/`'s response | `pages 6, words 757, sections_count 4, recommended_cards 4, suggested_range {lo:3,hi:5}`, `per_section_allocation[]` with real ranges |
| `plan` | `{ deck_name, cards_wanted: 10, allocations[{title,page_start,page_end,cards}] }` | What the Upload screen sent (edited up from 4 to 10 cards) |
| `generate` | `POST /generate/`'s response without `template` | `deck_id "demo-harbor-point-brief"`, `cards_created 10`, `requested 10`, `partial false`, `warnings []`, `per_section[]` |
| `template` | `generate.template` | 4 sections × 5–6 Q/A items; `page_source: "toc"` |
| `hand` | `GET /hand/?order=doc&n=all` | 10 cards, the study screens' data |
| `toc` | `GET /toc/` | 10 rows, same order and ordinals as `hand` |

**Card (`hand[]`):**

```
id           integer, unique
deck         string  — the deck's public id (= generate.deck_id)
front        string  — the question
back         string  — the answer
excerpt      string  — the passage the answer came from (contains the answer: hide until reveal)
context      "definition" | "concept" | "process" | "example" | "comparison" | "timeline" | "formula" | "other"
page         integer ≥ 1 | null   — null = the pipeline couldn't ground it; never show it as a page
section      string  — exactly a template section title
ordinal      integer 1..N — document order
distractors  string[3] — wrong options for Multiple Choice (none equals `back`)
right, wrong integer (always 0; legacy)
```

**TOC row (`toc[]`):** `{ id, ordinal, front, section, page, context }` — the same values as the card with that ordinal.

**Template section:** `{ title, page_start, page_end, page_source: "toc" | "page" | "estimated", items[{ type, term, definition, source_excerpt, page, ordinal }] }`. ⚠ An item's `page` is the section's *start* page (backend behaviour), not a grounded page — don't display it as one.

**Invariants (tested):**

- `hand[i].ordinal === i + 1 === toc[i].ordinal`; order is page ascending with `null` pages last.
- Every non-null `page` lies inside its section's `[page_start, page_end]`, and its `excerpt` occurs word for word on that page's text.
- The one `null` page (card 10) belongs to a multi-page section (3–4) and its excerpt is a paraphrase that occurs on neither page.
- Section ranges are identical in `analysis`, `plan` and `template`: Site and System Overview 1–2, Storage and Dispatch 3–4, Islanding and Fault Response 5, Maintenance and Reporting 6.
- Pages: `1, 2, 2, 3, 3, 5, 5, 6, 6, null`.

---

## 3. Provenance rules (the product's core idea — keep them exact)

| Situation | Wording |
|---|---|
| Card has an exact page | `Page 3` |
| Card page is `null` and its section has a real range | `Page unknown · Section covers pages 3–4` (the range is labelled as the *section's*, never as the card's page) |
| Card page is `null`, no usable range | `Page unknown` — never "Page 1" |
| Section range, one page | `Page 5` |
| Section range, several pages | `Pages 1–4` |
| Section range with `page_source: "estimated"` | `About pages 3–4` (not in this fixture) |
| TOC row, unknown page | `Page unknown` in italic, regular weight |

**Source reveal rule:** before the learner commits (Flip Drill: first flip on this card visit; Multiple Choice: an answer), the source panel shows only **Section**, **Page** and the context tag, plus the note *"The source excerpt appears after you reveal the answer."* The excerpt is not rendered at all before that (it isn't in the DOM). After the reveal it shows as a quotation (clipped at 360 characters), with a "Show source excerpt" switch. Flipping back to the question keeps it visible (the learner already committed). Moving to another card resets it.

---

## 4. Interaction states

### 4.1 Source screen (demo only; stands in for Upload)

Static: document title, "Offline demo · synthetic document" badge, step strip (Source → Structure → Cards → Study), source file name, Structure (6 pages · 757 words · 4 sections), "Sections and cards" (range + card count per section; "10 cards · 9 tied to an exact page · 1 with the page unknown"), and a worked example: the page-1 paragraph with card 1's excerpt highlighted (tinted background **and** underline), then card 1's question and "Page 1 · Site and System Overview". Actions: **Start Flip Drill** (primary), **Open the deck**.

### 4.2 Picker (deck home)

Title = deck name ("Harbor Point Microgrid Operations Brief"), subtitle "10 cards". Two mode cards (whole card is the button): **Flip Drill**, **Multiple Choice**. Deck tools: Table of contents, Study template, Download printable cards (HTML — works offline; generates a file locally). "New deck" returns to the source screen in the demo.

### 4.3 Flip Drill

```
question ──(tap card / Space / Enter)──▶ answer (revealed = true)
answer   ──(tap card / Space / Enter)──▶ question (revealed stays true)
any      ──(Next / → / swipe left)────▶ next card, QUESTION side, revealed = false   (wraps 10 → 1)
any      ──(Previous / ← / swipe right)▶ previous card, QUESTION side, revealed = false (wraps 1 → 10)
any      ──(Contents)─────────────────▶ TOC (current card marked)
```

- Card faces are labelled in text: "QUESTION" / "ANSWER", with hints "Tap the card to show the answer" / "Tap to see the question again" (desktop: "Click the card or press Space…").
- Counter: "Card 4 of 10" (under 480 px wide: "4/10", still announced "Card 4 of 10").
- The answer text isn't rendered until the first reveal on a card visit.
- A card change never animates back through the answer: it snaps to the question side.
- Swipe: only clearly horizontal drags (|dx| > 20 and > 1.2·|dy|); commit distance = card width / 5, clamped 64–120 px; shorter drags spring back.

### 4.4 Multiple Choice

```
idle ──(click option / key 1–4)──▶ answered
answered + correct + not last card ──(700 ms)──▶ next card (exactly once)
answered + wrong  ──▶ waits for Next
answered + last card ──▶ waits ("That was the last card. Next goes back to card 1.")
any ──(Next / Previous / ← / →)──▶ neighbour card, idle (wraps)
```

- Four options: the card's answer + its three distractors, shuffled once per card visit; labelled A–D.
- After answering, all options are disabled. The correct one gets "✓ Correct answer" (or "✓ Correct — your answer"), a wrong pick "✗ Your answer — incorrect", others are muted. Colour is never the only cue.
- Status line (polite live region): "Correct. Moving to the next card…" or "Not quite. The correct answer is marked. Press Next when you're ready."
- The source panel (§3) appears after answering.
- Scoring chips: **Practice** (default; not counted) / **Keep score** (✓ n / ✗ n badges in the header; on this device only).

### 4.5 Table of contents

Rows in document order: `#n` badge, page label (right), section (accent caps), question. Opened from a study screen it scrolls the current card into view 30% down the list, marks it "Current" and focuses it. Search filters by section or question ("4 of 10 cards match"); clearing it returns to the current card. Pressing a row returns to the study mode at that card (question side). Escape clears the search, then goes back.

### 4.6 Study template

"Study template" + deck title, "4 sections · 23 key points", then per section: title, range ("Pages 1–2 · 6 points") and Q/A items. Phones and short landscape: full-screen sheet; tablet/desktop: centred dialog (max 880 px wide, 88% of window height) over a scrim; clicking the scrim or Close or Escape closes it.

---

## 5. Visual tokens worth preserving (`src/theme/tokens.js`)

| Group | Values |
|---|---|
| Surfaces | page `#F5F3EE` · panel `#FFFFFF` · sunken `#EEEBE4` · source panel `#FAF8F3` with a 3 px left rule `#8A8375` |
| Text | ink `#1A2231` · secondary `#434D5F` · muted `#5C6575` |
| Lines | decorative `#E3DED4` · control boundary `#8A8375` (≥3:1) |
| Accent (actions) | teal `#0F6B5E` · hover `#0C5A4F` · pressed `#094A41` · soft `#E3F0EC` · accent text `#0C5A4F` |
| Study card | front `#FFFFFF` / border `#E3DED4` · back (answer) `#FFF6DF` / border `#F0D9A2` · answer label `#7A4D0B`; 6 px top rule; radius 24 |
| Status | success `#1B6E44` on `#E5F3EA` · error `#A8231B` on `#FCEBE9` · warning `#7F5300` on `#FFF3D6` |
| Focus | 2 px outline `#3157CF`, 2 px offset (`:focus-visible` only) |
| Type (system fonts) | display 32/40 · title 26/32 · heading 18/24 · body 16/24 · small 14/20 · label 15/20 600 · meta 12/16 600 uppercase +0.6 tracking · card front 26/34 600 · card back 22/30 500 · excerpt 15/22 italic |
| Spacing | 2, 4, 8, 12, 16, 24, 32, 48 |
| Radius | 8 · 12 (buttons, rows) · 16 (panels) · 24 (study cards) · pill |
| Targets | every button/option/chip ≥ 44 px (the "Show source excerpt" switch is a 40×20 native control; see the handoff's limitations) |

All text pairs are ≥ 4.5:1 and control boundaries ≥ 3:1 (asserted by `tests/theme.test.mjs`).

## 6. Motion

| Transition | Spec | Reduced motion |
|---|---|---|
| Card flip | rotateY 0 → 180°, 300 ms, both faces `backface-visibility: hidden`, perspective 1000 | instant |
| Card change | instant snap to the question side (no reverse flip) | same |
| Swipe | card follows the finger; spring back if under the threshold | no spring |
| MC auto-advance | 700 ms after a correct answer, once | same timing |
| Press | scale 0.98, 120 ms | no scale |
| Template sheet | slide (phone) / fade (dialog), ~200 ms | none |
| Easing | `cubic-bezier(0.2, 0, 0, 1)` | — |

## 7. Layout (window geometry only — never hover or touch detection)

| Class | Rule | Flip Drill | Multiple Choice |
|---|---|---|---|
| phone | width < 600 (or landscape < 560 wide) | one column: card (≈ 0.72 × width tall, grows with text) → source panel; Previous/Next pinned in a footer; template bar under it | question → options (52 px min) → status → source → scoring; Previous/Next pinned |
| tablet | 600–1023 | same, column ≤ 640 px, card 0.6 aspect | same, column ≤ 640 px |
| short | landscape, height < 520, width ≥ 560 | card left (fills height), source + Previous/Next right (220–340 px); template is a header button | question (+ source) left; options right (44 px min), status + Previous/Next pinned under them |
| desktop | width ≥ 1024 | card (≤ 720 px, 0.6 aspect) with Previous/Next and a keyboard hint under it; source panel (300–400 px) beside it; template is a header button | question + source left (360–520 px); options (56 px), status, controls, scoring, keyboard hint right |

Gutters 16 / 24 / 32 px. Text never shrinks below 16 px and is never truncated; cards grow and their column scrolls. Verified with no horizontal overflow at 390×844, 844×390, 768×1024, 1280×800 and 1440×900.

## 8. Accessibility behaviour to keep

- Flip target: one button for both faces, named "Question: …? Show the answer" / "Answer: …. Show the question", `aria-expanded` true after flipping; the hidden face is `aria-hidden`.
- MC options: buttons named "Option B: text" plus the result after answering ("… Correct answer" / "… Your answer — incorrect"), `aria-disabled` after answering, in a group labelled "Answer options". Scoring chips: `role=radio` with `aria-checked` in a `radiogroup`.
- Counters and the MC status line are polite live regions. The template dialog is named "Study template".
- Keyboard (web): Flip Drill Space/Enter flip, ←/→ previous/next; MC 1–4 answer, ←/→; TOC Escape clears/returns; dialogs close with Escape and return focus to the button that opened them. Shortcuts are ignored while typing, with modifier keys, on auto-repeat, and while a dialog is open; Space/Enter on a focused button activates that button.
- Focus: arriving on a study screen focuses the card/question; after answering MC focus continues on Next; the TOC focuses the current row.
- Colour is never the only signal (✓/✗ text, "Correct answer" tags, page wording, highlighted excerpt also underlined).

## 9. Browser history

The demo does not change the URL or push history entries; browser Back leaves the demo page. If a recreation wants deep links, it may encode only `mode` and `card` (e.g. `#flip/4`): the fixture holds no private data. The real app deliberately has no URL routing (see the handoff).

## 10. What not to imply

- The demo's cards weren't generated by a model in this run; the text was written for the fixture and the backend computed the provenance. Say "a pre-built synthetic deck", not "AI-generated live".
- The demo can't build decks; real generation needs the backend and an OpenAI key.
- No production deployment exists.
