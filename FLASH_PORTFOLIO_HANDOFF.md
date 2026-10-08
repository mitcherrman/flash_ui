# Flashcard Maker — Portfolio Handoff (verified)

**For:** the portfolio workstream. **From:** FLASH-V2-F6 (final modernization phase), 2026-10-07.
**Rule for this file:** every statement is verified against code, tests or a recorded run. Where something is *not* verified it is listed under **Do not claim** or **Limitations**. When in doubt, use the exact sentences in §14 *Safe portfolio claims*.

Companion files:

- `docs/portfolio/DEMO_INTEGRATION_SPEC.md` — framework-neutral spec (fixture contract, states, tokens, motion, layout, accessibility).
- `src/demo/fixture/harbor-point-deck.json` — the synthetic demo deck.
- `docs/portfolio/media/` — 9 curated screenshots (§17).
- `FLASH_V2_HANDOFF.md` — the full engineering record, F0 → F6 (§1–§37).

---

## 1. Product

Flashcard Maker turns a PDF into a study deck whose every card stays tied to where it came from. You upload a PDF; the app reads its structure (pages, words, table-of-contents sections with their real page ranges) without any AI, proposes how many cards to write per section, and then a language model writes a study outline and question/answer cards section by section. Each card keeps its section, an exact source page when one can be proven (or an honest "page unknown"), and the source excerpt it was written from. You study the deck as a **Flip Drill** (question → reveal → answer + source), as **Multiple Choice** (with the source shown after you answer), or jump around with a searchable **table of contents**; you can also view the study outline and print double-sided cards.

Two repositories: an Expo / React Native app (`mitcherrman/flash_ui`, runs on web; iOS/Android builds bundle) and a Django REST Framework API (`mitcherrman/flashcard_django`).

## 2. Problem

Generated flashcards are only as useful as they are checkable. A card that says "Page 5" when the fact is on page 3, or that shows the answer-bearing excerpt before you've tried to recall it, teaches the wrong habit. Flashcard Maker's job is: **structure first, honest provenance, then study** — sections come from the document's own outline, page numbers are shown only when the text proves them, and the source appears after you commit to an answer.

## 3. Ownership (facts — wording needs owner approval, §21)

| Period | Evidence | Who |
|---|---|---|
| Original product (to 2025-11-10) | Frontend `master` 34 commits: 33 by `mitcherrman`, 1 by `andreijsecor` (a 3-line config change). Backend `main` 27 commits: 22 by `mitcherrman`, 5 by `andreijsecor` (small config/cleanup changes) | Built by the repository owner (`mitcherrman`), with small contributions from one collaborator |
| V2 modernization F0–F6 (2026-10-06 → 2026-10-07) | Frontend branches `flashv2/f0…f6`, backend `flashv2/f05…f5`; every V2 commit is authored by the owner's machine identity and carries a `Co-Authored-By: Claude` trailer | Owner-directed modernization, implemented in AI-assisted sessions under phase-by-phase owner briefs |

What the V2 modernization changed is in §9 (Before → after).

## 4. User flow (real product)

1. **Source** — pick a PDF (web: file dialog, PDF only; a non-PDF is rejected before any upload).
2. **Analysis** (`POST /analyze/`, no AI) — pages, words, TOC sections with real page ranges, a recommended card count and range, and a per-section allocation.
3. **Structure & plan** — the Upload screen shows the structure and a per-section plan (0–8 cards per section, 3–30 total) with Reset to recommendation; edits lock the total to the sum.
4. **Generation** (`POST /generate/`) — one request: the server writes a study template (one model call per section) and cards per section (batches of ≤ 3, top-up, a "Mixed topics" catch-up), grounds each card's page, de-duplicates, orders the cards and saves the deck. The Build screen shows honest indeterminate progress, elapsed time and Cancel; partial results say "6 of 9 cards created".
5. **Study** — the Picker (deck home) checks the deck still exists, then Flip Drill, Multiple Choice, table of contents, study template, printable cards.

The offline demo shows step 5 (and a read-only view of steps 1–3) from a pre-built deck.

## 5. Architecture

```
                         ┌──────────────── frontend: Expo / React Native (web via react-native-web) ─────────────────┐
  PDF ─▶ Upload screen ──┼─ POST /analyze/ ─┐                                                                          │
         (plan editor)   │                  │      Build screen ─ POST /generate/ (abortable) ─┐                       │
                         │                  │                                                  │                       │
                         │   Picker ─ GET /toc/ (deck check) ─┐   study screens ◀── deckSource seam ◀── useDeck hooks  │
                         │   Flip Drill · Multiple Choice · Contents · Study template · printable HTML                 │
                         │   local cache: AsyncStorage (localStorage on web), cache v3: resume entry, template, 6 h    │
                         │   hand/toc cache. PORTFOLIO DEMO: deckSource ← bundled fixture JSON (no network, no storage)│
                         └───────────────┬─────────────────────────────────────────────────────────────────────────────┘
                                         │ HTTPS/HTTP JSON + multipart; deck addressed by opaque public id
┌──────────────────────── backend: Django 5.2 + DRF ────────────────────────────────────────────────────────────────────┐
│ throttles (per-IP scopes, daily generation budget) → upload validation (size while receiving, type, %PDF- signature,  │
│ opens as PDF, not encrypted, page limit, has text) → private temp copy (always removed)                                │
│  analyze:  PyMuPDF → pages, words, TOC → sections + real ranges → recommendation + allocation        (no model)        │
│  generate: TOC-aware extraction → study template (OpenAI, 1 call/section) → per-section card jobs (OpenAI) →          │
│            page grounding (excerpt found on a page in the section's range, else null) → dedup → document order →      │
│            ordinals 1..N → SQLite (Deck with 22-char public id, Card rows)                                             │
│  hand / toc: cards in document order by public id (404 unknown, 200 [] empty)        errors: {detail, code}           │
└─────────────────────────────────────────────── OpenAI Chat Completions (gpt-4o-mini), server-side key only ───────────┘
```

**Diagram spec (verified boxes and edges, for a visual):**

| # | Box | Edge to | Label / boundary |
|---|---|---|---|
| 1 | PDF (user) | 2 | multipart upload |
| 2 | Django / DRF API | 3 | validated upload (limits 20 MB / 200 pages by default) |
| 3 | PyMuPDF analysis | 4 | no model call |
| 4 | Sections · pages · recommendation | 1→7 (UI) and 5 | shown in the plan editor; plan sent back with generate |
| 5 | Generation pipeline | 6 | **OpenAI boundary**: template + cards only; key server-side, never in the app bundle |
| 6 | Cards + provenance + template | 7 | page grounding, ordinals, dedup |
| 7 | SQLite | 8 | Deck (public id) + Card |
| 8 | REST API (hand / toc) | 9 | **opaque public deck id** (22 chars); integer ids are 404 |
| 9 | Expo / React Native app | 10 | **local cache** (resume, template, hand/toc 6 h) |
| 10 | Picker → Flip Drill / Multiple Choice / Contents / Template | — | |
| P | **Portfolio fixture path** | 10 | `harbor-point-deck.json` → demo deck source → the same study screens; nothing to boxes 2–8 |

Do not add boxes for queues, workers, Redis, Celery, Docker, CDN, auth or a production host — none exist.

## 6. Engineering challenges (strongest, verified)

1. **Page provenance that is right, or honestly unknown.** The original templater replaced real TOC ranges with an even split (1–4 / 5 / 6 became 1–2 / 3–4 / 5–6), so cards got wrong pages and one section was generated from its neighbour's text. Fixed so analysis ranges are authoritative, each section's model input contains only its own pages (asserted against the fake model's request log), and a card's page is the page where its excerpt is found verbatim inside its section's range — single-page sections use their page, otherwise `null`. The model's echoed page is never trusted.
2. **Source-after-answer study design without leaking the answer.** The excerpt usually contains the answer. It is now not rendered before reveal (not in the DOM), card changes snap to the question side instead of animating back through the next card's answer, and Multiple Choice shows the source only after an answer.
3. **Request lifecycles that can't strand the user.** Build used to say "Uploading…" forever and navigate the user back to a deck after they had left; Multiple Choice skipped a card if Next was pressed during auto-advance; TOC jumps grew the navigation stack (12 routes after 5 jumps in the real router). Each was reproduced in a test first, then fixed (run tokens + abort, a single-timer reducer with step tokens, `POP_TO`).
4. **One study UI across phone, short landscape, tablet and desktop.** A pure, unit-tested layout classifier from window geometry (never hover/touch detection) drives four compositions; cards grow to fit text instead of truncating; controls stay pinned and hit-testable at every size.
5. **A backend safe to expose.** Settings from the environment that refuse to start insecurely, server-side PDF validation before any work, per-IP throttles plus a server-wide daily generation budget, opaque deck ids instead of enumerable integers, explicit 404 vs empty, and `{detail, code}` errors without paths or tracebacks.
6. **A portfolio demo that is the real product, offline.** The study screens read data through one seam; the demo build swaps in a fixture produced by the real backend pipeline, blocks the network, and is excluded from normal builds — including a fix for a Metro cache issue that could have shipped the demo as the app (§9, F6).

## 7. Key decisions

| Decision | What and why |
|---|---|
| Source correctness before presentation | F0.5 fixed page ranges, section input slicing and ordinals before any visual work, because the redesign's story depended on them |
| Honest page provenance | Exact page only when the excerpt is found on it; multi-page sections otherwise get `null` and the UI says "Page unknown · Section covers pages 3–4"; never "page 1" |
| Allocation plan semantics | The frontend mirrors the backend's allocation rule exactly (17 cases frozen from executing the backend's own code); the plan total always equals the sum; caps (8/section, 30 total) are visible |
| Stale-request cancellation | Every analyze/build request is tied to a run that leaving the screen cancels; late results are ignored even if fetch ignores the abort |
| Responsive study architecture | Layout class from window geometry only; four tested compositions; no truncation |
| Opaque deck access | 128-bit public ids; integer ids refused; anyone with the id can read the deck (unlisted-link model, no accounts) |
| Safe anonymous demo hardening | Fail-closed settings, upload validation, throttles + daily budget, CORS allowlist, JSON errors |
| Offline portfolio demo via the data seam | Not a fork: the same screens over a fixture; a separate build flag; network blocked |
| No web URL routing | Build's route params contain the PDF data; deck ids are bearer tokens; the demo doesn't need it (§20) |

## 8. The offline demo (what the portfolio shows)

- **Content:** "Harbor Point Microgrid: Operations Brief", a fictional 6-page PDF written for the demo (`docs/portfolio/fixture/harbor-point-operations-brief.pdf`). 4 TOC sections (pages 1–2, 3–4, 5, 6), 10 cards, 23 study-template points.
- **How it was made:** `docs/portfolio/fixture/build_fixture.py` runs the certified backend's real `analyze → generate → hand/toc` in-process with the model replaced by a scripted stand-in (hand-written card text) and HTTP blocked. So the **card text is hand-written**, while **pages, ranges, ordinals and order are computed by the backend**: pages `1, 2, 2, 3, 3, 5, 5, 6, 6, null`. Card 10's excerpt is deliberately a paraphrase in a two-page section, so the real grounding rule leaves its page unknown — the demo shows that honesty.
- **What it runs:** the product's real Picker, Flip Drill, Multiple Choice, Contents and Study template, plus a demo source screen (document → structure → cards, with one excerpt highlighted on its page).
- **Build:** `npm run export:demo` → `dist/demo/` (static, relative paths). See §16.

## 9. Before → after (verified, F0 → F6)

| Area | Before (F0 audit, reproduced) | After |
|---|---|---|
| Fresh clone | Web export failed: `src/config.js` imported a gitignored file | Clean clone → `npm ci` → web/Android/iOS exports succeed (re-verified at the F6 SHA) |
| Backend install | `tiktoken` pin couldn't install on Python 3.14; dead modules | Dead code and unused requirements removed; Django 5.2 LTS; clean install verified |
| Section page ranges | Real TOC 1–4 / 5 / 6 overwritten to 1–2 / 3–4 / 5–6 | Real ranges kept end to end; section input contains only its own pages |
| Card pages | Wrong pages; fabricated `page = 1` for catch-up cards | Grounded exact page, or `null` shown as "Page unknown" |
| Card ordinals | Always 0 | Dense 1..N, equal to TOC order |
| Upload controls | "Reset to recommendation" did nothing; coverage chips were inert; plan total could disagree with the sum | Working reset; inert controls removed; sum = total; caps visible |
| Build | Stuck on "Uploading…"; leaving still navigated later | Honest working state with elapsed time and Cancel; leaving aborts; partial builds explicit |
| Web dialogs | `Alert.alert` is a no-op on web: warnings and errors vanished | Cross-platform dialog/notice; warnings shown in-page |
| Flip Drill | Excerpt (with the answer) visible before flipping; answer flashed on card change | Source after reveal; answer not in the DOM before reveal; snap to question |
| Multiple Choice | Next during auto-advance skipped a card; no source context; modes labelled "1"/"2" | One advance per answer (tested); source after answering; Practice / Keep score |
| Contents | Every jump pushed a screen (12 routes after 5 jumps); Template opened two modals | Bounded stack (`POP_TO`); one template sheet per screen |
| Missing deck | Infinite spinner / "No cards." / empty list | Explicit missing (404) vs empty states with recovery actions |
| Layout | Landscape Flip Drill covered by the template bar; truncated MC questions; hover-based desktop detection | Four geometry-based layouts; no truncation; no horizontal overflow at 5 verified viewports |
| Keyboard | None | Space/Enter flip, ←/→, 1–4, Escape; visible focus ring |
| Backend security | Hard-coded secret, DEBUG on, `ALLOWED_HOSTS=*`, CORS `*`, unlimited anonymous generation, no upload limits, sequential deck ids, `200 []` for missing decks, temp paths in errors | Env-driven fail-closed settings, CORS allowlist, upload validation + limits, throttles + daily budget, opaque ids, 404 vs empty, `{detail, code}` errors |
| Expo Doctor | 16/18 | 18/18 |
| Tests | 0 frontend, 0 backend | 234 frontend, 86 backend |
| Web bundle | 1.67 MB (841 modules) | 0.90 MB (531 modules) after removing unused native packages (F5) |
| Accessibility (web, F6) | React Native Web ignored `accessibilityState`: radios had no `aria-checked`, the flip card no `aria-expanded`; list semantics broken; Lighthouse a11y 93 | `aria-*` states exposed, lists/groups fixed, dialog named, focus returns from the Picker's template; Lighthouse a11y 100 |
| Portfolio | Nothing showable without a backend and an OpenAI key | Offline demo of the real screens, a synthetic deck, this package |

## 10. Testing and verification (final numbers)

| Check | Result |
|---|---|
| Frontend `npm test` (Node's built-in runner, no extra dependencies) | **234 / 234** (208 through F5 + 26 F6) |
| Backend `manage.py test flashcards` (fake model, synthetic PDFs, no network) | **86 / 86** at certified SHA `9b9239d` (clean venv, Python 3.14.7) |
| Backend `check` / `makemigrations --check` / `check --deploy` | clean / no drift / only W004 + W008 (HTTPS is the host's job) |
| Expo exports (web / Android / iOS) | all succeed (web 531 modules app, 523 demo; Android 886; iOS 884) |
| Expo Doctor | 18/18 |
| Fresh clone from GitHub at `3bea26a` | `npm ci`, 234/234, web / demo / Android / iOS exports, Expo Doctor 18/18; demo bundle byte-identical to the verified one |
| Demo walk, headless Edge, real input events | 5 viewports × 9 states: no overflow, required controls in view and clickable; 3 static requests, 0 console messages, 0 storage keys |
| API smoke against the certified backend + local fake model | analyze, full and partial generate, invalid/oversized uploads, missing/empty deck, throttling, opaque ids, no integer enumeration — all as designed (§19) |
| Lighthouse 12.8.2 (local, headless Edge 154) | demo: Accessibility 100, Best Practices 100, Performance desktop 99–100, mobile 79 (no compression) / 98 (gzip) |

Frontend test areas: design-token contrast; allocation mirror of the backend; build lifecycle races; deck states, cache and ids; provenance and source reveal; MC reducer and timer; navigation through React Navigation's real router; printable duplex order; responsive geometry; keyboard guards; F6 fixture validity, demo isolation, no network, web ARIA states. Backend test areas: pipeline page grounding, upload validation, access/ids, throttling, generation outcomes and errors, settings safety.

## 11. Tech stack (actual)

- **Frontend:** Expo SDK 53, React 19, React Native 0.79, react-native-web 0.20, React Navigation 7 (native-stack), AsyncStorage, expo-document-picker, expo-print / expo-sharing / expo-file-system (native export), expo-haptics, @react-native-community/slider (native only). Plain JavaScript; tests with Node's built-in test runner.
- **Backend:** Python (verified on 3.14), Django 5.2 LTS, Django REST Framework 3.17, django-cors-headers, PyMuPDF 1.26 (PDF text, outline, pages), OpenAI Python SDK 1.96 (Chat Completions, `gpt-4o-mini`, JSON mode), python-decouple, SQLite.
- **Not used:** TypeScript sources, Redux, Tailwind, Celery/Redis, Docker, Postgres, CI, any hosting platform, OCR.

## 12. Current limitations (do not hide)

- **No deployment.** Nothing is publicly hosted; there is no CI, container or production database. The default branches (`master`, `main`) do **not** contain the V2 work; it lives on unmerged `flashv2/*` branches.
- **Native apps not run on a device.** Android and iOS builds bundle successfully; nothing has been run on a phone, emulator or simulator.
- **Real generation needs the backend and an OpenAI key**; card quality, latency and cost with the real model were not measured in V2. The demo uses a pre-built deck.
- Generation is synchronous (one long request); a client that leaves doesn't stop server work.
- Throttles are per process by default; the daily generation budget is the real cost ceiling. SQLite means one host.
- Deck access is "anyone with the id" (no accounts).
- Page grounding needs a verbatim excerpt; paraphrased excerpts in multi-page sections show "Page unknown" by design. Nested TOC levels are flattened; duplicate TOC titles merge; long sections are trimmed.
- PDF only; no OCR (scanned PDFs are rejected as having no text); no DOCX/TXT.
- Accessibility residue (web): the "Show source excerpt" switch is a 40×20 native control (passes WCAG 2.2 AA target size by spacing, below the project's 44 px goal); axe reports `label-content-name-mismatch` (accessible names like "Option B: …" vs visible "B …"), `region` (no landmarks) and `scrollable-region-focusable` (template sheet) — none affect the Lighthouse score.
- Lighthouse mobile performance depends on hosting compression (79 → 98).
- The web app has no URL routing (browser Back leaves the app).

## 13. Claim matrix

| Claim | Evidence | Status |
|---|---|---|
| React Native + Expo frontend | `package.json` (Expo ~53, RN 0.79.6) | VERIFIED |
| Runs on the web via React Native Web | web export + headless walks; react-native-web 0.20 | VERIFIED |
| iOS/Android builds bundle | `expo export --platform android/ios` exit 0 | VERIFIED (build only) |
| Tested on iOS/Android devices | none | DO NOT CLAIM |
| Django / Django REST Framework backend | `requirements.txt`, `flashcards/views.py` | VERIFIED |
| PyMuPDF document analysis (pages, words, outline sections) | `flashcards/ai/analysis.py`; analyze responses | VERIFIED |
| Analysis uses no AI | analyze path makes no model call (tests; stub call count 0) | VERIFIED |
| AI-generated cards and study outline (OpenAI `gpt-4o-mini`) | `flashcard_gen.py`, `templater.py` | VERIFIED (capability; not run against OpenAI in V2) |
| Section-aware generation with a per-section plan | `views._generation_plan`, `core.cards_from_document`; tests | VERIFIED |
| Exact or honestly unknown page provenance | `core._grounded_page`; pipeline tests; fixture | VERIFIED |
| Flip Drill, Multiple Choice, searchable table of contents, study outline | screens + tests + walks | VERIFIED |
| Printable double-sided cards (HTML) | `src/study/printable.js` + tests; physical print untested | VERIFIED (generation); duplex print DO NOT CLAIM as physically tested |
| Responsive web layouts (phone, landscape, tablet, desktop) | layout tests; 5-viewport walks | VERIFIED |
| Keyboard support and visible focus (web) | shortcut tests; keyboard walk | VERIFIED |
| Lighthouse accessibility 100 (demo) | Lighthouse 12.8.2 runs, §18 | VERIFIED (local measurement) |
| API hardening: upload validation, throttling, daily budget, opaque ids, env settings | backend tests + F6 smoke | VERIFIED |
| Automated tests: 234 frontend, 86 backend | test runs at the final SHAs | VERIFIED |
| Synthetic tests (no network, fake model, synthetic PDFs) | `fakes.py`, httpx patched | VERIFIED |
| Offline portfolio demo with no network requests | network log; fetch guard; tests | VERIFIED |
| Production users / user count | none | DO NOT CLAIM |
| Revenue / customers | none | DO NOT CLAIM |
| Deployed / production scale / uptime | no deployment | DO NOT CLAIM |
| AI accuracy percentage or quality metric | never measured | DO NOT CLAIM |
| Enterprise security / compliance | small-demo threat model only | DO NOT CLAIM |
| Multi-tenant privacy / user accounts | no accounts; id = access | DO NOT CLAIM |
| OCR, DOCX, TXT support | PDF only, no OCR | DO NOT CLAIM |
| Spaced repetition / adaptive learning | absent | DO NOT CLAIM |
| Real-time progress of generation | indeterminate by design | DO NOT CLAIM |
| "Built solo, from scratch" for V2 without qualification | V2 commits are AI-assisted (co-author trailers); original had a small collaborator contribution | DO NOT CLAIM (owner to word; §21) |

## 14. Safe portfolio claims (use as written)

- "Flashcard Maker turns a PDF into a study deck in which every card keeps its section, its source excerpt and — when the text proves it — its exact page."
- "Document structure comes from the PDF itself (PyMuPDF, no AI): pages, words and table-of-contents sections with their real page ranges."
- "Cards are written by a language model section by section, then the pipeline grounds each card's page against the source text; when it can't, the app says 'page unknown' instead of guessing."
- "Study modes: a flip drill that reveals the source only after you answer, multiple choice with model-written distractors, and a searchable table of contents."
- "Built with Expo / React Native (web via React Native Web) and a Django REST Framework API; 234 frontend and 86 backend automated tests, run without network access."
- "Hardened for a small public demo: server-side PDF validation, per-IP throttling with a daily generation budget, opaque deck links and environment-driven settings."
- "The embedded demo runs the real study screens over a synthetic deck, fully offline."

## 15. Do not claim

Production deployment, users, revenue, scale or uptime; AI accuracy figures; enterprise security; multi-tenant privacy or accounts; native device testing; OCR, DOCX or TXT support; spaced repetition; live AI generation in the demo; "10x", "revolutionary", "enterprise-grade", "production-scale"; that the V2 work is merged into the default branches.

## 16. Demo integration

- **Embed (recommended):** `npm ci && npm run export:demo` in the frontend repo at the final SHA → upload `dist/demo/` to any static host or a sub-path of the portfolio (relative asset paths), serve with gzip/brotli, show it in an `<iframe title="Flashcard Maker offline demo">` with an explicit height (≈ `min(860px, 90vh)`) on desktop, and a full-screen link on phones. Hosting it is an owner decision (§21).
- **Recreate:** read `src/demo/fixture/harbor-point-deck.json` and follow `docs/portfolio/DEMO_INTEGRATION_SPEC.md` (states, provenance wording, tokens, motion, layout, accessibility). No backend needed.
- **Important:** if both a normal and a demo build are made on one machine, use the provided script for the demo; the repo's `metro.config.js` keeps their caches apart.

## 17. Media manifest (`docs/portfolio/media/`, all from the real UI, synthetic data, 2× pixel density)

| File | Size (px) | Shows |
|---|---|---|
| `flash-demo-source.png` | 2880×1800 | Demo source screen: synthetic document → structure (6 pages, 757 words, 4 sections) → step strip |
| `flash-upload-plan.png` | 2880×1800 | **Real app** (not the demo) after analysing the synthetic PDF through the real backend: source card, structure, recommended 4 cards (range 3–5), section plan |
| `flash-picker-desktop.png` | 2880×1800 | Deck home: deck name, 10 cards, Flip Drill / Multiple Choice, deck tools |
| `flash-flip-question.png` | 2880×1800 | Flip Drill, question side, card 4; source panel shows section + page, excerpt withheld |
| `flash-flip-source.png` | 2880×1800 | Same card revealed: answer + "Page 3 · concept" + the verbatim source excerpt |
| `flash-mc-source.png` | 2880×1800 | Multiple Choice after a wrong answer: ✗ your answer, ✓ correct answer, status line, source (Page 5) |
| `flash-toc.png` | 2880×1800 | Table of contents opened from card 10: current card marked, "Page unknown" in italic, document order |
| `flash-template.png` | 2880×1800 | Study template as a centred dialog: real section ranges and Q/A points |
| `flash-mobile.png` | 2241×1575 | Three 390×844 phone screens: question first; answer with "Page unknown · Section covers pages 3–4" and the source; MC answered with source |

## 18. Lighthouse (honest measurement)

Lighthouse 12.8.2, headless Microsoft Edge 154, Windows 11, local static server on 127.0.0.1, default simulated throttling. Target: the demo's first screen (`/flash-demo/`), plus the real app's first screen for comparison. Numbers vary run to run; these are repeated runs.

| Target | Server | Perf | A11y | Best practices |
|---|---|---|---|---|
| Demo, desktop | no compression | 99 | 100 | 100 |
| Demo, desktop | gzip | 100 | 100 | 100 |
| Demo, mobile | no compression | 79 (3 runs; one outlier 71) | 100 | 100 |
| Demo, mobile | gzip | 98 (4 runs) | 100 | 100 |
| Real app (Upload), desktop / mobile | no compression | 99 / 80 | 100 | 100 |
| Demo before the F6 accessibility fixes | no compression | 99 / 79 | **93** | 100 |

Material warnings: `uses-text-compression` (host setting), `unused-javascript` (~411 KiB; one bundle for all screens), `valid-source-maps` (none shipped), `legacy-javascript` (1 KiB). Mobile LCP 5.5 s uncompressed vs 2.3 s gzip. Lighthouse audits only the first screen; the study screens were checked with axe-core 4.14 (§12 residue) and the walks.

## 19. API / security smoke (F6, against the certified backend)

Backend `9b9239d` (git archive, clean venv), `runserver` with DEBUG off, a random secret, host and CORS allowlists, limits lowered (2 MB, 40 pages, generate 4/hour); model = a local stub serving the backend's own `FakeOpenAI` (no OpenAI). Synthetic PDFs only.

| Case | Result |
|---|---|
| Valid analyze | 200: 6 pages, sections 1–4 / 5 / 6 |
| Valid generate | 201: 7 of 7, `partial: false`, 22-character `deck_id` |
| Partial generate (one section returns nothing) | 201: `partial: true`, "Created 5 of 7 requested cards." + section warning |
| Invalid upload (text as PDF; wrong type) | 400 `not_pdf` — **0 model calls** |
| Oversized (3 MB > 2 MB) | 413 `file_too_large`, `limit_mb: 2` |
| Missing deck | 404 `deck_not_found` (hand and toc) |
| Empty deck | 200 `[]` (hand and toc) |
| Throttling | 5th generate in the hour → 429 `throttled`, `Retry-After`, "Try again in about 60 minutes" |
| Integer ids 1, 2, 3 | 404 — no enumeration |
| `/feedback/`, foreign `Host` | 404, 400 — JSON bodies |
| Temp files | 0 `flash-upload-*` / `.chunks.pkl` left |

## 20. Browser history decision

The real app keeps **no web URL routing** (F5 decision, re-confirmed): React Navigation's linking would serialise Build's params (the picked PDF as a data URL and the plan) into the address bar, a reload of Build/TOC can't be rebuilt, and study URLs would put the deck id — an access token — into history and referrers. The demo also leaves the URL untouched (no private data, but no need); a recreation may add `#mode/card` hashes if useful.

## 21. Needs owner approval

1. How to describe authorship and AI assistance for V2 (facts in §3), and whether to credit the original collaborator.
2. Whether and where to host the demo build (F6 did not deploy anything).
3. Whether to merge `flashv2/f6-portfolio-certification` (frontend) and `flashv2/f5-demo-hardening` (backend) into the default branches.
4. Use of the fictional "Harbor Point" document and the screenshots.
5. Whether to link the GitHub repositories (they contain the full engineering record).

## 22. Deployment truth

- No verified production deployment, frontend or backend.
- Frontend default branch `master` = `f60dd52` (pre-V2); backend `main` = `18a6928` (pre-V2). Not merged.
- V2 lives on `flashv2/*` branches; the final ones are listed in §23.
- The demo fixture is portfolio-safe (synthetic) and fully offline.
- Real generation still requires the configured backend and an OpenAI API key.

## 23. Final SHAs

| Repo | Branch | SHA |
|---|---|---|
| Frontend `mitcherrman/flash_ui` | `flashv2/f6-portfolio-certification` | implementation `3bea26a3f7e1e57c966c0bca139426a2337e6073`; the branch head is the documentation commit on top of it (verified fresh clone, `FLASH_V2_HANDOFF.md` §37.12) |
| Backend `mitcherrman/flashcard_django` | `flashv2/f5-demo-hardening` | `9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c` (certified F5, unchanged in F6) |

## 24. Portfolio copy (verified source copy, not final page design)

**One sentence.** Flashcard Maker turns a PDF into a study deck where every card keeps its section, its source excerpt and — when the text proves it — its exact page.

*First-person lines below assume the owner approves the authorship wording (§21).*

**Summary (2–3 sentences).** The app reads a PDF's real structure without AI, lets you plan how many cards each section gets, and has a language model write the cards section by section. The backend then checks each card's page against the source text and says "page unknown" rather than guess, and the study modes show that source only after you've answered. I modernized it end to end — provenance fixes, a rebuilt study experience, responsive layouts, a hardened API and an offline demo — with 234 frontend and 86 backend automated tests.

**Role / ownership.** Product owner and developer of the original app (with small contributions from one collaborator); directed and delivered the V2 modernization across both repositories. *(Owner to finalise the AI-assistance wording, §21.)*

**Engineering highlights.**

1. Fixed source provenance at the root: real TOC page ranges end to end, section-isolated model input, and page grounding that falls back to "unknown" instead of a guess.
2. Source-after-answer study design: excerpts and answers withheld until the learner commits; card changes never flash the next answer.
3. Race-free request lifecycles: cancellable builds, a single-timer multiple-choice reducer, bounded navigation — each bug reproduced in a test before the fix.
4. One study UI for phone, short landscape, tablet and desktop from a tested geometry classifier, with keyboard support and no truncation.
5. A demo-safe API: server-side PDF validation, throttling with a daily cost budget, opaque deck links and fail-closed configuration.
6. An offline portfolio demo that runs the real screens over a synthetic deck whose provenance was computed by the real pipeline.

**Technologies.** Expo · React Native · React Native Web · React Navigation · Django · Django REST Framework · PyMuPDF · OpenAI API · SQLite · Node test runner.

**Challenge → fix story.** The audit found that page numbers — the product's whole promise — were wrong: the templater replaced each section's real page range with an even split, so cards pointed at the wrong pages and one section was even written from its neighbour's text. I made the PDF's own outline authoritative, gave each section only its own pages, and made a card's page something the pipeline has to prove by finding the excerpt on that page; otherwise the app says "page unknown · section covers pages 3–4". Synthetic PDFs with traceable facts on every page now test that end to end.

**Limitations (say them).** Not deployed; native apps build but weren't run on devices; live generation needs the backend and an OpenAI key, and its quality wasn't measured; PDF only, no OCR.
