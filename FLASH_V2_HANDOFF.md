# Flashcard Maker V2 — F0 Baseline Audit & Modernization Handoff

**Workstream:** F0 — baseline audit (investigative only; no product code changed)
**Audit date:** 2026-10-06
**Frontend branch:** `flashv2/f0-baseline` (this file is the only change)

> **F0.5 update:** blockers B1–B4 are fixed on `flashv2/f05-stabilization` in both repos. See **§31 F0.5 Addendum** at the end. Where §1–§30 describe F0.5-fixed behaviour (page ranges, `ordinal = 0`, `src/env.js`, `tiktoken`, `.chunks.pkl`, temp paths in errors, template title), §31 supersedes them.
>
> **F5 update (§36):** the backend is hardened for a small public demo. Deck ids are now opaque public ids (the API's `deck_id` is a string), unknown decks are 404, `/feedback/` is removed, errors are `{detail, code}`, and settings come from the environment. Where §1–§35 describe the API, configuration or dependencies differently, §36 supersedes them.
>
> **F6 update (§37):** portfolio extraction and final certification. An offline demo build (`npm run export:demo`) runs the real study screens over a synthetic fixture through the `deckSource` seam; `FLASH_PORTFOLIO_HANDOFF.md` is the portfolio-facing package. F6 also fixed web accessibility states (react-native-web ignores `accessibilityState`) and a Metro cache issue that could reuse demo transforms in a normal build. Modernization is complete; nothing is merged or deployed.

Evidence labels used throughout:

- **VERIFIED**: read in the current source *and/or* observed running locally (curl against the real Django app, or the real Expo web build driven in a headless browser).
- **INFERRED**: strongly implied by the code but not exercised end-to-end, e.g. native-only paths.
- **UNKNOWN**: needs a device, live OpenAI behaviour, or information not in either repository.

---

## 1. Executive summary

Flashcard Maker is a small, working two-repo product:

- **Backend:** a Django/DRF API, about 1.9k lines of Python.
- **Frontend:** an Expo/React Native app, about 3.4k lines of JS, that runs on web and (by design) on iOS and Android.

The core loop works end-to-end:

> PDF → no-LLM analysis (pages, words, TOC sections, recommended count, per-section plan) → LLM study template + section-aware card generation → persisted deck → Flip Drill, Multiple Choice, TOC jump and printable export.

I confirmed this locally against the real backend. A local mock of the OpenAI endpoint stood in for the model, so no OpenAI calls were made.

**Strongest assets.** The 3D flip card with swipe navigation, and the per-card **section / page / context / source-excerpt** panel. Together they carry the "source-aware" story. Multiple Choice with model-generated distractors (with local fallback) and TOC search/jump are solid underneath. Visually they are the weakest part.

**Main problems, in order of importance:**

1. **The source metadata is partly wrong** (VERIFIED end-to-end).
   - The templater throws away real TOC page ranges and replaces them with *evenly divided* ranges.
   - Cards therefore get wrong page numbers, and some sections are generated from a *neighbouring* section's text.
   - This undermines the "SOURCE → STRUCTURE" story the redesign wants to tell.
2. **A fresh clone cannot build** (VERIFIED). `src/config.js` imports the gitignored `src/env.js`.
3. **The backend can't install on this machine's Python 3.14** (VERIFIED). `tiktoken==0.7.0` needs a Rust compiler, and it is only used by dead code.
4. **On web, which is the portfolio surface, every `Alert.alert` does nothing** (VERIFIED). Generation warnings, export failures and confirmations all disappear silently.
5. **There are many UX defects in screens slated for redesign** (all VERIFIED live):
   - "Reset to recommendation" does nothing.
   - The coverage chips do nothing.
   - The build screen never leaves "Uploading…".
   - Leaving a build via Home yanks you back to the Picker when it finishes.
   - Multiple Choice skips a card if you press Next during its auto-advance.
   - TOC jumps keep pushing screens onto the stack.
   - The TOC "Template" button opens two modals.
   - The web landscape layout pushes Flip Drill controls off-screen.
   - "Game 1" is a dead-end placeholder.
6. **Demo-unsafe configuration** (VERIFIED):
   - hard-coded `SECRET_KEY`, `DEBUG` on by default, `ALLOWED_HOSTS=["*"]`, CORS open to all origins;
   - unauthenticated, unlimited OpenAI-backed `/generate/`;
   - no upload size or type limits;
   - SQLite;
   - zero tests.

**No production deployment can be proven** from either repository.

**Recommendation:** run a **small F0.5 stabilization** (env fallback, Python/requirements install fix, page-range fix, minimal backend contract tests) before F1. Then proceed F1 → F2 → F3 → F4, with F5 hardening and F6 portfolio extraction. The best portfolio proof is a **fixture-driven Flip Drill + Multiple Choice + TOC jump**, with no backend and no OpenAI.

---

## 2. Audited frontend SHA

| Item | Value |
|---|---|
| Repo | `mitcherrman/flash_ui` |
| Branch | `flashv2/f0-baseline` (worktree `C:\Users\mlmit\OneDrive\Desktop\flash-v2-f0`) |
| Base | `master` |
| Audited SHA | `f60dd524882bf0a4ad26eab03350d1ec2aba756e`. Matches expected; `HEAD == origin/master`. |
| Source checkout | `C:\Users\mlmit\OneDrive\Desktop\flash_ui` on `master`, clean, same SHA |
| Last commit | 2025-11-03 "allowed local api config via env.js" (34 commits total) |

## 3. Audited backend SHA

| Item | Value |
|---|---|
| Repo | `mitcherrman/flashcard_django` |
| Branch | `main` |
| Audited SHA | `18a69289c7d34869fa6a141ec10210e3cc3835d0`. Matches expected; `HEAD == origin/main`. |
| Checkout | `C:\Users\mlmit\OneDrive\Desktop\flashcard_django`, clean, **not modified** |
| Last commit | 2025-11-10 "remove admin url for now" (27 commits total) |

Other remote branches exist but were not audited (out of scope):

- frontend: `celery-redis`, `game4`, `game4Ethan`
- backend: `Mogsy`, `celery-redis`, `feature/added_database`

---

## 4. Verified current product contract

| Capability | Status | Notes |
|---|---|---|
| PDF upload (picker limited to `application/pdf`) | VERIFIED | `UploadScreen.js:37-40` |
| Instant no-LLM analysis | VERIFIED | Returns pages, words, words/page, TOC sections, recommended count, range, per-section plan. |
| Card count 3–30 | VERIFIED | Slider in UI; clamped by the backend (`views.py:126,141`). |
| Per-section allocation | VERIFIED | Only when the PDF has a TOC. UI allows 0–30 per section; backend silently caps each at 8. |
| LLM study template | VERIFIED | `gpt-4o-mini`; 5–6 Q:A bullets per section. Shown in two places: the Template modal and the Picker's "View study template". |
| Section-aware card generation | VERIFIED | Concurrent per-section jobs, top-up pass, global catch-up pass, dedup by `card_key`. |
| Model-generated distractors (0–3/card) + local fallback | VERIFIED | |
| Persisted Deck / Card | VERIFIED | Card fields: front, back, excerpt, context, page, section, right/wrong, distractors, card_key, ordinal. |
| Study modes | VERIFIED | **Flip Drill** (picker label "Game 2 — Mastery") and **Multiple Choice** (with "Endless" scoring toggle). "Game 1 — Curate" is a placeholder. |
| TOC with search and jump-to-card | VERIFIED | |
| Template modal | VERIFIED | Bottom bar in Flip Drill; header button in TOC. |
| Resume last deck (AsyncStorage) | VERIFIED | |
| Printable HTML export | VERIFIED on web | Native PDF export/share is INFERRED. |
| Right/wrong feedback to the server | **Not wired** | `/feedback/` exists but the frontend never calls it, and anonymous calls get 403. |
| DOCX / TXT / OCR | **Not a product feature** | No picker support, no OCR code path. Backend *happens* to accept any format PyMuPDF opens; a `.txt` was analyzed successfully. |
| Spaced repetition, accounts, auth | **Absent** | |

---

## 5. Frontend architecture

**Stack** (`package.json`, VERIFIED):

- Expo SDK `~53.0.20`, React 19.0.0, React Native 0.79.5, react-native-web 0.20, New Architecture on (`app.json`).
- Navigation: `@react-navigation/native` + `native-stack` 7.x.
- Other: `@react-native-community/slider`, `expo-document-picker`, `expo-linear-gradient`, `expo-haptics`, `expo-print`, `expo-sharing`, `expo-file-system`, `@react-native-async-storage/async-storage`.
- `react-native-gesture-handler` and `react-native-reanimated` are installed but **unused**. Gestures use RN `PanResponder`; animation uses RN `Animated`.
- `expo-constants` is imported by `src/config.js` but **not declared** in `package.json` (it resolves as a transitive dependency).
- No scripts for lint, test or typecheck. No ESLint config. `tsconfig.json` exists but there are **no TS files**.

**Entry and navigation:**

- `index.js` → `App.js` → `NavigationContainer` → `src/navigation/Stack.js`.
- Native stack, `headerShown: false`, `slide_from_right`. No deep-linking config, so every web screen lives at `/`.

```
Upload ─► Build ─(reset)─► Picker ─► Game1 (stub)
  ▲                           ├─► Game2 = FlipDrill + TemplateBar
  └──── resume card ──────────┤      └─► TOC ─► Game2 (push)
                              ├─► GameMC ─► TOC ─► GameMC (push)
                              └─► TOC ─► Game2 (push)
```

**Screens and components:**

| File | Role | LOC |
|---|---|---|
| `src/Screens/UploadScreen.js` | pick, analyze, plan, resume card | 325 |
| `src/Screens/BuildScreen.js` | generate request, loading, error | 201 |
| `src/Screens/GamePicker.js` | mode cards, TOC link, export, template modal, dev cache buttons | 359 |
| `src/Screens/Game1Screen.js` | placeholder "Game 1 coming next 🛠️" | 10 |
| `src/Screens/Game2Screen.js` | wraps `FlipDrill` + `TemplateBar` | 55 |
| `src/Screens/GameMC.js` | Multiple Choice | 362 |
| `src/Screens/TOCScreen.js` | TOC list, search, jump, template button | 231 |
| `src/components/FlipDrill.js` | flip card, swipe, info panel | 415 |
| `src/components/CardShell.js` | card surface + bear watermark | 80 |
| `src/components/TemplateBar.js` | bottom bar + full-screen template modal | 156 |
| `src/utils/cache.js` | AsyncStorage cache | 105 |
| `src/utils/TemplateBus.js` | global "open template" event bus | 18 |
| `src/utils/PickDistractors.js` | fallback distractors + shuffle | 52 |
| `src/utils/exportHTML.js` | printable HTML + save/share | 172 |
| `src/config.js` | `API_BASE` | 60 |
| `src/styles/theme.js` + `styles/**` | partial token set + per-screen StyleSheets | ~650 |

**Styling (VERIFIED):**

- `src/styles/theme.js` defines COLORS, SPACING, RADII, SHADOWS and TYPO, but only 5 style files use it.
- `GameMC.styles.js` redefines its own palette constants.
- `TemplateBar.styles.js` is imported as `s` and **never used**; the component duplicates every style inline.
- TOCScreen, GamePicker's template modal, UploadScreen chips and BuildScreen text all use large inline style objects with raw hex values.
- The palette is UC Berkeley's official colours: Berkeley Blue `#003262` and California Gold `#FDB515`. `GamePicker.js:3` says "Berkeley palette".

**Animation, gesture and haptics (VERIFIED):**

- Flip: RN `Animated.timing` 300 ms rotateY with `backfaceVisibility` (`FlipDrill.js:100-115`).
- Swipe: `PanResponder`, activates past 20 px, triggers past 100 px (`FlipDrill.js:157-169`). Works with a mouse on web (verified).
- Build screen: pulsing 📘 emoji.
- Haptics: `Haptics.selectionAsync()` on flip, prev/next and MC pick. Native only; on web it is INFERRED to be a no-op.
- No reduced-motion handling anywhere.

**Platform branches (VERIFIED):**

- `Platform.OS === "web"` in Upload/Build (FormData `File` vs `{uri}`).
- FlipDrill: info panel hidden on native landscape; Prev/Next absolute on native, relative on web.
- Game2Screen hides the TemplateBar only on native landscape.
- GameMC `isDesktopWeb = web && (width ≥ 1024 || matchMedia('(hover: hover)'))`. A narrow desktop window gets the desktop layout; a touch laptop gets the mobile layout.
- TOC adds Android status-bar padding.

**Magic numbers and brittle layout (VERIFIED):**

- `FlipDrill.js:28-44` `TUNE` block: card aspect 0.60, `BUTTONS_BOTTOM_PORTRAIT: 50`, landscape min height 140, controls height 72.
- `FlipDrill.js:68,73`: max width 900.
- `GameMC.js:36-49`: 1400 / 0.92 / 1000 / 720 / 240 / 0.22 / 110 / 0.12 / 0.6.
- `GamePicker.styles.js:27`: `minWidth: 320`.
- `UploadScreen.js:198`: 96 px gradient header.
- Width `"92%"` and `"90%"` scattered throughout.
- Two Card counters use `position:absolute` centring hacks.
- `Game2Screen` passes `contentInsetBottom` to FlipDrill, which **ignores it**. `FlipDrill`'s `mode`, `onOpenTOC` and `onGoBack` props are never supplied.

**Screens whose engineering beats their appearance:**

- Upload/analyze (real document structure, shown as a plain list of stock RN `Button`s).
- Flip Drill (good motion, cluttered chrome).
- TOC (fast search and jump, but generic list cards).

---

## 6. Backend architecture

**Project** (`flashsite/`, VERIFIED):

- Django **5.0.4** (pinned; `settings.py` header says it was generated with 5.1.4), DRF 3.16.0, django-cors-headers 4.4.0.
- Single app `flashcards`. `flashsite/urls.py` mounts only `api/flashcards/`; admin is commented out.
- Database: SQLite `db.sqlite3` (`settings.py:107-112`). No Postgres config; `psycopg` is commented out in requirements.

**Models** (`flashcards/models.py`, VERIFIED):

- `Deck(user FK nullable, name, created)`.
- `Card(deck, front, back, excerpt, context[20], page, section[200], right, wrong, distractors JSON, card_key[64] indexed, ordinal indexed)`.
- Unique constraint on `(deck, card_key)`. 11 migrations; `makemigrations --check` reports no drift.

**Serializer:** `CardSerializer` returns id, deck, front, back, excerpt, context, page, section, right, wrong, ordinal, distractors.

**Endpoints** (`flashcards/urls.py`, VERIFIED): `analyze/`, `inspect/` (alias of analyze), `generate/`, `hand/`, `feedback/`, `health/`, `toc/`. Details in §7.

**AI and PDF modules:**

| Module | Used? | Purpose |
|---|---|---|
| `ai/analysis.py` | yes | PyMuPDF stats, TOC → sections, recommendation, allocation |
| `ai/driver.py` | yes | `run_extraction`: TOC-section chunks, or per-page chunks, trimmed to `max(2000, max_tokens*6)` chars |
| `ai/pipeline/templater.py` | yes | LLM study template |
| `ai/pipeline/core.py` | yes | `cards_from_document` orchestration |
| `ai/flashcard_gen.py` | yes | card LLM calls, `build_card_key`, distractor normalization |
| `ai/ingest.py` | **no** | PDF page extractor (dead) |
| `ai/chunker.py` | **no** | tiktoken chunker (dead; the only `tiktoken` user) |
| `ai/prompt_cards.py` | **no** | topic→Anki prototype; imports `genanki` and `fastapi`, which aren't in requirements, so it fails to import |
| `inspect.py` | **no** | empty file |

**Auth and permissions (VERIFIED):**

- DRF defaults: `SessionAuthentication` + `IsAuthenticatedOrReadOnly`.
- `analyze` and `generate` override to `AllowAny`.
- `hand` and `feedback` keep the default, so GET works anonymously and **POST `/feedback/` returns 403 anonymously**.
- `toc` is `AllowAny`; `health` has `[]`.
- No users or login flow exist.

**Configuration:**

- `OPENAI_API_KEY = config("OPENAI_API_KEY")` with **no default**. Django won't even run `manage.py check` without it (VERIFIED).
- `flashcard_gen.py:8` builds an OpenAI client at import time.
- Logging: root at DEBUG to console.
- Temp files: uploads go to `NamedTemporaryFile(delete=False)` and are unlinked in `finally`. The pipeline's `.chunks.pkl` cache is **never deleted** (§9).

**Tests:** `flashcards/tests.py` is empty. `manage.py test` ran 0 tests.

---

## 7. Exact frontend ↔ backend API map

`API_BASE` (`src/config.js:57-60`):

- **web:** `WEB_API_BASE` from gitignored `src/env.js`, falling back to `http://127.0.0.1:8000`.
- **native:** `http://<host of the Metro bundle URL or Expo hostUri>:8000`. Plain HTTP on the LAN, port 8000 hard-coded.

| Frontend action | Frontend file | Method | Endpoint | Request | Response consumed | Errors (frontend) | Backend implementation |
|---|---|---|---|---|---|---|---|
| Pick PDF → auto-analyze | `UploadScreen.js:55-84` | POST multipart | `/api/flashcards/analyze/` | `file` (web: `File` from blob; native: `{uri,name,type}`) | `pages`, `words`, `recommended_cards`, `suggested_range.{lo,hi}`, `per_section_allocation[].{title,page_start,page_end,words,cards}`. Unused: `words_per_page`, `toc_sections`, `sections_count`. | `!ok` → `"HTTP <status> – <150 chars>"` in a red panel; network error → `"TypeError: Failed to fetch"` | `views.analyze` (`views.py:32-59`) → `ai.analysis.analyze_document`. 400 if no file; 500 `analyze failed: <exc>` (leaks server temp path) |
| Upload & Build | `BuildScreen.js:53-135` | POST multipart | `/api/flashcards/generate/` | `file`, `deck_name` (filename minus `.pdf`), `cards_wanted` (3–30), `allocations` (JSON string; sent whenever the analysis had sections) | `deck_id`, `cards_created`, `warnings[]`, `template`. Unused: `requested`, `per_section`. Read but never sent: `metrics.total_ms`. | `!ok` → error card with `detail` (≤400 chars); `warnings` → `Alert.alert` (**no-op on web**) | `views.generate_deck` (`views.py:108-253`) → `cards_from_document`; 201 on success; 500 `Deck build failed: …` |
| Open Flip Drill | `FlipDrill.js:118-154` | GET | `/api/flashcards/hand/?deck_id&n=all&order=doc` | query | `CardSerializer[]` | `!ok` → raw `HTTP n • text` centred; empty array → **infinite "Loading cards…"** | `views.hand` (`views.py:264-295`); unknown deck → `200 []` |
| Open Multiple Choice | `GameMC.js:81-117` | GET | same `hand` query (cache key shared with Flip Drill) | query | `front`, `back`, `distractors`, `id`, `section` | error → `HTTP n`; empty → "No cards." | `views.hand` |
| Export HTML / "Export / Share PDF" / template fallback | `GamePicker.js:134-142` | GET | same `hand` query, **uncached** | query | `front`, `back` (export); `section`, `page` (template rebuild) | `Alert.alert` (no-op on web) | `views.hand` |
| Open TOC | `TOCScreen.js:29-50` | GET | `/api/flashcards/toc/?deck_id` | query | `[{id, ordinal (1-based), front, section, page, context}]` | `HTTP n` text | `views.toc` (`views.py:301-321`) |
| — | — | GET | `/api/flashcards/health/` | — | — | **unused by frontend** | `views.health` → `{"ok": true}` |
| — | — | POST | `/api/flashcards/inspect/` | — | — | **unused** (back-compat alias) | `views.analyze` |
| — | — | POST JSON | `/api/flashcards/feedback/` `{right:[ids], wrong:[ids]}` | — | — | **unused**; anonymous → 403 | `views.feedback` (`views.py:327-337`) |

**Contract mismatches and stale assumptions (VERIFIED):**

- `BuildScreen.js:105` reads `json.metrics.total_ms`. The backend never returns `metrics`, so build time is always the client-measured time.
- `UploadScreen.js:106` reads `s.share`. The backend never returns it; the UI derives share from `words`.
- `hand` documents `start_ordinal` (`views.py:262`) but doesn't implement it. The frontend does jumps client-side.
- **`Card.ordinal` is always 0 in the DB.** The pipeline computes ordinals, but `views.py:193-204` doesn't persist them. Clients must use **array position** (`hand?order=doc`) or the TOC's enumerated `ordinal`. Both use the same ordering (page ASC with nulls last, then id) and agree (verified).
- `coverage` ("Even per-page" / "Cover sections first") goes into Build's route params and is **never read or sent**.

> **Invariant for modernization:** keep these request/response shapes exactly. If F5 changes the backend, it must stay a superset: same field names and types, `order=doc` ordering, and `toc.ordinal` = 1-based doc-order position.

---

## 8. Document analysis pipeline (VERIFIED unless marked)

1. **Picker:** `expo-document-picker` with `type: "application/pdf"`, `copyToCacheDirectory: true`. On web it opens a hidden `<input type=file accept=application/pdf>`.
2. **Upload:** multipart field `file`. No client-side size check, and none on the server either.
3. **Temp file:** the server saves to `NamedTemporaryFile(delete=False, suffix=<original ext>)` and deletes it in `finally`.
4. **Accepted types:** there is no server-side type check. `fitz.open()` picks a parser by suffix. A `.txt` analyzed fine (1 page, 5 words); a corrupt `.pdf` returned 500 with the temp path in `detail`. DOCX, images and EPUB are INFERRED to open the same way. None of this is a supported feature.
5. **Parsing:** PyMuPDF `get_text("text")` per page. Words come from regex `\b[\w\-’']+\b`. No OCR, so scanned PDFs give ≈0 words (INFERRED).
6. **TOC → sections:** `doc.get_toc()` gives `[level, title, page]` for **all levels**. Entries outside 1..pages are dropped; the rest are sorted by page.
   - Each section runs from its page to the next entry's page − 1; the last one runs to the final page.
   - Nested entries therefore become sibling sections. Entries on the same page produce single-page sections that overlap.
7. **Recommendation:**
   - With sections: `base = sections_count`.
   - Without a TOC: `base = round(words/200)`.
   - `recommended = clamp(base, 3, 30)`; `range = clamp(round(rec×0.75)), clamp(round(rec×1.25))` within [3, 30].
   - Observed: 3-section/881-word PDF → 3 (range 3–4). 5-page/1440-word no-TOC PDF → 7 (range 5–9).
8. **Per-section allocation** at the recommended count:
   - 1 card per section first.
   - The remainder goes out by word share (`1 + round(remaining × share)`).
   - The total is then normalised to exactly `recommended` round-robin. That can drive a section to 0 when `recommended < sections` (`analysis.py:76-106`).
9. **No useful TOC:**
   - `toc_sections = []` and `per_section_allocation = []`.
   - The UI hides the plan and sends `cards_wanted` only.
   - The backend splits the total evenly across whatever sections the **LLM** invents.
10. **Frontend plan editing** (`UploadScreen.js:99-165`):
    - The slider redistributes the plan by word share with `Math.round`, so the sum can drift from the displayed total. Example: the audit PDF at total 4 gives 3+1+1 = 5. VERIFIED by code and arithmetic.
    - The per-section inputs allow 0–30, but the backend caps each at 8.
    - When allocations are present, the backend ignores `cards_wanted` and uses `sum(min(alloc, 8))`, clamped to [3, 30].
    - "Reset to recommendation" calls `setCardsWanted(prev => prev)`. That doesn't change state, so **nothing happens** (verified live: `2,1,1` stays `2,1,1`).
    - All-zero allocations → `500 "Model returned zero cards."` (VERIFIED).

---

## 9. Card generation pipeline

**Request handling** (`views.generate_deck`):

- `MAX_PER_SECTION = 8`, `MAX_TOTAL = 30`.
- `total_cards` = sum of clamped allocations, or `cards_wanted`. Clamped to [3, 30]; non-numeric input → 12 (VERIFIED: 1→3, 99→30, "abc"→12).

**Pipeline** (`core.cards_from_document`, VERIFIED with the mock unless marked):

1. **Extraction:** `run_extraction(path, max_tokens=500)`. It calls `analyze_document` again and returns TOC-section chunks `(text≤3000 chars, page_start, title)`, or per-page chunks.
   - Sections with no text are skipped.
   - `_normalize_chunks` keeps `(text, page_start)`.
2. **Chunk cache:** `chunks` is pickled to `<tmpname>.chunks.pkl` next to the temp upload and **never removed**. 11 generate calls left 11 files in `%TEMP%`.
3. **Template** (`templater.build_template_from_chunks`):
   - Calls `run_extraction` **again** (`max_tokens=600`).
   - **One LLM call per extracted chunk**, max 6 concurrent: `gpt-4o-mini`, `temperature=0.2`, `max_tokens=1400`, `response_format=json_object`.
   - Each call asks for sections of "exactly 5–6" Q:A bullets. TOC titles are forced via `section_hint`.
   - Sections with fewer than 5 bullets are **dropped**. Duplicate titles are merged (max 6 bullets).
   - Measured: 3-section PDF → 3 template calls; 5-page no-TOC PDF → **5** template calls. Template calls grow with **TOC sections or pages, not with cards requested**.
4. **⚠ Page-range bug (VERIFIED end-to-end):**
   - The templater sets `page_start` from the chunk and `page_end = None` (`templater.py:229-230`).
   - `_template_from_sections` then replaces **both** with an even split of the page count (`templater.py:280-284`).
   - Real TOC 1–4 / 5 / 6 became 1–2 / 3–4 / 5–6.
   - Effects:
     - **Card `page` is wrong**: Photosynthesis cards show p.3 instead of p.5; Cellular Respiration shows p.5 instead of p.6.
     - The template modal shows wrong page ranges.
     - **Section text is mis-sourced**: the "Cellular Respiration" job received the *Photosynthesis* page text, and the "Photosynthesis" job got no page text at all, only seed Q:A lines.
5. **Targets:** from `sections_plan` (matched by normalised title), or an even split of `total_cards`, each capped at `max_cards_per_section`. Allocation titles that don't match any template section are ignored (unknown title → 500 "zero cards", VERIFIED).
6. **Section jobs:** `ThreadPoolExecutor(max_workers=min(4, jobs))`.
   - Text = section page slice + `SEED QA LINES` from the template, ≤24,000 chars.
   - `cards_from_chunk` asks in **batches of ≤3**. An empty batch triggers up to 3 single-card retries.
   - **Top-up:** one extra `cards_from_chunk` if the section came up short.
7. **Card prompt** (`flashcard_gen.SYSTEM_PROMPT`):
   - Atomic cards; front ≤20 words; back ≤25 words.
   - 3 distractors; excerpt ≤80 words.
   - `context` ∈ {definition, concept, process, example, comparison, timeline, formula, other}; integer `page`; exact `section`.
   - `gpt-4o-mini`, `temperature 0.2`, `max_tokens 1400`, JSON mode, strict parse then brace-salvage.
8. **Normalisation:**
   - Distractors: trimmed, deduped, anything equal to the answer removed, max 3. The mock's third distractor equalled the answer → 2 kept.
   - `page` defaults to the (even-split) section start.
   - `section` set via `setdefault`.
9. **Dedup and order:** sections in template order. `card_key = sha1(normalised "front || back")[:40]`, dropping repeats. `ordinal = sec_index×10000 + k` (in memory only).
10. **Global catch-up:** if short of `total_cards`, one call over all template seed lines, labelled `section="Mixed topics"`, `page=1`. These cards sort first in doc order because page=1.
11. **Truncation:** `cards[:total_cards]` in section order. If more is requested than 30 (e.g. 5 sections × 8), **trailing sections are cut entirely** (VERIFIED by code).
12. **Persistence:** `bulk_create(ignore_conflicts=True)`; excerpt ≤500 chars, context ≤20 chars; **ordinal not saved**.
13. **Warnings:** only for allocation titles where `created < planned`, matched by **exact** section string. LLM-altered section names or "Mixed topics" cards make warnings misleading (INFERRED).
14. **Response:** `{deck_id, template, cards_created, requested, warnings, per_section}`. The `template.title` is the **server temp-file stem** (e.g. `tmpgy0tbwcp`), which the UI shows as the template title (VERIFIED live).

**LLM call budget (VERIFIED):** 3-section / 8-card → **7 calls**; 5-page / 7-card → **8 calls**.

- Worst case ≈ `#TOC sections or pages` + Σ⌈target/3⌉ + top-ups + catch-up + retries.
- No ceiling on page count, so a 300-page PDF without a TOC means ~300 template calls (INFERRED from code).

**UNKNOWN:** real model quality, how often JSON parsing fails, real latency (the UI says "can take a moment"), and actual token cost.

---

## 10. Study modes (real set)

| | **Flip Drill** | **Multiple Choice** |
|---|---|---|
| Picker label | "Game 2 — Mastery / Short-answer drill" (**mislabelled**; there is no short-answer input) | "Game 3 — Multiple Choice / Answer with distractors" |
| Files | `Game2Screen.js` → `components/FlipDrill.js` + `CardShell.js` + `TemplateBar.js` | `Screens/GameMC.js` + `CardShell.js` + `utils/PickDistractors.js` |
| Entry | Picker, or TOC jump (`startOrdinal`) | Picker, or TOC jump |
| Data | `hand?n=all&order=doc` (cached 6 h) | same cached hand |
| Ordering | document order; wraps around | document order; wraps around |
| Navigation | Prev/Next buttons; swipe ±100 px (mouse works on web); **no keyboard** | Previous/Next; auto-advance 700 ms after a pick; **no keyboard** |
| Reveal | tap card → 300 ms 3D flip; front white, back gold, mirrored bear watermark | pick → green correct / red wrong outline |
| Source/context | info panel: Section, Page, context tag, "Show context" switch (**on by default**) with italic excerpt. The excerpt shows **before** flipping and can give the answer away. Panel hidden on native landscape. | **none**: no section, page or excerpt shown |
| Scoring | none | mode "1" (normal: no score) / "2" (endless: right/wrong pills). Labels are bare digits. Counters reset on mode switch, are local only, and are not sent to `/feedback/`. |
| Haptics | flip and nav (native) | pick (native) |
| TOC | top-right button → TOC (`returnTo: Game2`) | top-right → TOC (`returnTo: GameMC`) |
| Template | bottom TemplateBar (hidden on native landscape) | none (removed in commit 6d8f51f) |
| Responsive | portrait: card = 98% width, height × 0.6; landscape: height-limited; web: Prev/Next in normal flow | three branches: desktop-web, mobile landscape (70–110 px question banner, 1 line), portrait |

**Defects found live:**

- **MC: pressing Next during the 700 ms auto-advance skips a card** (Card 2 → 4). The timeout is never cleared.
- MC questions are clamped by `numberOfLines`: 2 lines on desktop-web, 3 in portrait, **1 in mobile landscape**. `adjustsFontSizeToFit` only works on iOS, so questions get truncated with "…". Seen at 390 px.
- Game 1 is a blank light-grey screen with no back control (dead end on web; native relies on the OS back gesture).

---

## 11. Cache / resume behaviour (VERIFIED)

| Key (`fcache:v2:` prefix) | Written by | TTL | Contents |
|---|---|---|---|
| `last_deck_meta` | BuildScreen after success | none | `{deckId, name, cardsCount, buildMs, builtAt, metrics:null}` |
| `template:<deckId>` | BuildScreen | none | full template JSON |
| `deck:<id>:hand:doc:all` | FlipDrill / GameMC | 6 h | `hand` array |
| `deck:<id>:toc` | TOCScreen | 6 h | `toc` array |

- **Storage:** AsyncStorage, which is `localStorage` on web (VERIFIED key list). Same logic on native, with device storage INFERRED.
- **Resume:** Upload shows "Resume last deck? Deck #N • k cards" → "Use cached" goes to the Picker; "Discard" runs `clearCache()` (all keys).
- **Invalidation:**
  - Version prefix `v2`. TTL is checked on read.
  - "Dev: Clear cache (this deck)" removes the hand and TOC keys **but not the template**. "Dev: Clear ALL" leaves `last_deck_meta`.
  - `fetchWithCache` caches empty arrays too.
- **Backend restart:** harmless, since SQLite persists.
- **DB reset or different backend:** deck IDs are not namespaced by `API_BASE`. A stale resume points at a missing deck:
  - Flip Drill shows **"Loading cards…" forever**;
  - MC shows "No cards.";
  - TOC shows an empty list with no message (all VERIFIED);
  - or, worse, the cached cards of a *different* deck that reuses the same ID (INFERRED).
- **Preserve:** resume-last-deck, a per-deck template cache, and instant re-entry from cached hands. **Fix during F2/F3:** empty and stale states, namespacing by API base, the template being left on per-deck clear.

---

## 12. Responsive / mobile behaviour

Captured in headless Edge with device emulation. Native iOS/Android was **not** run (no device or simulator in this environment).

| Viewport | Observations |
|---|---|
| **390×844 portrait** | No horizontal page overflow (`scrollWidth == 390` on all screens). Upload: "Cover sections first" chip **clipped at the right edge**; plan header wraps to "Per- / section / plan / (total 3):" beside a full-width blue RN Button. Flip Drill: card, info panel and Prev/Next fit; TemplateBar fixed at bottom; Back/TOC buttons **35 px tall** (< 44 px target). MC: 56 px options fine; question truncated with "…". Picker: single column; dev buttons visible. |
| **844×390 landscape (web)** | **Flip Drill broken:** TemplateBar covers the lower card, and the info panel and Prev/Next sit below the fold (document 608 px tall in a 390 px viewport). MC: 4th option and Previous/Next off-screen (509 px). Build and TOC fine. |
| Native landscape | INFERRED from code: TemplateBar and info panel hidden, Prev/Next absolutely positioned 10 px above the inset. Commits 7094a98/ddeea17 say this was tuned by hand; UNKNOWN on device. |
| Emulation caveat | Without touch emulation, Chromium reports `(hover: hover)`, so GameMC took its desktop-web branch at 390 px. With touch emulation `hover` is false. Real phones take the mobile branch (INFERRED). |

---

## 13. Desktop / web behaviour (1440×900, VERIFIED)

- Everything works on web, including mouse swipe in Flip Drill and HTML download.
- Layout:
  - Upload stretches to ~1250 px wide with tiny stock buttons.
  - The Picker is a 2+1 card grid.
  - The Flip Drill card is 900×540; Prev/Next **overlap the top of the TemplateBar** by a few pixels.
  - TOC rows are full-bleed with no max width.
  - MC is a 1000 px card with full-width options.
- **No keyboard support:** arrow keys, space and Enter do nothing in either mode (VERIFIED). No visible focus styling.
- Browser back/forward is not integrated (no linking config).
- **`Alert.alert` is a no-op in react-native-web 0.20** (`node_modules/react-native-web/dist/exports/Alert/index.js` is an empty class method). On web, all of these vanish silently:
  - generation warnings,
  - "Choose a PDF first",
  - export failures,
  - cache-cleared confirmations,
  - template errors,
  - picker failures.
- Console warnings (dev): `shadow*` deprecated, `props.pointerEvents` deprecated, `useNativeDriver` unsupported on web, non-serializable nav params (the `File` object in Build params). No runtime exceptions in normal flows.
- `app.json` declares `userInterfaceStyle: "light"`, but the whole UI is a hard-coded dark theme.

---

## 14. Export / print / share

| Path | Platform | Behaviour |
|---|---|---|
| "Download printable cards (HTML)" | web | VERIFIED: downloads `deck-<id>-print.html`. Letter size, 2×3 grid, all fronts then all backs, dashed cut lines, gold backs. |
| same | native | INFERRED: writes to `cacheDirectory`, then `Sharing.shareAsync` as `text/html`. |
| "Export / Share PDF" | web | VERIFIED by code: **same HTML download**; not a PDF. |
| same | native | INFERRED: `Print.printToFileAsync(html)` → move to `documentDirectory/Deck_<id>.pdf` → share sheet, or an Alert with the path. |

**Duplex alignment bug (VERIFIED by code):** back pages use the **same left-to-right order** as the fronts (`exportHTML.js:49-66`). Printed duplex with a long-edge flip, each back lands behind the *neighbouring* column's front. Backs need to be mirrored per row.

The deck name in exports is "Deck <id>", not the document name.

---

## 15. AI / model / prompt usage (VERIFIED)

- **Provider:** OpenAI Python SDK 1.96.1, Chat Completions. Key from `settings.OPENAI_API_KEY` (env or `.env` via python-decouple).
- **Model:** `gpt-4o-mini` everywhere, `temperature=0.2`, `max_tokens=1400`, `response_format={"type":"json_object"}`.
- **Prompts:**
  - Templater system prompt: "study-note generator … exactly 5–6 bullet points", plus a JSON schema in the user message.
  - Card system prompt: atomic cards, mixed card types, distractor guidance, excerpt, context taxonomy.
- **Concurrency:** templater up to 6 threads; section jobs up to 4 threads; card requests sequential within a job (batches of ≤3).
- **No** retries/backoff for API errors (exceptions are caught and the work dropped), **no** timeouts set, **no** token accounting, **no** caching of LLM results across identical uploads.

---

## 16. Test baseline

All runs used scratch copies made with `git archive`. Neither checkout was modified. No real OpenAI key or calls; synthetic PDFs only.

| Check | Result |
|---|---|
| FE: `npm ci` (lockfile) | ✅ 711 packages, exit 0 (deprecation warnings only) |
| FE: lint / typecheck / tests | ⛔ **not configured** (no scripts, no ESLint, no TS sources, no test runner) |
| FE: `expo export --platform web` **without** `src/env.js` | ❌ **exit 1**: `Unable to resolve module ./env from src/config.js` (fresh-clone failure) |
| FE: `expo export --platform web` with a scratch `src/env.js` | ✅ exit 0; web bundled 850 modules |
| FE: `npx expo-doctor@latest` | ⚠️ 16/18 passed. Failed: `@expo/metro-config` 0.20.17 (expected ~0.20.18); `@expo/metro-runtime` 5.0.4 (~5.0.5); `@react-native-community/slider` 4.5.7 (4.5.6); `expo` 53.0.20 (~53.0.27); `react-native` 0.79.5 (0.79.6) |
| FE: `expo start --web` + headless walk of every screen | ✅ runs; no runtime exceptions; warnings listed in §13 |
| BE: `pip install -r requirements.txt` on Python **3.14.7** (only Python installed) | ❌ **`tiktoken==0.7.0` has no cp314 wheel and needs a Rust compiler**. Everything else installed once tiktoken was removed (scratch venv only). |
| BE: `manage.py check` without `OPENAI_API_KEY` | ❌ `decouple.UndefinedValueError: OPENAI_API_KEY not found` |
| BE: `manage.py check` (placeholder key) | ✅ no issues |
| BE: `makemigrations --check --dry-run` | ✅ no changes |
| BE: `manage.py test` | ⚠️ **0 tests** ("NO TESTS RAN") |
| BE: `check --deploy` | ⚠️ 6 warnings: W004 HSTS, W008 SSL redirect, W009 insecure SECRET_KEY, W012/W016 insecure cookies, W018 DEBUG |
| BE: import every module | ✅ all except `ai.chunker` (no tiktoken) and `ai.prompt_cards` (no genanki), both dead |
| BE: live endpoint probes (curl) | ✅ analyze / inspect / generate / hand / toc / health behave as in §7; feedback → 403 anonymous |

**Harness used** (scratch-only, not committed):

- `mock_openai.py`: a local `/v1/chat/completions` stub selected via the `OPENAI_BASE_URL` env var.
- `make_pdfs.py`: synthetic PDFs (one with an uneven 3-entry TOC, one without a TOC).
- `cdp.mjs` + `audit*.mjs`: headless Edge over DevTools (Node built-in WebSocket; no packages added).

These are worth recreating as committed fixtures in F0.5/F5.

---

## 17. Deployment status

| Artifact | Finding |
|---|---|
| Dockerfile, Procfile, `runtime.txt`, `render.yaml`, `fly.toml`, `vercel.json`, etc. | **None** in either repo (VERIFIED; full `git ls-files` reviewed) |
| gunicorn / whitenoise / Postgres | Commented out in `requirements.txt`; no settings support (VERIFIED) |
| CI/CD (`.github/workflows`, etc.) | **None** (VERIFIED) |
| EAS (`eas.json`), bundle IDs, store metadata | **None**; `app.json` has no `ios.bundleIdentifier` or `android.package` (VERIFIED) |
| Production API URL | **None**; web defaults to `127.0.0.1:8000`, native to the LAN IP on `:8000` (VERIFIED) |
| Env files | Backend reads `.env` (gitignored, absent); frontend needs `src/env.js` (gitignored, absent) (VERIFIED) |

**Conclusion:** there is no evidence of any current production deployment; the project is local and LAN-only. Whether something was ever hosted outside these repos is UNKNOWN.

---

## 18. Security / configuration concerns (all VERIFIED)

Rank columns: **A** = local/portfolio demo, **B** = public deployment, **C** = production/commercial.

| # | Issue | Evidence | A | B | C |
|---|---|---|---|---|---|
| S1 | Unauthenticated, unlimited OpenAI-backed `/generate/` (cost exposure; template calls grow with pages/TOC size, not requested cards) | `views.py:109` `AllowAny`; no throttling | low | **critical** | **critical** |
| S2 | No upload size, page or type limits; any PyMuPDF-openable file accepted | `views.py:36-49,115-149` | low | high | high |
| S3 | Hard-coded `SECRET_KEY` (`django-insecure-…`) committed | `settings.py:28` | low | high | high |
| S4 | `DEBUG` defaults to True | `settings.py:31` | low | high | high |
| S5 | `ALLOWED_HOSTS=["*"]` | `settings.py:34` | low | med | high |
| S6 | `CORS_ALLOW_ALL_ORIGINS=True` (set twice; makes `CORS_ALLOWED_ORIGINS` dead) | `settings.py:36,64-71` | low | high | high |
| S7 | Error responses include exception text and server temp paths | `views.py:53,247` | low | med | med |
| S8 | `.chunks.pkl` leaked to the temp dir on every generate (content of private documents persists on disk) | `core.py:121-127` | low | med | high |
| S9 | Decks are world-readable by sequential integer ID (`hand`/`toc` anonymous GET) | `views.py:264-321` | low | high | high |
| S10 | SQLite; no Postgres path | `settings.py:107-112` | none | med | high |
| S11 | Root logging at DEBUG (logs LLM output excerpts) | `settings.py:165-177`, `flashcard_gen.py:99` | none | med | med |
| S12 | Synchronous long-running generation inside the request (worker exhaustion; no timeout) | `views.py:167` | low | high | high |
| S13 | Native client uses plain HTTP to a LAN IP | `config.js:57-60` | none | high (ATS/cleartext) | high |
| S14 | `OPENAI_API_KEY` required even for non-AI management commands | `settings.py:17` | low | low | low |

---

## 19. Visual strengths (worth keeping)

1. **The flip card is the hero.**
   - Big, legible, centred type.
   - A satisfying 300 ms 3D flip.
   - A clear front/back colour contrast.
   - A swipe gesture that feels physical.
2. **The source panel concept:** Section / Page / context tag / excerpt right under the card. It is the product's differentiator, and the right foundation for "source-aware".
3. **MC answer feedback:** soft green/red tinted outlines are clear without being loud.
4. **TOC rows:** the ordinal + page + section + question hierarchy is correct; it just needs styling.
5. **A consistent two-colour accent system** (blue surfaces + gold actions), even though it isn't the right identity going forward.
6. **Build screen:** a centred card with a timer and step dots is the right *structure* for a loading state.

## 20. Visual deficiencies

- **Identity:** UC Berkeley's exact palette and a bear watermark read as a college spirit theme, not a product. The low-res bear PNG is upscaled to 120% and looks blurry on the 900 px card. The overall look is dark, heavy and dated, the opposite of the "lighter, tactile, academic" direction.
- **Component inconsistency:**
  - Stock RN `Button` (uppercase, square, blue/green, RN-Web default) sits beside custom rounded gold pills, cyan pills, translucent pills and outlined pills.
  - At least five button styles in total.
  - Three different back-button styles.
- **Typography:** system font only, with no type scale beyond h1/body. Weights 700–900 are used everywhere, so nothing stands out. Tiny 13–14 px labels sit next to 28 px card text.
- **Upload screen:**
  - An empty 96 px gradient bar with no content.
  - The whole flow sits in one long dark column.
  - Stats are plain key/value text.
  - The recommendation is a cyan sentence.
  - Coverage percentages are mint text.
  - The section plan is a bulleted list with `–` / `+` RN Buttons.
  - No visual sense of "document → structure".
- **Picker:** three equal "Game N" cards, with "Game 1" leading to nothing. Dev buttons sit at the same visual weight as real actions. Export is labelled "PDF" but produces HTML on web.
- **Study screens:** chrome competes with the card (cyan Back/TOC pills, a gold TemplateBar, gold Prev/Next). The MC mode toggle is the digits "1" and "2". "Card 1/4" is the only progress cue.
- **Template modal:** a long undifferentiated list with a "Print full JSON to console" developer button (Picker variant). The title is the server temp filename.
- **Empty, error and loading states:**
  - Raw `TypeError: Failed to fetch` / `HTTP 500 – …` strings, centred, with no retry.
  - Game 1 is a light-grey default screen.
  - A missing deck spins forever.

## 21. UX deficiencies (VERIFIED live unless noted)

1. On web, warnings, errors and confirmations via `Alert.alert` never appear.
2. The build progress never reaches "Generate"; it reads "Uploading your PDF…" for the entire generation.
3. "Home" during a build doesn't cancel the request; ~5 s later the app jumps to the Picker of the new deck.
4. "Reset to recommendation" is a no-op. The "Coverage" chips are no-ops. The plan total can disagree with what gets generated, and per-section counts above 8 are silently capped.
5. Analysis errors don't stop "Upload & Build".
6. TOC jumps **push** a new study screen every time (React Navigation 7 `navigate` semantics, confirmed in `@react-navigation/routers` 7.4.1). The stack grows (7 TOC inputs mounted after 3 jumps), and "Back" walks through every old screen.
7. The TOC "Template" button opens **two** stacked modals when a Flip Drill or another TOC is mounted below it (global `TemplateBus` with multiple listeners).
8. MC Next during auto-advance skips a card. MC shows no source context at all.
9. The Flip Drill excerpt is visible before flipping, so it can reveal the answer.
10. No keyboard navigation. Touch targets for Back/TOC/mode toggles are 35 px tall.
11. Stale or missing decks: infinite spinner, "No cards.", or an empty TOC.
12. Mislabelled modes ("Mastery / Short-answer drill" is a flip drill); a placeholder mode in the picker.
13. Deck identity is "Deck #6" everywhere, not the document name. The resume card shows "Deck #6 • 4 cards".

---

## 22. Technical blockers before visual modernization

**BLOCKER: fix in a small F0.5 before F1**

| ID | Issue | Why it blocks | Smallest fix |
|---|---|---|---|
| B1 | Fresh clone can't bundle (`./env` missing) | Every future phase and reviewer starts from a clean checkout | Optional env with a committed `src/env.example.js` + `EXPO_PUBLIC_API_BASE` fallback; no behaviour change |
| B2 | Backend can't be installed on the available Python (`tiktoken==0.7.0`) | F2/F3 verification needs a running backend | Owner decision: remove the unused `tiktoken` pin (and dead `chunker.py`), **or** standardise on Python 3.12 with a documented version |
| B3 | Template page ranges overwritten; cards get wrong `page` and mis-sourced text | The redesign's core story (SOURCE → STRUCTURE) and any portfolio fixture would show wrong pages | Keep TOC `page_start`/`page_end` from `run_extraction`, and use the even split only when absent (backend, a few lines) |
| B4 | Zero tests | No way to prove F1–F4 kept the API contract | Minimal Django tests: analyze on a synthetic TOC PDF, generate with a mocked OpenAI (asserting page ranges and response shape), hand/toc ordering |

**LATER HARDENING (F5):** S1–S14; `.chunks.pkl` leak; persisting `ordinal`; template title = temp name (or fix in F0.5 alongside B3); `feedback` permission; warnings vs "Mixed topics"; all-zero allocations → 500; dead modules (`ingest.py`, `chunker.py`, `prompt_cards.py`, `inspect.py`); unused requirements (Pillow, pytesseract, python-docx); Expo SDK patch alignment (`npx expo install --check`); `expo-constants` undeclared; unused reanimated/gesture-handler.

**Fix inside the phase that owns the file** (not blockers): every UX defect in §21. Each one lives in a screen that F2 or F3 rewrites anyway, so fixing them separately first would cause churn.

**OPTIONAL / not worth touching:** `TemplateBar.styles.js` duplication (superseded by F1), Game 1 implementation (out of scope; hide it), server-side `/feedback/` wiring.

**Recommendation:** yes, run **F0.5 stabilization** (B1–B4, plus the template-title fix). It is roughly a day of work, and it touches the backend, which needs owner approval since the plan reserves backend work for F5.

---

## 23. Functionality / invariants to preserve

1. PDF-only picker → automatic analyze on pick (no extra click).
2. Analyze response fields and semantics: pages, words, recommended count and range, per-section plan with page ranges.
3. Card-count control (3–30) and per-section allocation when a TOC exists; the allocations JSON shape `{title, page_start, page_end, cards}`.
4. The `generate` multipart contract (`file`, `deck_name`, `cards_wanted`, `allocations`) and the response fields `deck_id`, `cards_created`, `warnings`, `template`.
5. Warnings must stay *visible* (and become visible on web).
6. Deck IDs; persisted cards; `hand?order=doc` ordering = TOC ordinal order.
7. **Flip Drill:** tap-to-flip, swipe left/right, Prev/Next, wraparound, Section/Page/context/excerpt panel with a toggle.
8. **Multiple Choice:** server distractors first with local fallback to 3, shuffled options, correct/wrong reveal, auto-advance, the endless scoring variant.
9. TOC: search by section/question, jump to card in the originating mode, page/section labels.
10. Template viewing from study screens and the TOC.
11. Resume last deck; cached hands/TOC/template; "Discard".
12. Printable HTML export (web) and PDF share (native).
13. Haptics on native.
14. Portrait, landscape and desktop/web all usable; Android/iOS/web all supported targets.
15. Native API host auto-detection for LAN development.

---

## 24. Explicit out-of-scope list

Knowledge graphs or ontology discovery; generated game modes; comparison/swipe engines; adaptive tutoring or mastery architecture; spaced repetition (not present today); BearSummarizer integration; Stripe, subscriptions or monetization; B2B/corporate training; social/multiplayer; accounts/auth beyond what F5 needs for demo safety; a major backend rewrite or new AI architecture; building "Game 1 — Curate"; short-answer typing mode; DOCX/OCR support; new AI features.

---

## 25. Proposed modernization stages

| Phase | Scope | Notes |
|---|---|---|
| **F0** | Baseline audit (this document) | Done |
| **F0.5** *(proposed)* | Stabilization: B1–B4 + template title from `deck_name`; scratch harness → committed fixtures (`mock_openai`, synthetic PDFs) | Touches the backend; needs owner approval |
| **F1** | Visual foundation: tokens (colour, type scale, spacing, radii, elevation, motion durations), light theme, `Button`/`IconButton`/`Chip`/`Stepper`/`Surface`/`Banner`/`ScreenShell`/`EmptyState`/`ErrorState` primitives, a cross-platform `notify()` replacing `Alert.alert`, reduced-motion hook, accessibility roles/labels, 44 px targets | No screen redesign yet; screens adopt primitives only where the change is mechanical |
| **F2** | Source / analyze / build flow: Upload as "Source → Structure" (document card, section map with page ranges and per-section steppers, honest totals, working reset, remove or hide the coverage chips), build progress that reflects reality (uploading → generating with elapsed time and cancel), abortable request, warnings via `notify`/inline, resume card with the deck name | API contract unchanged |
| **F3** | Study experience: Picker (real mode names, dev tools hidden behind a flag, export labelled correctly), Flip Drill chrome, excerpt revealed after flip by default (owner decision), MC source context after answering, MC timer fix, TOC as a sheet or `popTo` (no stack growth), a single template modal owner, empty/stale-deck states, `useDeck` data hook | No new modes |
| **F4** | Responsive + desktop: web landscape fixes, tablet, desktop two-column study layout, keyboard (←/→, Space to flip, 1–4 for MC), focus rings, orientation edge cases, native device pass | |
| **F5** | Backend/demo hardening: S1–S14 as needed for the chosen exposure (env-driven settings, throttling/quotas or a demo-mode kill switch, upload limits, CORS allowlist, temp cleanup, persisted ordinal), dead-code removal, Expo patch alignment, docs, tests | Not a rewrite |
| **F6** | Portfolio extraction + integrated verification: fixture deck, static web build with no backend, screenshots, case-study evidence, final regression | |

---

## 26. Acceptance criteria per stage

**Global (every phase F1–F6):**

- `npm ci && npx expo export --platform web` succeeds on a fresh clone.
- `manage.py check` and `manage.py test` pass.
- The §7 API table still holds: same paths, fields and status codes.
- No new runtime exceptions in the console during the scripted walk.
- At 390×844, 844×390 and 1440×900: `document.documentElement.scrollWidth === innerWidth` on every screen.

**F0.5**

- A fresh clone, with no `src/env.js`, bundles for web and targets `http://127.0.0.1:8000`.
- Backend installs from `requirements.txt` on the documented Python version.
- Generating from the synthetic uneven-TOC PDF (1–4/5/6) gives template sections `1–4`, `5–5`, `6–6`. Every card `page` falls within its section's range. Each section's LLM input contains only its own pages' text (asserted against the mock log).
- `template.title` equals `deck_name`.
- ≥5 backend tests run in CI-less local mode with no network.

**F1**

- A single token module; no raw hex outside it (grep check), except asset/export HTML.
- Every interactive primitive is ≥44×44 px, has `accessibilityRole` and a label, and shows a visible focus style on web.
- `notify()` displays visibly on web and native (verified by triggering the Build warnings path with the mock).
- A reduced-motion setting disables the flip and slide animations (instant swap).
- Body and label text contrast ≥ 4.5:1.
- No functional diffs: §7 walk output identical except for styling.

**F2**

- Upload → analyze → plan → build works on web with the synthetic PDFs.
- The plan sum always equals the displayed total.
- Per-section max is 8 (matching the backend), or a visible message explains the cap.
- Reset restores `per_section_allocation`.
- The build screen shows a "Generating" state within 1 s of the upload completing (or a single honest "Generating" state), plus elapsed time.
- Cancel/Home aborts the request, and no navigation happens afterwards.
- Warnings appear in-page on web.
- Analysis errors block Build with a human message and retry.
- The resume card shows the document name and card count; Discard works.
- At 390×844 nothing is clipped.

**F3**

- Flip Drill: tap/click flips; swipe ±100 px navigates; Prev/Next wrap; Section/Page/context/excerpt shown; excerpt behaviour matches the owner decision.
- MC: 4 options when ≥3 distractors are available; correct/wrong states; exactly one advance per answer even if Next is pressed during the delay; source context available after answering.
- TOC: search filters; jump opens the correct ordinal in the originating mode; after 5 jumps, one Back returns to the Picker or the original mode (no stack growth); exactly one template modal opens.
- Missing deck → an empty/error state with "Back to upload" within 5 s.
- Game 1 is hidden or clearly marked unavailable, with a way back.
- Export button labels match the actual output per platform.

**F4**

- At 844×390 web and native landscape, Flip Drill card, controls and source access all sit within the viewport without page scroll. MC has all 4 options and controls visible, or a scroll container with controls pinned.
- Keyboard: ←/→ navigate, Space/Enter flip, 1–4 answer MC, Esc closes modals.
- Tablet 768×1024 and 1024×768 layouts verified.
- iOS simulator + Android emulator smoke pass: upload, build, flip, MC, TOC, export/share.

**F5**

- `check --deploy` shows 0 warnings with production env.
- Anonymous `/generate/` is rate-limited, or disabled in demo mode.
- Upload > configured MB or > N pages → 413/400 with a message.
- No `.chunks.pkl` left after a generate.
- Error bodies contain no filesystem paths.
- `Card.ordinal` persisted and matching TOC order.
- Settings come from the environment; documented `.env.example`.

**F6**

- The portfolio demo loads with **no network calls to the backend or OpenAI** (verified in the network log).
- Fixture contains only synthetic content.
- Flip Drill, MC and TOC jump work from the fixture.
- Lighthouse a11y ≥ 90 on the demo page.
- Captured screenshots at the three viewports.
- The full §7 walk passes against the real backend with the mock LLM.

---

## 27. File ownership map

| Phase | Owns (may edit) | Must not touch |
|---|---|---|
| F0.5 | `src/config.js`, new `src/env.example.js`, `.gitignore` (if needed), README; backend `requirements.txt`, `flashcards/ai/pipeline/templater.py` (page ranges), `flashcards/ai/pipeline/core.py` (title passthrough), `flashcards/views.py` (title only), `flashcards/tests.py` (+ fixtures dir) | screen files, styles |
| F1 | `src/styles/theme.js` → `src/theme/*` (tokens), new `src/ui/*` primitives (Button, IconButton, Chip, Stepper, Surface, ScreenShell, EmptyState, ErrorState, notify), `src/components/CardShell.js` (surface only), `App.js` (theme provider), `app.json` (`userInterfaceStyle`) | screen logic, `utils/cache.js`, API calls |
| F2 | `src/Screens/UploadScreen.js`, `src/Screens/BuildScreen.js`, `src/styles/screens/UploadScreen.styles.js`, `src/styles/screens/BuildScreen.styles.js`, new `src/components/source/*` (DocumentCard, SectionPlan, BuildProgress) | study screens |
| F3 | `src/Screens/GamePicker.js`, `src/Screens/Game2Screen.js`, `src/components/FlipDrill.js`, `src/Screens/GameMC.js`, `src/Screens/TOCScreen.js`, `src/components/TemplateBar.js`, `src/utils/TemplateBus.js`, `src/utils/PickDistractors.js`, `src/utils/exportHTML.js` (mirror fix), `src/Screens/Game1Screen.js`, `src/navigation/Stack.js`, matching `styles/**`, new `src/data/useDeck.js` (hand/toc/template loading + stale handling, wraps `utils/cache.js`) | Upload/Build |
| F4 | new `src/ui/layout/*` (breakpoints, `useLayout`), responsive edits in F3-owned files (after F3 merges), keyboard handlers | API, cache |
| F5 | backend: `flashsite/settings.py`, `flashcards/views.py`, `flashcards/ai/**`, `requirements.txt`, tests, docs; frontend: `package.json` / `package-lock.json` (Expo patch alignment) | UI |
| F6 | new `src/demo/*` (fixture deck JSON, `DemoDeckProvider` behind `useDeck`), demo entry/route, `docs/` | product screens (consume via `useDeck` only) |

**Parallelism:**

- F2 and F3 can run in parallel once F1 lands; they have disjoint screen files.
- F4 must follow F3.
- F5 (backend) can run in parallel with F2–F4.
- F6 depends on F3's `useDeck` seam.

---

## 28. Recommended portfolio interactive proof

**Verified as the strongest real interaction:** the **Flip Drill**. It is the only screen that already combines motion (3D flip), gesture (swipe), and the product's differentiator (Section / Page / context / source excerpt) in one view. TOC jump and MC distractors are good secondary proofs.

**Proposal (built in F6, not now):**

- A preloaded **synthetic** deck: ~10 cards across 3 sections with correct page ranges, plus a TOC and a template.
- Flow: **Flip Drill** (flip, swipe, Prev/Next, source panel) → "Jump" via a compact TOC → switch to **Multiple Choice** for the same card.
- Optional static "Source → Structure" strip showing the analyze result (pages, words, section map with page ranges) for the same synthetic document, rendered from fixture JSON.

**Requirements:**

- Fixture JSON shaped exactly like the `hand`, `toc` and `generate.template` responses.
- Served through a `useDeck` data seam (F3).
- Zero network; no uploads; synthetic content only.
- Page numbers must be correct, which depends on **B3** or hand-authored fixtures.

---

## 29. Risks and rollback boundaries

| Risk | Mitigation / rollback boundary |
|---|---|
| Visual phases silently change API usage | §7 contract table + F0.5 backend tests + scripted web walk; each phase is a separate branch/PR off `master` and revertible |
| Native regressions (no device in this audit) | F4 includes a simulator/emulator pass; keep `Platform` branches until verified; each screen rewrite lands behind its own PR |
| Expo SDK drift (5 packages off-patch) | Patch-align only (`expo install --check`) in F5 or F0.5; **no SDK upgrade** during visual work |
| Backend page-range fix changes card `page` values | Only affects newly generated decks; existing DB rows untouched; revert = single-file change |
| Cache shape changes break resume | Bump `VERSION` in `cache.js` whenever shapes change; old keys are ignored, not migrated |
| Navigation changes (TOC push → pop/sheet) alter Back behaviour | Covered by F3 acceptance criteria; isolated in `Stack.js` + TOC/study screens |
| Public demo cost exposure | F6 demo uses fixtures only; never point the portfolio at a live `/generate/` without F5 throttling |
| Branding/IP (Berkeley palette + bear mark) | Owner decision before F1 tokens are frozen |

---

## 30. Owner decisions required

1. **F0.5 approval:** allow small backend edits (B2, B3, B4, template title) before F5?
2. **Python strategy:** drop the unused `tiktoken` pin/module (recommended), or standardise on Python 3.12?
3. **Identity:** retire the UC Berkeley Blue/Gold palette and bear watermark for a new lighter identity (recommended), or keep elements of it? Is "BEAR" a brand you want to carry?
4. **Mode naming and roster:** rename to "Flip Drill" and "Multiple Choice"; hide "Game 1 — Curate" (recommended), or keep it as "coming soon"?
5. **Coverage chips:** remove (recommended; no backend support), or keep as a placeholder?
6. **Excerpt timing in Flip Drill:** show the source excerpt only after flipping by default (recommended), or keep it always visible?
7. **MC source context:** show section/page/excerpt after answering? (Recommended: yes; data is already present.)
8. **Per-section cap UX:** expose the 8-card backend cap in the UI, or raise the cap in F5?
9. **Dev tools:** hide the "Dev: Clear cache" buttons behind a dev flag (recommended)?
10. **Export:** keep both buttons, or one platform-aware "Export" action? Fix the duplex mirroring in F3?
11. **Expo patch alignment** (5 packages) in F0.5 or F5? No SDK major upgrade during F1–F4?
12. **Native verification:** who provides the iOS/Android test devices or simulators, and is native polish a hard requirement for "done"?
13. **Public backend:** will the backend ever be publicly hosted? If not, F5 shrinks to config hygiene and the portfolio stays fixture-only.
14. **Feedback counters:** leave `/feedback/` unused (recommended), or wire MC endless results to it?

---

## 31. F0.5 Addendum — verified stabilization

**Workstream:** `FLASH-V2-F0.5` (2026-10-06). Scope: B1–B4 from §22, plus the template-title, `.chunks.pkl` and temp-path items, because each was a small, low-risk lifecycle fix. No visual changes, no new features, no endpoint or request changes. No deployment, no OpenAI calls, no private documents. Default branches untouched (frontend `master` = `f60dd52`, backend `main` = `18a6928`).

### 31.1 SHAs

| Repo | Branch | Base | F0.5 commit(s) |
|---|---|---|---|
| Frontend `mitcherrman/flash_ui` | `flashv2/f05-stabilization` | `78b289edf651e98100fa83ae71d7b490e44fd69b` (F0) | `a9e1d82bce589820508b90ae6a071772f703d586` (config fix) → `2c5fd8fc105d99052c94d6c8bdd93123de1edeea` (addendum) → the commit carrying this revision (page-policy correction docs) |
| Backend `mitcherrman/flashcard_django` | `flashv2/f05-stabilization` | `18a69289c7d34869fa6a141ec10210e3cc3835d0` (`main`) | `9575ae04e48c54f60d679dbe97b984ab9eb2fcc7` → **`b3cc888acbf2bb493f1033384659c0aadc50c967`** (final: grounding correction, §31.4 item 6) |

The **final backend F0.5 SHA is `b3cc888`**. `9575ae0` is superseded only in its card-page fallback; everything else in it stands.

Frontend files: `src/config.js`, `.env.example` (new), `.gitignore`, this file. Backend files: `requirements.txt`, `flashcards/ai/driver.py`, `flashcards/ai/flashcard_gen.py`, `flashcards/ai/pipeline/templater.py`, `flashcards/ai/pipeline/core.py`, `flashcards/views.py`, `flashcards/tests/{__init__,fakes,test_pipeline}.py` (replacing the empty `flashcards/tests.py`).

### 31.2 Fixes

| ID | Before (reproduced on the base SHAs) | After |
|---|---|---|
| B1 fresh clone | `src/config.js` imported the gitignored `src/env.js`, so the web export failed | `API_BASE` reads `EXPO_PUBLIC_API_BASE`; `src/env.js` is no longer read. `git archive` of `a9e1d82` → `npm ci` + `expo export` for web/android/ios all exit 0 |
| B2 install | `tiktoken==0.7.0` has no cp314 wheel (needs Rust) | Pin removed. Import graph re-verified: the only importer is `ai/chunker.py`, which nothing imports. Clean Python 3.14.7 venv: `pip install -r requirements.txt` exit 0, `pip check` clean |
| B3 page/section | Templater set `page_end=None`; `_template_from_sections` then replaced **both** ends with an even split. Also, `_merge_sections` silently dropped page metadata on every new section. TOC 1–4 / 5 / 6 became 1–2 / 3–4 / 5–6. "Photosynthesis" got no page text, and a page-2 fact was labelled p.1 | Real ranges kept (1–4 / 5–5 / 6–6). Each section's model input contains only its own pages, asserted against the fake model's request log. Card pages are grounded (§31.4) |
| B4 ordinal | `Card.ordinal` always 0 | Dense 1..N in document order, equal to `toc.ordinal` and the `hand?order=doc` position (§31.5) |
| Template title | `template.title` = server temp-file stem (e.g. `tmpgy0tbwcp`), also sent to the model as the "document title hint" | `template.title` = `deck_name` (new optional `title` kwarg on `cards_from_document`) |
| `.chunks.pkl` leak (S8) | Written next to the temp upload on every generate and never removed (never read either) | `generate_deck`'s `finally` unlinks it alongside the upload. Tested: the temp dir is empty after a generate, on both success and failure paths |
| Temp-path leak (S7, parse errors) | `{"detail": "analyze failed: Failed to open file 'C:\\…\\Temp\\tmpXXXX.pdf'."}` | The temp path is replaced by the upload's own name: `"… Failed to open file 'broken.pdf'."` (analyze and generate). The full exception and path are still logged server-side |

### 31.3 Config behaviour (frontend)

- **Variable:** `EXPO_PUBLIC_API_BASE`, the server origin only (e.g. `http://192.168.0.42:8000`; a trailing `/` is stripped). Screens still append `/api/flashcards/...`.
- **Source:** Expo SDK 53 inlines `process.env.EXPO_PUBLIC_*` at bundle time, from the shell or from `.env` / `.env.local`. `.env*.local` is gitignored. `.env.example` documents the variable. Values end up in the JS bundle, so they are **public**: never put a secret there.
- **When set:** applies to **web and native**. For LAN phone testing, leave it unset or use the LAN IP, because a `127.0.0.1` value would point the phone at itself. This differs slightly from the old `src/env.js` `WEB_API_BASE`, which was web-only.
- **When unset (fresh clone):** the defaults are unchanged. Web uses `http://127.0.0.1:8000` (verified in the exported bundle). Native uses `http://<LAN host of the Metro/Expo dev server>:8000`.
- **Caveat (verified):** Metro caches transforms. After changing the value, run `expo start -c` / `expo export --clear`, or the old value stays in the bundle.
- A leftover local `src/env.js` is harmless; it stays gitignored.

### 31.4 Section / page policy (backend)

1. **Analysis ranges are authoritative.** `analyze_document` is unchanged; TOC section `page_start`/`page_end` flow through `run_extraction`, which now returns `(text, page_start, title|None, page_end)`. `page_end` is appended last so positional readers keep working.
2. **Template sections** keep the range of the chunk they were generated from. Each section and `toc` entry gains an **additive** `page_source` field:
   - `"toc"`: the PDF outline range.
   - `"page"`: a no-TOC page chunk (one page), or a one-page document.
   - `"estimated"`: the even split. It is used **only** when no structural/page metadata exists (in practice: TOC-aware extraction failed on a multi-page document).
3. **Merging** sections with the same title, which still happens, widens the range only across contiguous or overlapping pages. Otherwise the first range is kept, so duplicate titles never span other sections' pages.
4. **Generation text** for a section is its own TOC chunk, matched by title within range. If there isn't one, it is the chunks lying wholly inside the range. Nested TOC entries that share a start page no longer pull in each other's later pages. `estimated` sections get **no** page slice, only their template seed lines, and no `PAGE:` hint.
5. **Card `section`** = the template section whose job produced the card. The model's echo is not used. This also makes the existing per-section warnings match exactly.
6. **Card `page`** (`core._grounded_page`, final rule as of `b3cc888`). The pipeline is authoritative; the model's echoed `page` is **never** used as provenance.
   1. **Grounded → exact page.** If the card's excerpt is found verbatim on a page inside the section's real range, that PDF page is used. The check uses the whole excerpt, or its first or last 8 words, normalised for case, punctuation and whitespace.
   2. **Single-page section → its page.** If the real range is exactly one page, that page is used even when the excerpt doesn't match, because the section is confined to it.
   3. **Multi-page section, no match → `null`.** The section's first page is **not** assumed. (The `9575ae0` fallback to the section start was removed as unsupported precision.)
   4. **No real range** (`estimated` sections and the global "Mixed topics" catch-up) → `null`, unless the excerpt is located verbatim somewhere in the document, which is independent grounding.
   - So a card shows a page only when the pipeline can ground it; otherwise the page is unknown (`null`). The old fabricated `page=1` is also gone.
   - Limits: a paraphrased excerpt in a multi-page section yields `null` (honest, by design; no fuzzy matching). Text is grounded per page, not per line.
7. **Unchanged budgets:** section chunks are still trimmed to `max(2000, max_tokens×6)` chars, and section input is still capped at 24,000 chars.

### 31.5 Ordinal policy

- `Card.ordinal` = the 1-based position in the document order already used by `hand?order=doc` and `toc`: page ascending, unknown (`null`) pages last, then insertion order.
- Before `bulk_create`, cards are stably sorted by `(page is null, page)`. Ties keep pipeline (section) order, and ids are assigned in the same order.
- For new decks, `card.ordinal == toc.ordinal == hand index + 1` (tested).
- Ordering semantics are unchanged: `hand`/`toc` still sort by page/id, not by `ordinal`.
- Decks created before F0.5 keep `ordinal = 0`; there is no backfill migration.
- Side effect: cards with an unknown page (`null`) sort **last**. That means "Mixed topics" catch-up cards (formerly first, at a fake page 1) and ungrounded cards from multi-page sections.

### 31.6 Tests and checks

**Backend suite:** `flashcards/tests/test_pipeline.py`, **22 tests** (the 15 from `9575ae0` plus 7 added in `b3cc888`), about 0.3 s, deterministic over 3 consecutive runs.

- Synthetic PDFs are built in memory with PyMuPDF. Every page carries traceable `Fact P<page>-<n>` lines, so page provenance can be checked.
- `FakeOpenAI` is patched in at both client seams (`templater.OpenAI`, `flashcard_gen.CLIENT`). `httpx.Client.send` is patched to fail any real HTTP call.
- The database is Django's test SQLite.

Coverage:

- analysis keeps real TOC ranges; recommendation/range/allocation (3 / 3–4 / sum 3); no-TOC → empty plan;
- template keeps 1–4/5/6 with `page_source="toc"`; `template.title` = deck name;
- template and card model inputs never contain neighbouring pages (uneven TOC and nested same-start-page TOC);
- card pages equal the fact's real page and fall inside the section range (Cells 1–4 → pages {1, 2});
- no-TOC sections use their own page (1/2/3, `"page"`); adjacent same-title pages merge to 1–2;
- `estimated` only when extraction fails, with no page text, no `PAGE:` hint and `page = null`;
- ordinals dense 1..N and equal to toc/hand; catch-up cards `page = null` and last;
- limits the frontend relies on: `cards_wanted` 1→3, 99→30, "abc"→12; per-section cap 8 (20 → planned 8, created 8, requested 10); response keys unchanged;
- no temp files left after generate; parse errors expose no temp path;
- **page-grounding policy** (`PageGroundingPolicyTests`, which calls `_grounded_page` directly on synthetic page text):
  - (A) an exact excerpt in a 1–4 section → its exact page 3;
  - (B) a paraphrased excerpt in a 1–4 section → `null`, not 1; a model-echoed `page` is ignored; a real excerpt from a page outside the range is ignored;
  - (C) a paraphrased excerpt in a 5–5 section → 5;
  - (D) `estimated` or no range → `null`, unless the excerpt is found verbatim;
- **end-to-end paraphrase** (`ParaphrasedExcerptTests`, through `/generate/` with `FakeOpenAI(paraphrase=True)`): Cells (1–4) cards get `page = null`; Photosynthesis → 5; Respiration → 6; ordinals still 1..8 with the unknown-page cards last.
  - Against the `9575ae0` grounding code, the three (B) tests and this end-to-end test fail; (A), (C) and (D) pass, because those behaviours were already right.

**Run** (the settings still require `OPENAI_API_KEY`, but any placeholder works and it is never used):

```bash
OPENAI_API_KEY=unused-test-key python manage.py test flashcards
```

On Python 3.14 the suite patches out Django's `mail_admins` handler (see §31.7, item 1).

| Check (all on Python 3.14.7 / Node 24.19.0) | Result |
|---|---|
| BE clean clone (`git archive b3cc888`; `9575ae0` also passed) → new venv → `pip install -r requirements.txt` | ✅ exit 0; `tiktoken` not installed; `pip check` clean |
| BE `manage.py check` | ✅ no issues |
| BE `makemigrations --check --dry-run` | ✅ no changes (no model changes in F0.5) |
| BE `manage.py test flashcards` (clean clone of `b3cc888`) | ✅ 22/22 OK. On the base pipeline the original 15 gave 8 failures + 3 errors (before/after evidence) |
| BE import every module | ✅ all active modules; ❌ only the dead `ai.chunker` (tiktoken) and `ai.prompt_cards` (genanki), as in F0 |
| BE synthetic E2E (re-run on the `b3cc888` clean clone): real `runserver`, real OpenAI SDK → local `/v1/chat/completions` stub via `OPENAI_BASE_URL` (scratch only) | ✅ analyze 6 pages / rec 3 / ranges 1–4,5–5,6–6. Generate 10/10, no warnings, `title="uneven"`, sections `toc` 1–4/5–5/6–6. Hand: ordinals 1..10, pages 1,1,1,2,2,2,5,5,6,6, matching the excerpt pages. TOC equals hand. 7 model calls (3 template + 4 card), each with only its own section's pages. 0 `.chunks.pkl` in `%TEMP%`. Broken PDF → `'broken.pdf'` in `detail` |
| FE clean clone (`git archive a9e1d82`, no `src/env.js`) → `npm ci` | ✅ 711 packages |
| FE `expo export --platform web` | ✅ exit 0; bundle has `API_BASE = "" ‖ "http://127.0.0.1:8000"` |
| FE `EXPO_PUBLIC_API_BASE=http://10.9.8.7:8000/ expo export --platform web --clear` | ✅ value inlined and the trailing slash stripped at runtime |
| FE `expo export --platform android` / `ios` | ✅ exit 0 (native bundling) |
| FE `npx expo-doctor@latest` | ⚠️ 16/18, the **same** two patch-alignment findings as F0 (`@expo/metro-config`, `expo`, `react-native`, `@expo/metro-runtime`, slider). Deferred (owner decision 11 / F5) |

The frontend still has no lint, test or typecheck scripts (unchanged from F0).

### 31.7 Deferred (deliberately not fixed in F0.5)

**New findings:**

1. **Django 5.0.4 is not Python-3.14 compatible.** With `DEBUG=False`, any 5xx triggers the `mail_admins` handler, whose traceback rendering crashes in `Context.__copy__`. `DEBUG=True` (the current default) is unaffected. **F5:** standardise on Python ≤3.13, or move to Django ≥5.2.8 (5.2 LTS), before any `DEBUG=False` deployment.
2. `manage.py check`/`test` still need an `OPENAI_API_KEY` env var (S14), so tests document a placeholder. **F5** (`settings.py`).
3. `_public_error` only rewrites the upload's own temp path; other exception text is still returned verbatim (S7 remainder). **F5.**
4. Expo patch alignment (5 packages) remains. **F5**, or the owner's call.
5. Pipeline limits that remain, in **F5**:
   - nested TOC levels are still flattened into sibling sections (analysis unchanged);
   - duplicate TOC titles still merge into one section at the first range;
   - TOC chunks are trimmed to 3,000 chars;
   - page grounding needs verbatim excerpts;
   - `hand?start_ordinal` is still unimplemented;
   - pre-F0.5 decks have `ordinal = 0`.
6. Dead modules (`ai/chunker.py`, `ai/ingest.py`, `ai/prompt_cards.py`, `inspect.py`) and unused requirements (Pillow, pytesseract, python-docx) are kept. **F5** cleanup.

**Carried over from F0, unchanged:**

- web `Alert.alert` no-op;
- Reset to recommendation;
- inert coverage chips;
- Build stuck on "Uploading…";
- navigation after leaving a build;
- MC double-advance;
- TOC push-stack growth;
- duplicate Template modals;
- landscape layout;
- stale resume state;
- Game 1 placeholder;
- duplex print ordering;
- visual design;
- the `/feedback/` permission mismatch;
- public API security / throttling;
- sequential deck IDs;
- upload limits;
- hard-coded `SECRET_KEY`;
- CORS / `ALLOWED_HOSTS`;
- production DB;
- deployment.

### 31.8 Compatibility notes for F1–F6

- **API contract:** endpoints, request fields and successful response shapes are unchanged. Additions are additive only: `template.sections[].page_source` and `template.toc[].page_source`. The frontend ignores both today; F2/F3 may use `page_source` to show "approximate" honestly.
- **Value changes clients may notice:**
  - `template.title` is the deck name;
  - card `page` values are now correct;
  - `page` is `null` whenever it can't be grounded: "Mixed topics", estimated sections, and multi-page sections whose excerpt wasn't found verbatim. All screens already handle `null`; F2/F3 should show the section's range or "page unknown" rather than inventing one;
  - catch-up cards sort last;
  - card `ordinal` is meaningful (1..N) for new decks;
  - card `section` always equals a template section title (or "Mixed topics").
- **F1–F4 (frontend):** configure the API with `EXPO_PUBLIC_API_BASE` / `.env.local`; never reintroduce a required untracked module. The §26 global criterion (`npm ci && expo export` on a fresh clone) now holds.
- **F5:** extend `flashcards/tests/` rather than starting over. `FakeOpenAI` plus `make_pdf` is the reusable seam, and the scratch HTTP stub pattern (`OPENAI_BASE_URL`) works with the real SDK. Remaining F5 acceptance items from §26: `check --deploy`, throttling, upload limits, path-free errors in general, env-driven settings, plus item 1 above.
- **F6:** fixture page numbers can now come from a real generate run against `make_pdf`-style synthetic documents. The fixture must be shaped exactly like the `hand`/`toc`/`template` responses, including `page_source`.

---

## 32. F1 — Visual foundation

**Workstream:** `FLASH-V2-F1` (2026-10-06). Frontend only, on branch `flashv2/f1-visual-foundation`, based on `9483636d5716528855fffd7f32000b8ee60b9aef` (F0.5 frontend head). The backend was read only: the certified F0.5 SHA `b3cc888acbf2bb493f1033384659c0aadc50c967` was used unmodified for verification. No deployment, no OpenAI calls, no private documents. `master` untouched.

Scope: design tokens, shared primitives, a cross-platform notice/dialog, accessibility and motion conventions, and a **shallow** restyle of every existing screen. No workflow was redesigned. No API, cache or navigation semantics changed (verified by diff audit, §32.10).

### 32.1 Design system

**Identity.** A warm, light study surface with dark ink, one restrained **teal** accent for actions, and a soft **highlighter amber** reserved for the back of study cards. The UC Berkeley Blue/Gold palette and the blurry bear watermark are retired from the UI (§32.4). The product line *Source → Structure → Cards → Study* appears as the brand tagline and as a step strip on the empty Upload screen. The mark is two offset rounded rectangles (a card stack) built from plain Views, with no artwork.

| Token group | Values (see `src/theme/tokens.js`) |
|---|---|
| Surfaces | `bg` #F5F3EE (paper) · `surface` #FFFFFF · `surfaceSunken` #EEEBE4 · `sourceSurface` #FAF8F3 + `sourceRule` #8A8375 |
| Text | `text` #1A2231 (ink) · `textSecondary` #434D5F · `textMuted` #5C6575 · `textOnAccent` #FFFFFF |
| Lines | `border` #E3DED4 (decorative) · `borderStrong` #8A8375 (control boundaries, ≥3:1) |
| Accent | `accent` #0F6B5E · `accentHover` #0C5A4F · `accentPressed` #094A41 · `accentSoft` #E3F0EC · `accentText` #0C5A4F |
| Study card | front #FFFFFF / border #E3DED4 · back `cardBack` #FFF6DF / border #F0D9A2 · `highlightText` #7A4D0B |
| Status | success #1B6E44 / #E5F3EA · warning #7F5300 / #FFF3D6 · error #A8231B / #FCEBE9 · info = accent |
| Focus | `focus` #3157CF (2 px outline, 2 px offset) |
| Spacing | 4-pt scale: 2, 4, 8, 12, 16, 24, 32, 48 |
| Radius | sm 8 · md 12 (buttons, rows) · lg 16 (panels) · xl 24 (study cards) · pill |
| Elevation | `none`, `low`, `medium`, `high`; web uses `boxShadow` (this also removes the RN-web `shadow*` deprecation warning), native uses `shadow*`/`elevation` |
| Type (system fonts, no font loading) | display 32/40 · title 26/32 · heading 18/24 · body 16/24 · small 14/20 · label 15/20 (controls) · meta 12/16 uppercase · cardFront 26/34 · cardBack 22/30 · excerpt 15/22 italic |
| Motion | fast 120 ms (press/hover) · standard 200 ms (panels, dialogs) · deliberate 300 ms (card flip, F3-owned); standard easing `cubic-bezier(0.2,0,0,1)` |
| Layout | breakpoints: tablet 600, desktop 1024 · gutters 16 / 24 / 32 · max widths narrow 640, content 880, wide 1120 · card max 900 · touch target 44 |

**Contrast.** Every text pair used is ≥4.5:1, and every control boundary and focus ring is ≥3:1. This is asserted by `tests/theme.test.mjs` (WCAG 2.x formula; 27 text pairs and 6 non-text pairs).

### 32.2 Theme architecture

- `src/theme/tokens.js`: **pure data**, with no React Native imports, so `node --test` can check it. It is the only place raw colours may appear.
- `src/theme/breakpoints.js`: pure helpers `getBreakpoint`, `resolveGutter`, `resolveMaxWidth` (unit-tested).
- `src/theme/index.js`: the public entry point. It re-exports the tokens and adds `text.*` ready styles, `elevation.*`, `easing.*` (RN `Easing.bezier`) and `webTransition()`.
- `src/styles/theme.js` (the old partial Berkeley token set) is **deleted**. All style files import from `src/theme`.
- **Rule (tested):** no raw hex colours in `src/**` or `App.js` outside `src/theme/`. The one exemption is `src/utils/exportHTML.js`, a standalone printable HTML document. `npm test` fails if a screen adds one.

### 32.3 Shared primitives (`src/ui/`, barrel `src/ui/index.js`)

| Primitive | Purpose |
|---|---|
| `Button` / `IconButton` | The single button. Variants `primary`, `secondary`, `quiet`, `danger`; sizes `sm`/`md`/`lg`, all with a ≥44 px target. Hover, pressed (with a 0.98 scale unless reduced motion), disabled (readable, `aria-disabled`) and `loading` (spinner, `busy`) states. `accessibilityRole="button"`; the label defaults to the title. `IconButton` is a 44×44 square and requires a label |
| `Surface` | Surface roles: `panel`, `raised`, `sunken`, `source` (quote-style left rule). Passing `onPress` makes it an interactive card (role button, hover lift, pressed state) |
| `Screen` | Screen shell: background, safe areas (`react-native-safe-area-context`), responsive gutters, a centred content column with a max width, optional scroll and vertical centring |
| `PageHeader` | App-level header: optional left/right action row, eyebrow, title (exposed as a heading), subtitle |
| `Notice` | Inline status: `info`, `success`, `warning`, `error`. Errors and warnings use `role=alert`/assertive |
| `StatusView` | Full-area loading, empty or error state; F2/F3 add recovery actions via `action` |
| `Chip` / `ChipGroup` | Single-choice pills exposed as `radio` inside a `radiogroup` |
| `Badge` / `MetaLabel` | Non-interactive pill (tones) and the uppercase metadata label |
| `TextField` | Themed input: 44 px, ≥3:1 boundary, accent border while focused |
| `BrandMark` / `CardStackGlyph` / `ProductSteps` | Wordmark and glyph; the Source → Structure → Cards → Study strip |
| `notify` + `NotifyHost` | Cross-platform alert (§32.6) |
| `useReducedMotion`, `useMotionDuration`, `FadeIn`, `USE_NATIVE_DRIVER` | Motion primitives (§32.8) |
| `useLayout` | Window facts: breakpoint, gutter, landscape, web |
| `installWebGlobalStyles` | Web-only global CSS (§32.7) |

`src/components/CardShell.js` (study-card surface) now draws a white index card for the front and a highlighter-amber card for the back, with a 6 px top rule, a hairline border and `elevation.medium`. Its props are unchanged.

### 32.4 Global screen changes and branding

- **Branding:** the Berkeley Blue/Gold palette and the "Berkeley palette" comment are removed. `assets/BEARlogo.png` is no longer referenced or bundled; the file stays in `assets/` and can be deleted later. The app is light throughout, which matches `app.json` `userInterfaceStyle: "light"`. `StatusBar style="dark"` is set in `App.js`. The web document title is "Flashcard Maker" (React Navigation `documentTitle`).
- **App root (`App.js`):** `SafeAreaProvider`, a themed `NavigationContainer` (no white flashes between screens), a `NotifyHost` outside the navigator, web global styles.
- **Stack (`Stack.js`):** routes unchanged. Only `contentStyle` (theme background) changed, plus `animation: "none"` when reduced motion is on.
- **Upload (F2-owned, visual only):** `Screen` (narrow column, vertically centred until a file is chosen), brand header, and a hero panel with the step strip and "Choose PDF". The resume card, source panel, stats, coverage chips, slider, per-section plan (`IconButton` ± and `TextField`) and "Upload & Build" all use primitives. The 96 px empty gradient bar is gone. Every handler is verbatim, so the coverage chips are **still inert** and "Reset to recommendation" is **still a no-op**.
- **Build (F2):** centred `Screen` with a raised panel. The pulsing 📘 emoji is replaced by the pulsing card-stack glyph (static under reduced motion). The error state uses `Notice` with Back/Home buttons. It **still reads "Uploading…"** throughout (not fixed).
- **Picker (F3, visual):** a two-column grid of mode cards (one column on phones) and a "Deck tools" panel holding the four existing actions. **Game 1 is hidden** (§32.5). Visible mode labels changed from "Game 2 — Mastery / Short-answer drill" and "Game 3 — Multiple Choice / Answer with distractors" to **"Flip Drill"** and **"Multiple Choice"** with accurate one-line descriptions. Routes and params are unchanged. The template modal is restyled on a light background with a column-aligned header.
- **Flip Drill (F3, visual):** theme background; Back, TOC, Prev and Next are `Button`s; the source panel uses the `source` surface; the counter uses tabular numbers; loading and error use `StatusView`. The flip target has `role=button` with the label "Show answer"/"Show question". Layout math, swipe and navigation are unchanged.
- **Multiple Choice (F3, visual):** themed options with success/error tints plus coloured text (colour is not the only cue). The 1/2 mode toggle is now `Chip`s, still labelled **1** and **2**, with descriptive accessibility labels. The right/wrong counters are `Badge`s with ✓/✗ glyphs. Prev, Next, Back and TOC are `Button`s. Below 480 px the counter shows "1/4" (spoken "Card 1 of 4"), because 44 px targets left no room for "Card 1/4". The empty deck shows `StatusView` "No cards.".
- **TOC (F3, visual):** a header (Back, Home, Template) in a centred column, a `TextField` search, rows as interactive `Surface`s with an ordinal `Badge`, the page, the section as accent metadata and the question. Safe area now comes from `safe-area-context` on both platforms (it replaces the Android `StatusBar.currentHeight` padding). The list is centred with a max width on web.
- **TemplateBar (F3, visual):** a white bottom bar with a secondary `Button`; the modal is light. Its inline styles moved into the previously unused `TemplateBar.styles.js`. The bar now uses `safe-area-context` (bottom inset on Android edge-to-edge as well).

**Pre-existing header bug fixed (shared presentation):** on web landscape and desktop widths, Flip Drill's and MC's absolutely centred "Card n/N" overlay spanned the top bar and covered the **Back** button. A click on Back hit the overlay and did nothing. I reproduced this on an untouched build of `9483636` at 1440×900. Fix: `pointerEvents: "none"` on the overlay style (`counterLandscape`). There is no navigation change.

### 32.5 Game 1 decision

The "Game 1 — Curate" card is **removed from the Picker**: it was a verified dead-end placeholder (§10, §21). The `Game1` route and `src/Screens/Game1Screen.js` are **kept unchanged**, so nothing that might navigate there breaks. Game 1 was not implemented. If F3 or a later phase builds it, re-add a card in `GamePicker.js` (the comment marks the place).

### 32.6 Alert / dialog foundation

- `notify(title, message?, buttons?)` takes the **same arguments as `Alert.alert`**.
  - **Native:** it calls `Alert.alert` unchanged.
  - **Web:** it queues a themed modal dialog rendered by `<NotifyHost/>`, mounted once in `App.js` outside the navigator, so a dialog raised just before `navigation.reset` survives it (the Build warnings case).
  - Dialogs are shown one at a time in FIFO order. Button styles `cancel` and `destructive` map to secondary and danger buttons. Esc closes (the RN-web Modal's `onRequestClose`; it runs the cancel button, or the only button). Focus is trapped by the RN-web Modal; the dialog has `role=alert`.
  - The queue logic is pure (`src/ui/notifyStore.js`) and covered by `tests/notifyStore.test.mjs`.
- **Migrated:** every `Alert.alert` call in the app. Each was a one-line, same-signature swap, so native behaviour is identical and web goes from silent to visible:
  - Upload: picker failure, "Choose a PDF first".
  - Build: "Some sections had less material" warnings.
  - Picker: export failures, the native "Exported" path, template errors, the dev cache confirmations, "Printed full JSON".
- **Unmigrated Alert usage:** none remains. **Verified** on web: the Build warnings path was triggered with the stub (Cell Division planned 6 > available), the dialog was visible over the Picker, and OK dismissed it. F2/F3 may replace dialogs with inline `Notice`s where that reads better (for example, the Build warnings in-page, per §26 F2).

### 32.7 Accessibility

- **Focus:** web global CSS gives every focusable element a `:focus-visible` outline (2 px `focus` colour, 2 px offset). It covers Pressables not yet migrated (MC options, the flip target). The ring was verified on keyboard Tab to the Picker mode card at all five viewports.
- **Targets:** all primitives are ≥44 px (Back/TOC were 35 px). The deliberate exception is MC options in mobile landscape, which stay 40 px (F4-owned layout).
- **Roles and labels:**
  - `Button`, `IconButton` and interactive `Surface` are buttons with labels (e.g. "Fewer cards for Photosynthesis", "Previous card", "Table of contents").
  - Chips are radios in a radiogroup. `PageHeader` titles are headings.
  - `Notice` uses alert/live regions. The loading state is a progressbar with a label.
  - The flip target is a labelled button; the "Show context" switch is labelled. MC options expose `selected`.
- **Disabled and busy states** keep readable text (`disabledText` on `disabledBg` ≥4.5:1) and set `aria-disabled`/`busy`. Verified on the Picker during export: the mode cards and HTML export are disabled, and "Preparing export…" shows a spinner.
- **Colour is never the only signal:** MC answers add coloured text, the score badges carry ✓/✗, and step numbers are written out.
- **Contrast:** tested (§32.1).

### 32.8 Motion

- `useReducedMotion()` uses one shared subscription. It reads `AccessibilityInfo.isReduceMotionEnabled` and its change events; on web that is `prefers-reduced-motion`, whose MediaQueryList event is handled.
- Under reduced motion:
  - **Card flip is instant:** FlipDrill `duration` is 0, otherwise `motion.duration.deliberate` (300 ms, same as before). Verified: with `prefers-reduced-motion: reduce` emulated, the back face is fully rotated 40 ms after the tap. Normal motion is mid-rotation at 100 ms and complete by 500 ms.
  - The stack has no slide (native).
  - The Build pulse stops.
  - Button and Surface skip the press scale.
  - `FadeIn` is instant.
  - Web CSS transitions are suppressed globally.
- Animated calls now use `USE_NATIVE_DRIVER` (false on web), which silences the RN-web `useNativeDriver` warning.
- **Not changed (F3):** the swipe gesture, the swipe spring, and the flip choreography beyond its duration.

### 32.9 Responsiveness

Scripted walk (headless Edge over DevTools, real Upload → Analyze → Build → Picker → Flip Drill (flip) → Template modal → Picker → MC (answer, endless mode) → TOC → Template). It ran against the **real b3cc888 backend** (a `git archive` in scratch) with a **local LLM stub** behind `OPENAI_BASE_URL` and a synthetic 6-page PDF with an uneven TOC.

| Viewport | Result |
|---|---|
| 390×844 (touch) | walk passes; `scrollWidth == innerWidth` and 0 elements past the right edge on all 12 captured screens |
| 844×390 (touch) | walk passes; no horizontal overflow; MC (all 4 options plus Prev/Next) fits. **Flip Drill landscape debt remains:** the TemplateBar still covers the lower card (F4, unchanged by F1) |
| 768×1024 (touch) | walk passes; no overflow |
| 1280×800 | walk passes; no overflow |
| 1440×900 | walk passes, including the warnings dialog; no overflow; content columns capped (Upload 640, Picker/TOC/template 880, card 900) |

Also verified: the loading state (Flip Drill with a delayed `hand`), the empty state (MC on a missing deck → "No cards."), the error state (TOC fetch failure → error `Notice`), the Build error state (HTTP 500 → `Notice` with Back/Home), the busy/disabled Picker, and the resume card. No console warnings or exceptions were recorded in any walk (log and debug lines filtered).

### 32.10 Contract and correctness preserved

- The diff audit of `src/` and `App.js` shows no changed `fetch`/API/cache/timer lines. Navigation lines changed only by wrapper or indentation, except the removed Game 1 entry.
- `EXPO_PUBLIC_API_BASE` handling (`src/config.js`) is untouched, and no `src/env.js` is required.
- Against b3cc888, analyze returned TOC ranges 1–2/3–4/5–5/6–6, and generate returned `page_source: "toc"`, `template.title` = the deck name, and dense ordinals 1..N with grounded pages.
- **Native:** the `expo export` Android and iOS bundles build (§32.12). No device or simulator run was possible here (unchanged from F0/F0.5).

### 32.11 New configuration

`EXPO_PUBLIC_SHOW_DEV_TOOLS=1` (documented in `.env.example`) shows the Picker's developer controls: "Dev: Clear cache (this deck)", "Dev: Clear ALL cache", and the template modal's "Print full JSON to console". They are hidden by default in dev and production builds. The code is kept.

### 32.12 Checks

| Check | Result |
|---|---|
| `npm ci` | ✅ |
| `npm test` (new script: `node --test`, no dependencies) | ✅ 42 tests: contrast, token scales, breakpoints/gutters, no raw hex, notify queue |
| `expo export --platform web` | ✅ |
| `expo export --platform android` / `ios` | ✅ (1128 / 1125 modules) |
| `npx expo-doctor@latest` | ⚠️ 16/18, the **same** two patch-alignment findings as F0/F0.5 (deferred to F5) |
| Fresh-clone check of the pushed commit | see the final report / commit notes |

### 32.13 Visual debt deliberately left

**F2 (Upload/Build):**

- inert coverage chips;
- Reset no-op;
- plan-sum drift;
- "Uploading…" never advances;
- Home doesn't cancel the build;
- the resume card shows "Deck #N", not the document name;
- the recommendation is a sentence, not a structured summary;
- the section plan is a list, not a "structure map" (`ProductSteps` and `Surface variant="source"` are the intended building blocks).

**F3 (study):**

- MC mode labels "1"/"2";
- MC double-advance;
- excerpt visible before the flip;
- MC has no source context;
- TOC push-stack growth;
- duplicate Template modals (the global `TemplateBus`);
- stale/missing-deck states (Flip Drill still spins forever on an empty deck; the `StatusView` `action` slot is ready for "Back to upload");
- the export button says "PDF" but produces HTML on web;
- printable export (`exportHTML.js`) still uses the old gold card backs and the duplex ordering bug;
- `Game1Screen` itself is unstyled (unreachable).

**F4:**

- web/native landscape Flip Drill (TemplateBar overlap, controls below the fold);
- MC landscape 40 px options and the 1-line question clamp;
- keyboard shortcuts;
- tablet/desktop two-column study layouts (extend `useLayout`/breakpoints rather than adding a parallel system);
- the device pass.

**F5:**

- `expo-linear-gradient` is now unused (remove with the patch alignment);
- `react-native-reanimated`/`gesture-handler` are still unused.

### 32.14 File ownership guidance

| Owner | Files |
|---|---|
| **F1 foundation** (extend rather than fork; keep pure modules RN-free) | `src/theme/*`, `src/ui/*`, `src/components/CardShell.js`, `App.js`, `tests/*`, `npm test` script |
| F2 | `src/Screens/UploadScreen.js`, `src/Screens/BuildScreen.js` and their `styles/screens/*`. Compose from `src/ui` and add F2-specific pieces under `src/components/source/*` |
| F3 | `GamePicker`, `Game1Screen`, `Game2Screen`, `GameMC`, `TOCScreen`, `FlipDrill`, `TemplateBar`, `TemplateBus`, `exportHTML`, `Stack.js` (routing) and their `styles/**` |
| F4 | responsive additions to `src/theme/breakpoints.js` / `src/ui/useLayout.js` (coordinate with F1 owner), plus responsive edits in F3 files after F3 merges |

Conventions for later phases:

1. Never add raw colours. Add a token to `src/theme/tokens.js` (the test enforces this).
2. Use `Button`/`Surface`/`Notice`/`StatusView` before writing a new Pressable or panel.
3. Use `notify()` instead of `Alert.alert`.
4. Gate any new animation with `useReducedMotion()`.
5. Keep touch targets at `layout.touchTarget`.
6. Run `npm test` before committing.

---

## 33. F2 — Source / analyze / build workflow

**Workstream:** `FLASH-V2-F2` (2026-10-06). Frontend only, on branch `flashv2/f2-source-build`, based on `d8a806fa878711bf14c59a2826f2bc2364a4e298` (F1). The backend was read only: the certified `b3cc888acbf2bb493f1033384659c0aadc50c967` (checkout `flash-v2-f05-backend`, unmodified). No deployment, no OpenAI calls, no private documents. `master` untouched (`f60dd52`).

Scope: the real **Source → Structure → Cards** path, from picking a PDF to landing on the Picker. Study screens, TOC, TemplateBar, export and the backend were not touched.

### 33.1 Files

| File | Change |
|---|---|
| `src/source/plan.js` (new, pure) | Plan reducer: analysis snapshot, recommendation, allocation, manual edits, reset, validation, build params, page-range wording, formatters, PDF guard |
| `src/source/api.js` (new, pure) | Endpoint paths, multipart field list, file append, `postMultipart`, typed `RequestError`, human error summaries |
| `src/source/buildRun.js` (new, pure) | Per-request lifecycle guard (`createRun` / `runRequest`), success handoff (`completeBuild`), durations |
| `src/components/source/{SourceCard,StructureSummary,CardCountControl,SectionPlan}.js` (new) | Upload building blocks, composed from `src/ui` |
| `src/Screens/UploadScreen.js`, `src/Screens/BuildScreen.js` + their `styles/screens/*` | Rewritten around the modules above |
| `tests/plan.test.mjs`, `tests/sourceBuild.test.mjs` (new) | 41 deterministic tests (`node --test`, no new dependencies) |

The pure modules import nothing from React or React Native, so `npm test` drives them directly. The screens only wire them to state and navigation.

### 33.2 Upload workflow

1. **Empty:** brand header, step strip, "Choose PDF" (PDF only). The resume card shows when a last deck is saved.
2. **Pick:** the picker is still restricted to `application/pdf`. A file that slips through (for example "All files" in a web dialog) is rejected by `isPdfFile` before any upload: "That file isn't a PDF", **0 requests**. The file is kept as a plain `{uri, name, mimeType, size}` descriptor, so the web `File` object no longer travels in navigation params.
3. **Analyze:** one `POST /analyze/` per pick, abortable. Picking again, pressing Remove, or leaving the screen cancels the in-flight request. A late result from an older pick is ignored (request ids).
4. **Source card:** filename (wraps, including unbroken names; clamped at 3 lines), size, status badge (Analyzing… / Analyzed / Not analyzed), **Replace PDF**, **Remove**.
5. **Structure:** pages, words, sections ("None" when the PDF has no outline), with a one-line note on where the sections come from.
6. **Cards to generate:** your number beside a *Recommended* / *Your choice* badge. Underneath: "Based on the document's N sections · suggested range lo–hi", or "Recommended: N" once changed. A slider sits between labelled −/+ buttons, followed by Reset.
7. **Section plan** (only when the PDF has an outline): one row per section with title, honest page label, and −, numeric input, +. Under the heading: "N cards across M sections · up to 8 per section", plus either "Every section gets at least one card" or "K sections get no cards".
8. **Create N cards:** disabled until analysis succeeds and the plan has at least 3 cards. When blocked, a warning `Notice` says why.

Analysis errors are human-readable and keep the Build button disabled. Recovery offers **Try again** (same file, deliberate) and **Choose another PDF**. The HTTP status appears as secondary text; the server's `detail` goes to the console only.

| Case | Title shown |
|---|---|
| Unreachable server | "Couldn't reach the flashcard server" |
| Unreadable / corrupt PDF | "This file couldn't be read as a PDF" |
| 400 | "The PDF didn't reach the server" |
| 413 | "This PDF is too large" |
| Any other failure | "The server couldn't analyze this PDF" |

### 33.3 Recommendation and Reset (verified bug fixed)

- On analysis, `recommendation = { total: recommended_cards, range: suggested_range, cards: per_section_allocation[].cards }` is snapshotted. If the backend's allocation is incoherent (sum ≠ total, or a section > 8), the snapshot is derived with the same rule instead (defensive; not seen in practice).
- **Reset** restores the snapshot total **and** the per-section allocation, and clears the manual flag. The button is enabled only when something differs from the snapshot. It is a real state transition, not `setCardsWanted(prev => prev)`. Verified live: 11 [7,2,2] → 3 [1,1,1]; manual 20 → 12 ×1 per section; keyboard Enter on the focused button works.
- Manual choices are discarded **only** when a new document is picked (or Remove / Try again starts a fresh analysis).

### 33.4 Coverage-control decision: path C, removed

The trace found no authoritative behaviour.

- **Frontend:** `coverageMode` only ever went into Build route params.
  - `45cf1da` once sent `fd.append("coverage", …)`. It was removed in `2839954`, and no frontend code has sent it since.
  - The "Coverage (pages ≥1 card) %" figure was `cardsWanted / pages`, which is not a real coverage measure.
- **Backend:** no code on `main`/`b3cc888` reads `coverage`. The only hit is a comment in `templater.py`.
  - The unmerged `origin/celery-redis` branch accepts a `coverage` form field and passes it into `build_deck_task(coverage=…)`, which never uses it.
  - `origin/Mogsy` has only the same comment.

Both chips and the derived percentages are therefore **removed**, and `coverage` is no longer put in Build params. Nothing was ever sent to the backend, so the request is unchanged. The honest replacement is the section-plan line "K sections get no cards" / "Every section gets at least one card", computed from the actual allocation.

### 33.5 Allocation behaviour

- **Bounds are the backend's:** total 3–30, 0–8 per section. With sections, the slider maximum is `min(30, 8 × sections)`, so 1 section → 8 and 3 sections → 24, labelled "(max 8 per section)".
- **Automatic redistribution** (slider or −/+ while the plan is not manual):
  - `shareAllocation` mirrors `analysis.py` exactly for any total: one card each first, the rest by word share with Python's half-to-even `round`, then normalised round-robin.
  - `capAllocation` then moves any excess over 8 to the following sections. The sum always equals the total.
  - At the recommended total, the snapshot is used verbatim.
  - Seventeen (words, total) cases were produced by **executing the backend's own allocation block** in Python and frozen as test fixtures; the JS mirror matches all of them.
- **Manual edits** (−/+ or typing):
  - Values are clamped to 0–8, and further so the deck stays ≤ 30. The total becomes the sum, deterministically.
  - The plan is marked **Edited**. The slider and total −/+ are disabled, with "The total follows your section edits. Reset to use the slider again."
  - The slider never silently overwrites manual edits. Editing back to exactly the recommendation clears the manual flag.
- A manual plan under 3 cards is allowed transiently, but Build is blocked with "Plan at least 3 cards in total".
- Page ranges are the analysis' own `page_start`/`page_end`, passed through untouched; `null` stays `null`.
- **Wording** (`formatPageRange`):
  - "Pages 1–4" / "Page 5";
  - `page_source: "estimated"` → "About pages 3–4";
  - missing start → "Page unknown".

  Analysis does not emit `page_source` today; the wording is ready for it.

### 33.6 Build semantics

- **One request per attempt.** Mount = attempt 0. No StrictMode, so no double effect. "Try again" is the only way to make another attempt; it is guarded against a double press (verified: two presses → 1 request). There are no automatic retries.
- **Working state** is honestly indeterminate. The title is "Creating your deck…". The panel shows:
  - the filename and "N cards requested · K sections";
  - a pulsing glyph with `role=progressbar` "Creating your deck" (static under reduced motion);
  - a static `SOURCE → STRUCTURE → CARDS` caption;
  - an `m:ss elapsed` timer;
  - "The server reads your PDF and writes cards for each section in one step, so there is no live progress to show";
  - **Cancel**.

  There are no fake stages, percentages, or "Uploading…".
- **Success without warnings:** the storage writes (`saveLastDeck`, `saveTemplate`) are *issued* synchronously, without being awaited, and then `navigation.reset → Picker {deckId, buildMs}` runs.
  - Previously the writes ran in a `setTimeout` after navigation. That was not a user-visible race: the Picker reads the template only on click and gets `buildMs` from params. Ordering is now deterministic at no cost (on web the localStorage write lands before navigation).
  - A failed write is logged and never blocks navigation.
- **Success with warnings** (verified bug: they were a dialog that raced navigation):
  - Build stays on "Your deck is ready", showing "N cards created · Built in …" and a warning `Notice` listing every backend warning verbatim. The deck is already saved for resume.
  - **Start studying** goes to the Picker; **Home** goes to Upload.
  - Warnings are never treated as failure.
- **Failure:** "The deck wasn't created", with an error `Notice` (`role=alert`, announced) and "Server response: HTTP n". Buttons: **Try again**, **Back to plan** (the plan is preserved), **Home**. The timer stops. The full `RequestError` is logged with `console.error`.

  | Case | Message |
  |---|---|
  | Zero cards | "No cards could be written" (neutral: the cause may be the document or the model) |
  | Unreadable PDF | "This file couldn't be read as a PDF" |
  | Unreachable server | "No deck was created…" |
  | Anything else | "The deck couldn't be built" |

- `buildMs` is the server `metrics.total_ms` if one ever appears; otherwise it is measured from the attempt start, as before.

### 33.7 Leaving Build (verified bug fixed)

Cancel, Home, Back, Try-again and the OS back gesture all unmount the attempt's effect. Cleanup does two things:

- `run.cancel()` aborts the `AbortController` (fetch on web and RN 0.79) **and** marks the run inactive;
- it clears the timer.

`runRequest` drops any late success or failure from an inactive run: no navigation, no storage write, no `setState`. Even on a platform whose fetch ignores the abort, the inactive flag alone holds (tested).

Live proof: with a 1.5 s-per-call stub, Cancel at ~1.0 s produced the following.

- The generate request ended `AbortError` at 1002 ms.
- The user stayed on Upload with the plan intact.
- After 14 s: 0 further API calls, and `last_deck_meta` was still the previous deck, with no new `template:*` key.
- The backend kept working and created that deck server-side. Django logged "Broken pipe" when it tried to answer. This is expected: server-side cancellation is **not** in scope (F5).

### 33.8 Request contract (unchanged, verified in the browser network log)

- `POST {API_BASE}/api/flashcards/analyze/` — multipart: `file` only. Exactly one per pick or retry.
- `POST {API_BASE}/api/flashcards/generate/` — multipart, in this order:
  - `file` (web: a `File` with the original name and type; native: `{uri,name,type}`);
  - `deck_name` (the filename without `.pdf`);
  - `cards_wanted` (3–30; it equals the plan total, so it is coherent with the allocations the backend sums);
  - `allocations` (a JSON array of `{title, page_start, page_end, cards}`, sent only when the PDF has sections).

  Exactly one per attempt. No `coverage` or any other new field.
- Responses consumed:
  - analyze: `pages`, `words`, `recommended_cards`, `suggested_range`, `per_section_allocation`;
  - generate: `deck_id`, `cards_created`, `warnings`, `template` (plus `metrics.total_ms` if ever present).
- `EXPO_PUBLIC_API_BASE` / `src/config.js` are untouched.

### 33.9 Tests and checks

| Check | Result |
|---|---|
| `npm ci` | ✅ |
| `npm test` | ✅ **83/83**: the 42 F1 tests plus 41 F2 tests (backend-allocation fixtures, Reset, redistribution sum = total, manual preservation, clamps, build gating, contract fields, error copy without paths, the leave-build race (abortable and non-abortable fetch, late success and late failure), write-before-navigate ordering, warnings flow, no automatic retry, formatters, PDF guard) |
| No raw hex outside `src/theme` | ✅ (F1 test) |
| `expo export --platform web` / `android` / `ios` | ✅ (Android 1135, iOS 1132 modules) |
| `npx expo-doctor@latest` | ⚠️ 16/18, the same two patch-alignment findings as F0–F1 (F5) |

### 33.10 Live verification

Setup:

- the exported web bundle served statically;
- the real `b3cc888` backend (a `git archive` in scratch, Python 3.14 venv);
- a local OpenAI-compatible stub behind `OPENAI_BASE_URL` that reuses the backend's own `flashcards/tests/fakes.FakeOpenAI`, with runtime delay/fail knobs;
- synthetic PDFs only: uneven TOC 1–4/5/6, no outline, a 12-section PDF with long and unbroken titles and a very long unbroken filename, a corrupt PDF, and a `.txt`.

Verified:

- pick → one analyze;
- recommendation 3 / range 3–4 / [1,1,1] with real ranges;
- total +3 → 6 [4,1,1] (the backend rule);
- section edit → Edited + locked slider;
- Reset;
- the 8-per-section cap;
- the no-outline total-only plan and its Reset;
- generate with Photosynthesis = 6 → exact fields, the warning shown in-page, the deck saved, Start studying → Picker `Deck #1`;
- the template opened from cache with 0 API calls (`title = "uneven-toc"`, ranges `toc`);
- the leave-build race (§33.7);
- the generate error → Try again ×2 → one request → Picker;
- the analyze errors: non-PDF (0 requests), corrupt PDF, network failure → Try again;
- the resume card (document name, card count) → Resume → Picker;
- slider `aria-valuemin/max/now/valuetext` and `aria-disabled` when locked;
- every button, input and slider at least 44 px.

| Viewport | Upload (12 sections) | Build working | Build error |
|---|---|---|---|
| 390×844 | ✅ `scrollWidth == innerWidth`, 0 elements past the edge | ✅ | ✅ |
| 844×390 | ✅ | ✅ (scrolls vertically; Cancel reachable) | ✅ |
| 768×1024 | ✅ | ✅ | ✅ |
| 1280×800 | ✅ | ✅ | ✅ |
| 1440×900 | ✅ (640 px column) | ✅ | ✅ |

**Not verified:** native devices (no simulator here; only native bundling), and emulated `prefers-reduced-motion` on the Build pulse. The reduced-motion code path is unchanged from F1 apart from also stopping the pulse once Build leaves the working state.

### 33.11 Notes and remaining debt

- **On web the stack keeps Upload mounted under Build** (native-stack behaviour), which is why Back/Cancel returns to an intact plan.
- **expo-document-picker on web:**
  - it returns a data-URL `uri` (base64 read of the whole file), which is pre-existing; very large PDFs pay that cost twice (analyze and generate);
  - a cancelled web pick leaves its hidden `<input>` in the DOM (library behaviour).
- **F3** (compatible; nothing in F3 files changed):
  - Picker still says "Deck #N" and "built in 0:00" for sub-second builds (its own formatter);
  - stale/missing-deck states;
  - the template modal header;
  - the remaining study-screen debt from §32.13.

  The Picker receives the same `{deckId, buildMs}` params, and the cache keys/shape are unchanged (no `VERSION` bump).
- **F4:**
  - the web slider is a non-focusable View from `@react-native-community/slider` (no arrow-key support); the labelled −/+ buttons are the keyboard path. A native `<input type=range>` on web would be an F4 option;
  - responsive two-column Upload on desktop is not attempted.
- **F5:**
  - server-side cancellation of abandoned generates;
  - the `catch-up "Mixed topics"` fill means `cards_created` can exceed a section's planned count while warnings still list shortfalls (the warnings are the backend's, shown verbatim);
  - Expo patch alignment.

---

## 34. F3 — Study experience

**Workstream:** `FLASH-V2-F3` (2026-10-06). Frontend only, on branch `flashv2/f3-study-experience`, based on `332e020c2510fb78460a36c3b87d9fbb938a18b0` (F2). The backend was read only: the certified `b3cc888acbf2bb493f1033384659c0aadc50c967` (checkout `flash-v2-f05-backend`, unmodified; a `git archive` of it ran in scratch). No deployment, no OpenAI calls, no private documents. `master` untouched (`f60dd52`).

Scope: **Cards → Study**. Picker, Flip Drill, Multiple Choice, source reveal, TOC, study template, study navigation, load/empty/missing/error states, and the export corrections that touch study. Upload, Build, `src/source/*` and the backend were not changed. No new modes; Game 1 stays hidden.

### 34.1 Files

| File | Change |
|---|---|
| `src/study/deck.js` (new, pure) | Deck identity (title rules), build-time wording, load-state normalisation, human state copy, stale-hand detection, export file stem |
| `src/study/deckApi.js` (new, pure) | `hand`/`toc` URLs (contract unchanged), `getJSON` with a 20 s timeout, payload validation, cache-first loading, the Picker's `verifyDeck` |
| `src/study/provenance.js` (new, pure) | Page labels, section-range wording, the source-reveal rule |
| `src/study/mc.js` (new, pure) | MC reducer (`step` token), single-timer `createAdvanceTimer`, auto-advance rule, options, option labels, scoring-mode labels |
| `src/study/tocNav.js` (new, pure) | Navigation actions: TOC jump (`POP_TO`), open TOC, back to deck/Upload |
| `src/study/template.js` (new, pure) | Rebuilt-outline template (honest pages), counts, range wording |
| `src/study/printable.js` (new, pure) | Printable cards HTML: duplex page and column order, F1 colours |
| `src/study/useDeck.js` (new) | React seam: `useDeckHand`, `useDeckToc`, `useDeckCheck`, `useSavedTemplate`, `loadTemplateForViewing`, swappable `deckSource` (for F6) |
| `src/components/study/{TemplateSheet,SourcePanel,DeckStatus}.js` (new) | The one template viewer; the shared source panel; full-screen states with recovery actions |
| `src/Screens/{GamePicker,Game2Screen,GameMC,TOCScreen}.js`, `src/components/{FlipDrill,TemplateBar}.js` | Rewired to the modules above |
| `src/utils/TemplateBus.js` | **Deleted** (global "open template" bus) |
| `src/utils/cache.js` | Added `forgetDeck(deckId)` and the `deckStore` adapter. Keys, TTL and `VERSION` unchanged |
| `src/utils/exportHTML.js` | Now only saves/shares; the document comes from `src/study/printable.js` |
| study `styles/**` + new `SourcePanel.styles.js` | Study styles only |
| `tests/study{Deck,Provenance,Mc,Nav}.test.mjs` (new) | 66 tests |

Every `src/study/*.js` module except `useDeck.js` imports nothing from React/React Native, so `npm test` drives them directly. They import each other with explicit `.js` extensions, which Metro resolves unchanged.

### 34.2 Picker

- **Identity.** The headline is the document's name:
  - first the resume metadata saved by Build (`last_deck_meta.name`, only when its `deckId` matches);
  - then the saved template's `title` (= `deck_name` since F0.5).

  Titles that are server artefacts are rejected: the pre-F0.5 temp stem (`tmpgy0tbwcp`) and `Deck` / `Deck 12`. With no trustworthy title the headline is **"Untitled deck"**; nothing is invented.
- **Subtitle:** "12 cards · Built in under a second · Deck #2". The id is secondary.
  - The card count is the server's (from the check). It falls back to the saved count; for a missing deck no count is shown.
  - Build time uses F2's `formatDuration`: "Built in under a second", "42 seconds", "2 min 05 s". Never `0:00`. The route `buildMs` (fresh build) wins over the saved one.
- **Header:** a **New deck** button returns to Upload. After Build's `reset`, the Picker is the stack root, so before F3 there was no way back on web.
- **Modes:** "Flip Drill" and "Multiple Choice" with descriptions of what they actually do. While the deck is being checked, the mode cards read "Checking deck…" and are disabled.
- **Deck tools:** Table of contents, Study template, and export (§34.11).
- **Dev tools** (`EXPO_PUBLIC_SHOW_DEV_TOOLS=1`): unchanged, plus "Dev: Print template JSON". The template is no longer logged to the console on every open.

### 34.3 Deck validation: stale and missing decks

The backend can't distinguish "deleted" from "no cards": `hand` and `toc` both return `200 []` for an unknown id. Since `generate_deck` only creates a deck row after cards exist, `[]` in practice means "not on this server".

- **Check before study.** Each Picker visit makes **one** `GET /toc/?deck_id` (never answered from cache). `toc` is the narrowest existing endpoint: AllowAny, with no answers, excerpts or distractors.
  - **Non-empty:** the result refreshes the toc cache. A cached hand whose card ids (in order) differ from the server's is dropped, which covers a reused id or a rebuilt deck.
  - **Empty:** the hand and toc caches for that id are dropped.
- **States:**
  - `loading`: "Checking deck…".
  - `ready`.
  - `missing`: `[]`, and this device has evidence the deck had cards (resume `cardsCount > 0`, or a saved template). Copy: "This saved deck is no longer available — The server has no cards for deck #N. It may have been deleted, or the server's data was reset. The copy saved on this device is out of date."
  - `empty`: `[]` without such evidence. Copy: "This deck has no cards".
  - `error`, with a reason:
    - `network`: "Couldn't reach the flashcard server" (including the 20 s timeout);
    - `http`: "The server couldn't load this deck", plus "Server response: HTTP n" as secondary text;
    - `malformed`: "The server sent an unexpected response";
    - `no-deck`: "No deck selected".

  No server text is shown in the UI; the full error goes to `console.warn`.
- **Missing or empty:** the modes and tools are hidden. A warning notice offers **Back to Upload** and **Forget this deck**. Forget removes this deck's hand, TOC and template, plus the resume entry if it points at this deck. Other decks' cache is untouched (verified live). Nothing is rebuilt or regenerated automatically.
- **Network error:** a warning notice with **Try again**. Modes stay enabled with the note "it will use the copy saved on this device, if there is one".
  - Verified live with the backend stopped: Flip Drill and TOC worked from cache; a deck with no cache showed the study screen's own error with Try again.
  - After restarting the server, Try again loaded it with one request.
- **Every study screen** (Flip Drill, MC, TOC) has the same explicit states via `DeckStatus`, and none of them can end in a spinner.
  - Recovery actions: **Try again** (errors; forces the network), **Back to deck** (errors), **Back to Upload** (always), **Forget this deck** (missing/empty).
  - A deck deleted *after* the Picker's check reaches "no longer available" in about 100 ms (verified for Flip Drill and MC).
- **Timeout.** Every study GET gives up after 20 s as a network error, even if the platform's fetch ignores the abort (tested with a never-settling fetch). Unmount aborts the request, and the late result is ignored.

### 34.4 Cache and resume

Precedence (keys, TTL and `VERSION = 2` unchanged; no migration):

| Data | Source order |
|---|---|
| hand (`deck:<id>:hand:doc:all`, 6 h) | cached **non-empty** list → server. Shared by Flip Drill, MC, export and the rebuilt template |
| toc (`deck:<id>:toc`, 6 h) | the Picker always asks the server (and refreshes the cache); the TOC screen uses cache → server |
| template (`template:<id>`, no TTL) | saved by Build → else an outline rebuilt from the hand (§34.10) |
| resume (`last_deck_meta`) | written by Build (F2), read by Upload and the Picker |

- **Empty results are never cached any more.** Before F3, `fetchWithCache` stored `[]` for 6 h. A cached `[]` is now ignored and re-fetched.
- A stale cached hand can no longer mask a missing deck:
  - the Picker's check drops it;
  - the study screens never trust a cached `[]`;
  - a reused id is caught by the card-id comparison.
- Healthy cache is never cleared: a network failure during the check leaves it alone (tested).
- `fetchWithCache` stays in `cache.js` for compatibility, but the study screens no longer use it.
- Request counts observed live: a Picker visit makes 1 `toc` request; the first study screen makes 1 `hand` request. After that, MC, TOC (fresh from the check), template and export make none.

### 34.5 Flip Drill

- **Structure:** question → think → tap to reveal → source → next.
  - The card faces are labelled "QUESTION" / "ANSWER" in text, with the hints "Tap the card to show the answer" / "Tap to see the question again". The colour change is not the only cue.
  - Counter: "Card 3 of 10" (a polite live region).
  - Buttons: **Back** ("Back to deck"), **Contents** ("Table of contents"), **Previous**, **Next**.
- **Flip target:** a button labelled "Question: …? Show the answer" / "Answer: …. Show the question", with `expanded` state.
  - The hidden face is `aria-hidden` and hidden from native accessibility.
  - The back's text isn't rendered at all until the first reveal on that card visit, so the answer isn't in the DOM before reveal (verified).
- **Card changes always land on the question side, instantly** (Next, Previous, swipe, TOC jump, initial load, resume).
  - `goTo()` stops the flip animation and sets it to 0 before the new card renders.
  - Before F3, the flip animated back over 300 ms *with the next card's content*, briefly showing its answer.
  - Verified live: 16 ms after Next from a flipped card, the answer face is already turned away.
- **Preserved:** tap to flip; the 300 ms flip (0 under reduced motion); wrap-around; the layout math.
  - Swipe still uses `PanResponder`: it activates past 20 px and triggers past ±100 px (verified with mouse drags of −300, +300 and −60 px).
  - Haptics are kept, now guarded so an unsupported platform never rejects.
  - Swipe handlers now read the latest state through a ref (the old responder was memoised on `cards.length` only).
  - The spring-back respects reduced motion, and also runs on `onPanResponderTerminate`.
- **Compatibility fix (§21, web only).** In landscape windows tall enough that the card can stay ≥300 px, the card reserves 360 px below it for the source panel, Previous/Next and the template bar.
  - Before F3 (baseline measured live at 1280×800), Next sat at y 780–824 under the template bar, and a click on its centre hit the bar. It is now at 664–708 and clickable.
  - At 1440×900 the card is 524 px tall instead of 540.
  - Short landscape (844×390) keeps the old rule, so the card is unchanged; that layout remains F4's.

### 34.6 Source reveal and page provenance

- **Reveal rule** (`sourceView`, tested).
  - Before the learner commits (Flip Drill: first flip on this card visit; MC: an answer), the panel shows only **Section**, **Page**, the context tag, and "The source excerpt appears after you reveal the answer."
  - The excerpt is the passage the answer came from. With the synthetic deck, the excerpt "…item 1 is token1x1." contains the answer "token1x1".
  - After the reveal, the excerpt shows as a quotation (clipped at 360 characters) with a "Show source excerpt" switch.
  - Flipping back to the question keeps the excerpt visible, because the learner has already committed.
- **Page wording** (`cardPageLabel`, `cardProvenance`):
  - an exact page → "Page 5";
  - `null`, or anything that isn't an integer ≥1 → **"Page unknown"**, never page 1;
  - when the card's page is unknown but its section has a real range in the saved template, the range is added and labelled as the section's: "Page unknown · Section covers pages 1–4";
  - estimated ranges read "Section covers about pages 3–4";
  - "Mixed topics" has no range, and rebuilt-outline ranges are never used this way.
- **Live check** (paraphrase deck from the stub):
  - TOC rows read "Page 5", "Page 6" and "Page unknown", with unknown pages last and dense ordinals 1–6;
  - the Cells card reads "Page unknown · Section covers pages 1–4";
  - "Mixed topics" cards read "Page unknown".
- **TOC rows:** "Page 5" / "Page unknown" (italic, not bold). The accessible name includes the ordinal, page and section.

### 34.7 Multiple Choice

- **State machine** (`mcReducer`). Idle → answered (first press only) → `auto`, `next`, `prev` or `jump` → idle on the new card.
  - Every move increments `step`.
  - `load` resets the score; a TOC `jump` keeps it; switching mode resets it.
- **Answers:**
  - Options are buttons named "Option B: text", with the letter shown.
  - After answering, all options are disabled.
  - The correct option shows "✓ Correct answer" (or "✓ Correct — your answer"); a wrong pick shows "✗ Your answer — incorrect". The others are muted, with text still ≥4.5:1.
  - A polite status line reads "Correct. Moving to the next card…" or "Not quite. The correct answer is marked. Press Next when you're ready."
  - In short landscape the ✓/✗ takes the letter's place, so options keep their baseline height. Accessible labels keep the full wording.
- **Auto-advance (deliberate product change; confirm with the owner):**
  - After a **correct** answer it auto-advances (700 ms, as before), except on the **last card**.
  - After a **wrong** answer the card **waits**, so the correct answer and its source can be read; Next continues.
  - On the last card the status adds "That was the last card. Next goes back to card 1." Manual Next and Previous still wrap, as before.
- **Source after answering:** a `SourcePanel` (section, page, excerpt) below the options. In short landscape the status line and source go below the controls, so the controls keep their place.
- **Scoring labels:** the chips "1"/"2" are now **Practice** ("answers are not counted") and **Keep score** ("counts right and wrong answers on this device"). They moved from the top bar to under the controls, where the descriptive labels fit at 390 px. There are no points or XP, and nothing leaves the device.
- **Rapid presses:** the first answer wins and is scored once (verified live: three quick presses → 1 wrong).

### 34.8 MC double-advance fix

**Reproduced first.** `studyMc.test.mjs` simulates the old code on a fake clock: on card 2, answer, press Next at 300 ms, timer fires at 700 ms → card 4 (card 3 skipped).

**Fix: two independent guards.**

1. **One timer.** `createAdvanceTimer` keeps **at most one** pending timer.
   - GameMC schedules it from an effect keyed on `(step, autoAdvance)`, so any position change cancels it in the effect cleanup.
   - Next, Previous and TOC jumps also cancel it explicitly, as do the navigation `blur` event (TOC opened on top) and unmount.
2. **Step check.** The timer dispatches `{type: "auto", step}`. The reducer ignores it unless all three hold:
   - `step` still belongs to the answered card's visit;
   - the card is answered;
   - it isn't the last card.

   So even a stale timer that survives cannot move a later card (tested by deliberately not cancelling it).

**Verified live:**

- correct answer → exactly one advance;
- answer, then Next at 200 ms → one card (2 → 3), still on 3 after 1.5 s;
- TOC jump during the pending advance → lands on the chosen card, unanswered, with no further move;
- final card → no wrap.

### 34.9 Feedback endpoint: decision B (left unwired)

`POST /api/flashcards/feedback/` `{right:[ids], wrong:[ids]}` exists in `b3cc888` (`views.py:347`), but:

- it keeps DRF's default `IsAuthenticatedOrReadOnly`, so **anonymous POSTs get 403**, and the app has no accounts or login;
- `SessionAuthentication` would also require CSRF;
- the frontend has never called it;
- the counters would be global per card across every anonymous user;
- F0 §30 item 14 recommended leaving it unused.

Wiring it would mean either a request that always fails or a backend permission change, which is out of scope. **No request is made.** The MC "Keep score" tally stays on the device. If F5 opens the permission, the natural hook is the reducer's accepted `answer` action: once per answered card, non-blocking.

### 34.10 TOC navigation and template ownership

**Stack growth (verified bug, reproduced first).** The old `navigate(returnTo, …)` pushed a study screen per jump. Driving the real React Navigation 7.4.1 `StackRouter` from `node --test`, 5 jumps produced 12 routes.

- A jump now dispatches **`POP_TO`** (`tocJumpAction`):
  - if the study screen is below the TOC, the stack pops back to it and replaces its params (same route key, no remount);
  - if it isn't (the TOC was opened from the Picker), the TOC route is replaced by the study screen.
- Each jump carries a fresh `jump` token, so jumping again to the ordinal already in the params still moves the card.
- Router test: 5 open/jump cycles keep `[Picker, Game2]` with the same key, and one Back returns to the Picker.
- Live: across 5 cycles, exactly one TOC search input and one study screen are mounted at the TOC, and only the study screen remains after each jump. Every jump lands on the requested card, question side up.

**TOC screen:**

- the search is labelled "Search cards by section or question";
- a live count line reads "12 cards in document order" or "2 of 12 cards match";
- an empty result reads "No cards match "…"";
- the current card is marked "Current" (from `currentOrdinal`, passed by the study screen);
- header buttons: **Back** ("Back to studying"), **Deck** (to the Picker), **Template**.

**Template duplication (verified bug).** The TOC's Template button fired a global `TemplateBus`, so every mounted `TemplateBar` opened a modal: the visible one under Flip Drill, and the TOC's hidden ones.

- The bus is **deleted**. There is one `TemplateSheet` component and one owner per surface:
  - the Picker owns one;
  - the Flip Drill's `TemplateBar` owns one, opened by its own button;
  - the TOC owns one and no longer renders hidden TemplateBars.
- Tests assert this structurally.
- Live, with the pane rendering: opening from the Picker, from the bar, and from the TOC over a mounted Flip Drill each gives exactly 1 modal, and one Close gives 0.

**Sheet content:**

- "Study template", the deck title (only when trustworthy) and "3 sections · 18 key points";
- per section: the title, "Pages 1–4 · 6 points" ("About pages …" for estimated ranges, "Pages unknown" when absent), then each point's question and answer;
- a rebuilt outline is labelled "Rebuilt from your cards", with ranges as "Cards from pages 2–4". It no longer turns missing pages into page 1, as the pre-F3 Picker fallback did;
- the slide animation is off under reduced motion, as in `NotifyHost`.

### 34.11 Export / print

- **Labels tell the truth.**
  - Web has one button, "Download printable cards (HTML)". The duplicate "Export / Share PDF" (which downloaded the same HTML on web) is gone.
  - Native has "Share printable cards (HTML)" (share sheet, `text/html`) and "Export PDF" (`expo-print` → a real PDF).
- **Names.** File names and the print title use the deck title (`uneven-toc-cards.html`), else `deck-<id>-cards.html`.
- **Duplex fixed** (verified bugs, pure tests):
  - Back rows are mirrored for a long-edge flip, with an empty cell for a short last row.
  - Pages alternate question sheet / answer sheet. Before F3 all question pages came first, so with more than 6 cards a duplex printer put question sheet 2 on the back of sheet 1.
  - The instructions block and sheet headings print only on screen, so they never shift the pairing.
  - Checked on deck 2: sheet 1's back reads token1x2 | token1x1 | token2x1 | token1x3 | …
- **Styling.** The print CSS uses F1 tokens imported from `src/theme/tokens.js`: white question cards with a teal rule, amber answer cards, ink text, dashed cut lines. Cards carry a small "Question" / "Answer" label. The Berkeley gold `#ffcd00` is gone (tested).
- **Not verified:** a physical duplex print, and native PDF/share (no device; only the bundles were built).

### 34.12 Accessibility

- **Flip target:** a labelled button with `expanded` state; the hidden face is hidden from assistive tech; the face labels are written out.
- **MC options:** buttons named "Option A: …" plus the result after answering, with `disabled`/`selected` states and ✓/✗ text, so the result isn't conveyed by colour alone.
- **Scoring chips:** radios with descriptive labels.
- **Counters:** polite live regions.
- **States:** missing, empty and error states use `Notice` (`role=alert`); loading is a `progressbar` with a label.
- **Labels:** the TOC search is labelled; the template Close button is labelled "Close study template".
- **Targets:** every control measured ≥44 px at 390, 768 and 1280 (MC options 50–56 px). F1's exception, 40 px MC options in short landscape, is unchanged.
- **Keyboard:** no new shortcuts (that's F4). Pressables keep Enter/Space activation and the F1 focus ring.

### 34.13 Tests and checks

| Check | Result |
|---|---|
| `npm ci` | ✅ |
| `npm test` | ✅ **149/149** (the 83 F1/F2 tests plus 66 F3 tests) |
| `expo export --platform web` / `android` / `ios` | ✅ all three exit 0 |
| `npx expo-doctor@latest` | ⚠️ 16/18: the same two patch-alignment findings as F0–F2 (F5) |

The 66 F3 tests:

- **`studyDeck` (26):**
  - identity and title rules; "under a second" build time;
  - load states, and human copy without server text;
  - the request contract;
  - cache precedence: a cached hand is used with 0 requests; `[]` is never cached or trusted;
  - missing-deck validation drops the stale hand; reused ids are caught; a healthy cache is kept; a network failure leaves the cache;
  - timeout; abort.
- **`studyProvenance` (11):**
  - the excerpt is hidden before reveal and shown after; no answer text appears in pre-reveal output;
  - "Page unknown", never page 1; the section range for unknown pages; "about" for estimated ranges;
  - an honest rebuilt template.
- **`studyMc` (17):**
  - the old skip reproduced; no double advance; a stale timer is ignored;
  - Previous, jump and unmount cancel; only one timer is ever pending;
  - rapid answers are scored once; wrong answers wait; the final card doesn't wrap;
  - options; labels aren't colour-only; scoring labels aren't digits.
- **`studyNav` (12):**
  - the old stack growth reproduced in the real `StackRouter`;
  - 5 cycles stay bounded on the same screen; MC returns to MC; the TOC works when opened from the Picker; the same-ordinal jump token;
  - no `TemplateBus`; one sheet per owner;
  - duplex mirroring and page interleaving; F1 colours, no legacy gold; truthful export labels.

Each fix was also mutation-checked: removing the excerpt gate, the `step` guard, `POP_TO`, the row mirroring, or the "never cache `[]`" rule makes its tests fail.

### 34.14 Live verification

**Setup:**

- the exported web bundle, served statically;
- the real `b3cc888` backend from a `git archive` (Python 3.14 venv);
- a local OpenAI-compatible stub behind `OPENAI_BASE_URL`, reusing `flashcards/tests/fakes.FakeOpenAI`, with a paraphrase switch;
- synthetic PDFs only: an uneven TOC (1–4 / 5 / 6) and a 4-page two-section PDF.

**Decks.** They were created through the unchanged `generate` contract. The browser storage was then seeded exactly as Build's `completeBuild` writes it (`last_deck_meta`, `template:<id>`), because the built-in browser can't drive the native file dialog. Covered:

- a normal deck;
- a warnings-built deck ("Photosynthesis: requested 6, generated 3", plus 3 "Mixed topics" cards with `page = null`);
- a paraphrased deck (Cells cards with `page = null`);
- a pre-F0.5-style deck (temp-stem template title) → "Untitled deck";
- an unknown id → empty;
- decks deleted from the scratch DB → missing.

**Viewports.** On every screen checked — the Picker, Flip Drill (front and revealed), TOC, the template sheet, and MC (idle and answered) — `scrollWidth == innerWidth` and no element extends past the right edge.

| Viewport | Result |
|---|---|
| 390×844 | ✅ No overflow. Flip Drill Next is in view after reveal. MC shows all 4 options and Next before and after answering. Targets ≥44 px |
| 768×1024 | ✅ No overflow; everything in view |
| 1280×800 | ✅ No overflow. Flip Drill Next is clear of the template bar (fixed, §34.5). MC in view |
| 1440×900 | ✅ No overflow. Next at 764–808, above the bar at 848 |
| 844×390 (smoke) | ✅ No horizontal overflow. Compared live with an untouched `332e020` build: the Flip Drill card is identical and Next sits 30 px *higher* (still below the fold; F4 debt). On MC's touch branch (`(hover: hover)` patched false), option and Next positions are identical before and after answering. Without touch emulation, the emulator takes MC's desktop branch, where the content now scrolls instead of being cut off |

**Environment caveat.** While hidden, the built-in browser pane paints no frames (`requestAnimationFrame` count 0), so CSS animations never end. The template open/close counts were therefore re-verified with the pane visible. For layout measurement only, open sheets were measured with animations disabled.

**Not verified:** native devices; emulated `prefers-reduced-motion` (the code paths are F1's plus `animationType="none"`); a physical print.

### 34.15 Remaining debt

**F4 (responsive / keyboard / device):**

- Short-landscape Flip Drill: at 844×390 the template bar covers the lower card, and Previous/Next sit below the fold. This is unchanged from before, though the source panel is now shorter before reveal.
- Short-landscape MC: 40 px options and the one-line question clamp.
- A desktop/tablet two-column study layout.
- Keyboard shortcuts (←/→, Space, 1–4, Esc).
- MC's `isDesktopWeb` hover heuristic: a narrow desktop window takes the desktop branch.
- The TOC list doesn't scroll to the current card (FlatList without `getItemLayout`).
- Browser back/forward (no linking config).
- The native device pass: gestures, haptics, PDF/share.

**F5 (backend / platform):**

- The `/feedback/` permission (§34.9).
- A real "not found" from `hand`/`toc` (today both return `200 []`).
- `hand?start_ordinal` is still unimplemented (jumps are client-side by design).
- Deck ids aren't namespaced by API base. A reused id is now detected by card ids, but only when the Picker checks.
- Expo patch alignment.
- `fetchWithCache` in `cache.js` can be removed once nothing imports it.

**F6:** `useDeck`'s `deckSource` is the seam for a fixture deck (`loadHand` / `loadToc` / `verifyDeck` / `loadIdentity`). Fixtures must be shaped exactly like the `hand`, `toc` and `template` responses.

**Product decisions to confirm:**

- MC waits after a wrong answer and doesn't auto-advance from the last card (§34.7).
- The Picker re-checks the server on every visit (one small `toc` request).

---

## 35. F4 — Responsive / desktop / input polish

**Workstream:** `FLASH-V2-F4` (2026-10-06). Frontend only, on branch `flashv2/f4-responsive-desktop`, based on `4f0bc09ca55b282223b2075ac7a9d245a7530e2c` (F3). The backend was read only: the certified `b3cc888acbf2bb493f1033384659c0aadc50c967` (checkout `flash-v2-f05-backend`, unmodified; a `git archive` of it ran in scratch). No deployment, no OpenAI calls, no private documents. `master` untouched (`f60dd52`).

Scope: the debt F3 left in §34.15. That covers short-landscape Flip Drill and MC, desktop and tablet composition, web keyboard shortcuts, the TOC current-card position, focus handling, and the web card-count slider. No new product features. No API, cache, navigation-semantics or plan-logic changes.

### 35.1 Files

| File | Change |
|---|---|
| `src/theme/breakpoints.js`, `src/theme/tokens.js` | `getLayoutClass(width, height)` (new) and the `layout.shortMaxHeight` / `shortMinWidth` tokens |
| `src/ui/useLayout.js` | Adds `layoutClass` (the hook F1 asked F4 to extend; no parallel system) |
| `src/study/layout.js` (new, pure) | Per-class geometry for Flip Drill and MC, readable text sizes, card-fits-text height, swipe threshold and direction |
| `src/study/shortcuts.js` (new, pure) | Key → action mapping and every guard; the hint text |
| `src/study/useStudyKeys.js` (new) | Web `keydown` listener, gated on navigator focus; modal detection; focus-recovery helpers |
| `src/study/tocList.js` (new, pure) | TOC rows, search, current-row index, scroll decisions, first render batch, count line |
| `src/components/study/StudyHeader.js` (new) | Shared study top bar (Back · counter · actions) in flex regions, without the absolute overlay |
| `src/components/FlipDrill.js`, `src/Screens/Game2Screen.js`, `src/components/TemplateBar.js` | Four layouts; the card grows to fit its text; keyboard; focus; the bar is in the column, and its sheet opens through a ref from header buttons |
| `src/Screens/GameMC.js` | Four layouts; no truncation or font shrinking; keyboard; focus. Hover-based `isDesktopWeb` removed |
| `src/Screens/TOCScreen.js` | Scrolls to the current card; search positioning; Escape; focus on the current row |
| `src/components/study/TemplateSheet.js` | Centred dialog on tablet/desktop; full-screen sheet on phone/short |
| `src/components/source/CardCountSlider{,.web}.js` (new), `CardCountControl.js` | Slider decision B (§35.6). `CardCountControl` swaps one element; F2 plan logic untouched |
| `src/ui/webGlobalStyles.js` | No focus ring on `tabindex=-1` focus targets (controls keep theirs) |
| study `styles/**` | Layout styles for the above |
| `tests/{responsive,studyKeys,tocList}.test.mjs` (new) | 46 tests |

### 35.2 Layout classifier

`getLayoutClass(width, height)` uses the window geometry only. `(hover: hover)`, touch and `Platform` are deliberately not inputs (a test asserts this), so a touch laptop or a hover-reporting emulator always gets a layout that fits its window.

| Class | Rule | Matrix members |
|---|---|---|
| `short` | landscape, height < 520 and width ≥ 560 | 740×360, 844×390, 896×414; also short desktop windows such as 1280×480 ("constrained desktop height") |
| `desktop` | width ≥ 1024 (not short) | 1024×768, 1280×720 … 1920×1080, 1024×1366 |
| `tablet` | 600–1023 | 768×1024 |
| `phone` | narrower; also landscape windows under 560 wide | 390×844, 360×640, 520×320 |

There is no touch cliff at 1024. Every class keeps the same `Button`s with 44 px targets, swipe works in every class, and 1024×768 (iPad landscape) gets the two-column layout with touch-sized controls. Before F4, GameMC used `width ≥ 1024 || (hover: hover)`, so a 390 px window with a mouse got the desktop branch and a touch laptop the mobile one. That heuristic is gone (tested: no `(hover: hover)` / `isDesktopWeb` left in `src`).

### 35.3 Flip Drill

| Class | Composition |
|---|---|
| phone / tablet | Header; a scrolling column (card, then source panel); **Previous/Next pinned** in a footer; the template bar under it, in the column. The card is 72% of its width tall on phones (0.6 on tablets, max 640 wide) |
| short | Header (Back · counter · **Template** · Contents). Left: the card, filling the measured body height; its column scrolls if the text is longer. Right (220–340 px): the source panel (scrolls on its own), with Previous/Next pinned at the bottom. **No bottom bar**, so nothing covers the card |
| desktop | Header capped to the content row. A vertically centred row: the card (max 720 px wide, 0.6 aspect, capped to the window height) with Previous/Next and a keyboard hint under it, and the source panel (300–400 px) beside it. Template is a header button |

- **The card grows to fit its text.** Each face measures its text (`onLayout`), and the card height becomes `max(base, text + chrome)` (`flipCardHeight`). Nothing is clipped or font-shrunk. The column scrolls instead, with the controls pinned.
- **The template bar is no longer an overlay** (`position: absolute` removed; a test guards it). In short and desktop layouts it renders `hidden` (sheet only), and the header **Template** button opens that same sheet via `ref.open()`. The sheet therefore stays mounted in one place across rotations and resizes. There is still exactly one `TemplateSheet` per owner (the F3 structural tests are unchanged and pass).
- Native landscape now shows the source panel too (F3 hid it there). The old native-only absolute Previous/Next positioning is replaced by the same flex footer on every platform.
- **Swipe:** a drag becomes a swipe only when it is clearly horizontal (|dx| > 20 and > 1.2·|dy|), so vertical scrolling in the new scroll columns never turns into a card change. The commit distance is a fifth of the card, clamped to 64–120 px: 72 px at 390, about 99 at 844×390, 120 on desktop. A −60 px drag still springs back, as in F3.
- **Preserved:** tap/click flip, 300 ms flip (instant under reduced motion), haptics, question side on every card change, excerpt hidden until reveal, provenance wording, wrap-around, TOC jump tokens.

### 35.4 Multiple Choice

| Class | Composition |
|---|---|
| phone / tablet | Question card (grows), options, status, source after answering, scoring chips in a scrolling column; **Previous/Next pinned** in a footer |
| short | Left: the question, the source after answering, and scoring, scrolling. Right: the options (scroll if long), then the status line and Previous/Next pinned under them |
| desktop | Left: the question and, after answering, its source. Right: options, status, Previous/Next, scoring, keyboard hint |

- **Never truncated:** the old `numberOfLines` clamp (1 line in landscape, 2 on desktop, 3 on phones) and `adjustsFontSizeToFit` are removed. Study text never goes below 16 px (`STUDY_TEXT`, tested). The question is 18 px in short landscape and 21–24 px elsewhere.
- **Options are ≥44 px in every class.** F1's 40 px short-landscape exception is gone: 44 in short, 52 on phone and tablet, 56 on desktop. In short landscape the ✓/✗ still replaces the letter instead of adding a tag line; the accessible label keeps the full wording.
- **Unchanged F3 semantics:** one answer per visit; correct answers auto-advance once (never from the last card); wrong answers wait for Next; manual Next/Previous wrap; Practice / Keep score; the double-advance guards.

### 35.5 Keyboard shortcuts (web only)

| Screen | Keys |
|---|---|
| Flip Drill | **Space / Enter**: flip · **← / →**: previous / next |
| Multiple Choice | **1–4**: choose that visible option (until answered) · **← / →**: previous / next |
| TOC | **Escape**: clear the search, or (when it is empty) go back to studying |
| Template sheet / dialogs | **Escape** closes them (react-native-web Modal, unchanged) |

No `t` for Contents: the set is kept minimal, and every shortcut repeats a visible control.

**Guards** (`studyShortcut`, all tested):

- ignored with Ctrl/⌘/Alt/Shift held (browser and system shortcuts);
- ignored on auto-repeat (holding a key never machine-guns flips or skips);
- ignored during IME composition, or when another handler already took the event;
- ignored while focus is in an input, textarea, select, contenteditable or textbox role;
- ignored while any `aria-modal` dialog is open, including during its opening animation;
- Space/Enter on a focused control (button, switch, radio, link, range) activate *that control*, not a flip. For example, Space on Next goes to the next card. Space on the card is the card's own button.
- Arrows are left to sliders and radios.

**Scope:**

- The listener is active only while the screen is focused in the navigator, because study screens stay mounted under the TOC.
- RN-web's `TextInput` stops key propagation, so typing in the TOC search can never reach a study shortcut. The search field handles its own Escape.
- Native registers nothing; no keyboard is required anywhere.

**Discoverability:**

- Desktop shows a muted hint line ("Keyboard: Space to flip · ← → previous / next", "Keyboard: 1–4 to answer · …").
- The desktop card hint reads "Click the card or press Space to show the answer".
- Controls carry `aria-keyshortcuts`.

### 35.6 Web card-count slider: decision B

The community Slider renders a non-focusable `View` on web (re-checked: `accessible` adjustable, no tabindex, no key handler). On web, `CardCountSlider.web.js` now renders a native `<input type="range">`:

- focusable, with the global focus ring;
- ← → ↑ ↓ step one card; Home/End jump to the limits;
- real slider semantics, with `aria-valuetext` "N cards";
- `accent-color` theming; touch dragging on mobile browsers.

Native keeps the community Slider in `CardCountSlider.js`. Both files take the same props, a test asserts identical signatures, and both report whole numbers through the same `onChange`. `src/source/plan.js` and the F2 reducer see identical input, and Metro picks the file per platform. Verified in the bundles: web contains `type:"range"` and no `RNCSlider`; Android/iOS contain `RNCSlider` and no range input.

Live (1280×800 and 390×844):

- the analyze result gives 3 cards (3–24);
- →→ → 5, ← → 4, End → 24, and the Build button label follows;
- Reset → 3;
- a track click → 23–24;
- a section edit disables the input (F2's lock);
- a full Upload → Build run with a keyboard-chosen 5 cards built deck 5 and saved its resume metadata.

The −/+ buttons are unchanged.

### 35.7 TOC current card

- **Opened from a study screen:** after the list's first layout, the current card is scrolled into view once, **without animation**, 30% down the viewport, so the cards before it stay visible (`scrollToIndex`, `viewPosition 0.3`).
  - Virtualisation is handled two ways. The first render batch includes the current row (`initialRenderCount`). If a row still isn't measured, `onScrollToIndexFailed` jumps by the average row height and aims again.
  - On web, focus then moves to the current row, which also carries `aria-current`.
- **Opened from the Picker (no current card):** the list stays at the top, with the default render batch.
- **Search:**
  - typing shows results from the top and never scrolls to the current card;
  - clearing it (or Escape) returns to the current card, or to the top when there is none;
  - the "No cards match" state, the count line and the matching rules are as in F3;
  - filtered rows keep their own ordinal (`tocRows` assigns it before filtering).
- **Verified live** on a 30-card deck from card 25, at 1280×800, 390×844 and 844×390. The row is in view (y 369 / 375 / 246) and focused. "resp" → 10 of 30, top of the list. Escape → the search is cleared and card 25 is back in view. Escape again → back to the Flip Drill on card 25 with focus on the card. From the Picker → scrollTop 0.

### 35.8 Focus and modals (web)

- **Arrival on a study screen**: from the Picker, or back from a TOC jump or Escape whose row was removed with the TOC. If focus is nowhere useful (body, a removed node, or a hidden screen), it moves to the Flip Drill card or the MC question (`tabIndex -1`, no ring). Verified: after a jump to card 3, `activeElement` is "Question: …card 3".
- **MC answer:** answering disables the focused option, so focus continues on **Next** instead of dropping to the page (verified: Enter on option B → focus on "Next card").
- **Flip:** a single target for both faces whose label swaps, so flipping never strands focus.
- **Template sheet:**
  - Escape closes it, and the react-native-web Modal returns focus to the element that had it. Verified after Escape: 0 modals, focus back on the card.
  - Phones and short landscape get a full-screen sheet; tablet and desktop get a **centred dialog** (max 880 px wide, 88% of the window high, over a scrim). Clicking the scrim closes it; the scrim is not a tab stop.
  - The Close header stays fixed while the content scrolls.
  - Reduced motion: `animationType="none"`.
- **Deck error and missing states:** "Try again", "Back to deck", "Back to Upload" and "Forget this deck" are real buttons (tabbable). Verified in view and clickable at every viewport.

### 35.9 Long content

These synthetic cards were seeded directly in the scratch DB:

- an 80-word question;
- a 90-word answer;
- an excerpt of about 500 characters;
- a 180-character section title;
- long MC distractors;
- mixed scripts (CJK, Arabic, Greek, Cyrillic, Korean, emoji, maths);
- a 90-character unbroken identifier;
- a card with no excerpt.

Results:

- Every card face's text sits inside the card at 390×844, 844×390, 740×360 and 1440×900. The card grows (670 px tall for the long question at 390) and its column scrolls.
- Previous/Next stay in view and clickable in every case.
- The unbroken identifier wraps inside the card (no horizontal overflow).
- MC long options scroll in their column with the controls pinned.
- Long section titles wrap in the source panel.
- No text was truncated or shrunk.

### 35.10 Viewport verification matrix

**Setup:**

- the exported web bundle, served statically;
- the real `b3cc888` backend (Python 3.14 venv);
- an OpenAI-compatible stub on `OPENAI_BASE_URL` that serves the backend's own `flashcards/tests/fakes.FakeOpenAI`;
- synthetic decks: an uneven-TOC deck built through `/generate/`, a 30-card deck and the extremes deck seeded in the scratch DB;
- headless Edge (DevTools protocol, Node's built-in WebSocket) with real input events: key events, mouse drags, touch drags, clicks.

**Screens walked at every viewport:** Picker; Flip Drill question; Flip Drill answer/source; template sheet (+ Escape); TOC; MC unanswered; MC correct (status "Correct. Moving to the next card…"); MC incorrect ("Not quite… Press Next when you're ready."); study error state (network failure → Try again / Back to deck / Back to Upload); missing deck (Back to Upload / Forget this deck).

**Assertion on every screen:** `scrollWidth ≤ clientWidth`, no visible element past the right edge, and every required control of the screen inside the viewport and hit-testable (`elementFromPoint`). The Picker is a scrolling page and is checked for overflow only.

| Viewport | Class | Result |
|---|---|---|
| 390×844 (touch) | phone | ✅ all screens |
| 740×360 (touch) | short | ✅ |
| 844×390 (touch) | short | ✅. Flip: card 487×322 on the left; source; Previous/Next at y 338. MC: options A–D at 44 px plus controls in view, before and after answering |
| 844×390 (mouse, reports hover) | short | ✅ same layout (hover-independent) |
| 896×414 (touch) | short | ✅ |
| 768×1024 (touch) | tablet | ✅ |
| 1024×768 (touch) | desktop | ✅ two columns, 44 px targets |
| 1280×720 / 1280×800 / 1440×900 / 1600×900 / 1920×1080 | desktop | ✅ card + controls + source in view without scrolling; template as a centred dialog |

**Also verified live:**

- Keyboard: Space/Enter flip exactly once; arrows; repeats and Ctrl ignored; Space on Next goes to the next card instead of flipping; MC "2" answers, "3" afterwards and "9" are ignored, and a wrong answer waits.
- Swipe (mouse at 1280, touch at 390 and 844×390): −60 springs back, −200 → next, +200 → previous, a mostly vertical drag does nothing, and the resting layout has no overflow.
- Reduced motion: the flip is at 180° 40 ms after the tap.
- No console errors in any walk; the only warning is the deliberately induced network failure.

**Environment notes:**

- The desktop app's built-in browser pane, while hidden, paints no frames: `requestAnimationFrame` and `ResizeObserver` never fire. As a result, RNW `onLayout`, Modal animations and the focus effects stall there. All layout, measurement and focus claims above come from headless Edge, which renders normally. The pane was used only for early smoke checks.
- In headless Edge, a touch-emulated click does not open the web file chooser, so the Upload slider walk used mouse input at 390 px.

### 35.11 Native QA status

**Not performed.** There is no Android SDK, emulator or device on this machine, and no macOS for an iOS simulator. Android and iOS `expo export` both bundle (1152 / 1149 modules). The new code uses only RN / safe-area-context primitives:

- web-only behaviour is behind `Platform.OS === "web"` or the `.web.js` file;
- `aria-keyshortcuts`, `tabIndex` and `dataSet` are passed on web only.

Still **unverified on devices:** native short-landscape composition, safe-area insets on notched phones, haptics, the swipe threshold under real touch, the transparent template dialog on tablets, and native PDF/share. This is not claimed from bundling.

### 35.12 Tests and checks

| Check | Result |
|---|---|
| `npm ci` | ✅ |
| `npm test` | ✅ **195/195** (149 F1–F3 + 46 F4) |
| `expo export --platform web` / `android` / `ios` | ✅ all exit 0 (web 836 modules: the community slider no longer ships on web; Android 1152; iOS 1149) |
| `npx expo-doctor@latest` | ⚠️ 16/18: the same two patch-alignment findings as F0–F3 (F5; no Expo versions changed in F4) |

The 46 F4 tests:

- **`responsive` (32):** the class of every matrix viewport and of the edges (constrained desktop height, iPhone SE landscape, tiny landscape, 520 px threshold, square); geometry-only classification; no hover heuristic left in `src`. For each matrix viewport, Flip Drill and MC geometry fit (row ≤ available width, also with notch insets; card 200–720 px; short card under the header; desktop card + controls within the height; options ≥44 px). Also: the 1024 tablet/desktop boundary; the card grows to fit text; text ≥16 px; swipe threshold and direction; vertical drags aren't swipes; the template bar isn't absolutely positioned; the web/native slider share props.
- **`studyKeys` (8):** the Flip/MC mapping; 1–4 only for visible, unanswered options; the typing guard (input, textarea, select, contenteditable, textbox/searchbox, while range/checkbox are not typing); modifiers, repeat, IME, `defaultPrevented`, open modal; Space/Enter belong to focused controls; arrows belong to sliders and radios; hint text; listeners gated on navigator focus and web.
- **`tocList` (6):** ordinals; search semantics and filtered ordinals; the current index for card 25 of 30 (beyond the first 10 rendered); the first render batch includes it; the Picker gives no current card; search vs auto-scroll and clear-restores; the count line.

**Mutation-checked:** each of these, removed, makes its test fail — the repeat guard, the typing guard, the control guard, the `short` class, the "search goes to top" rule, card growth, and the horizontal-swipe rule.

### 35.13 Preserved (F1–F3)

- Source hidden until reveal; the question side on every card change; exact / unknown page wording.
- One MC answer per visit, no double advance, wrong answers wait, correct answers auto-advance, the final card doesn't silently advance.
- Practice / Keep score; bounded TOC stack (`POP_TO`, unchanged); one template sheet per owner.
- Truthful export labels and duplex order (untouched); stale/missing deck states and the 20 s timeout (untouched); offline cached study (cache untouched); Game 1 hidden.
- F2 Upload/Build: only the slider element changed (§35.6). Analyze/build API, recommendation reset, allocations and cancellation are untouched (verified by a live analyze → build).

### 35.14 Remaining debt

**F5 (backend / platform):** everything in §34.15's F5 list, unchanged. In addition:

- Expo patch alignment (Expo Doctor 16/18);
- `@react-native-community/slider` is now only used natively;
- `expo-linear-gradient`, reanimated and gesture-handler are still unused.

**F6 (portfolio):**

- The study screens are ready to embed: layout is a pure function of window size (`src/study/layout.js`) and data comes through `useDeck`'s `deckSource`.
- Re-run the §35.10 matrix against the fixture deck; scripts were scratch-only (headless Edge + DevTools).
- Lighthouse a11y is still to be measured.

**Still open from §34.15 and not in F4's brief:**

- browser back/forward (no linking config);
- the native device pass (§35.11).

**Product notes to confirm:**

- Escape on an empty TOC search returns to studying (web).
- Phone-portrait Flip Drill cards are taller (0.72 aspect) to use the spare height.
- Tablet and desktop show the study template as a centred dialog rather than a full-screen page.

---

## 36. F5 — Backend / demo hardening

**Workstream:** `FLASH-V2-F5` (2026-10-07). Both repos, branch `flashv2/f5-demo-hardening` in each. **Backend F5 commit: `9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c`.** Frontend based on `21591a7421d73e925f3d962fb9e7776169fd8f01` (F4); backend based on `b3cc888acbf2bb493f1033384659c0aadc50c967` (F0.5). No deployment, no OpenAI calls, no private documents. Default branches untouched (frontend `master` = `f60dd52`, backend `main` = `18a6928`).

Scope: make the product safe to demonstrate and defensible for a small public demo. Threat model: anonymous visitors, generation costs money, uploaded PDFs are untrusted, deck ids must not expose other people's decks, configuration comes from the environment, frontend and backend may be on different origins. **Not** an enterprise security baseline; there are still no accounts. The backend now has its own `README.md` (configuration, API, error contract, database, deployment caveats) and `.env.example`; this section summarises and records the evidence.

### 36.1 Files

| Repo | File | Change |
|---|---|---|
| BE | `flashsite/settings.py` | Rewritten: every deployment value from the environment; fails closed (§36.3) |
| BE | `flashsite/test_settings.py` (new), `manage.py` | Deterministic placeholder settings, selected automatically for `manage.py test` |
| BE | `flashsite/urls.py` | JSON `handler400/403/404/500` |
| BE | `flashcards/errors.py` (new) | `ApiError`, the DRF exception handler, the error contract |
| BE | `flashcards/uploads.py` (new) | Upload size handler, PDF validation, private temp copy with guaranteed removal |
| BE | `flashcards/throttles.py` (new) | Per-IP scoped throttles and the server-wide daily generation budget |
| BE | `flashcards/models.py`, `migrations/0012_deck_public_id.py` (new), `serializers.py` | `Deck.public_id` (opaque) + backfill; cards report it as `deck` |
| BE | `flashcards/views.py`, `urls.py` | Validation, throttles, 404 vs `[]`, generation outcomes, `/feedback/` removed |
| BE | `flashcards/ai/pipeline/core.py`, `flashcard_gen.py`, `templater.py` | A failed catch-up keeps the cards already made; model client timeout. No algorithm change |
| BE | `requirements.txt` | Django 5.2.18 LTS, DRF 3.17.2, cors-headers 4.8.0; Pillow, pytesseract, python-docx removed |
| BE | deleted: `ai/chunker.py`, `ai/ingest.py`, `ai/prompt_cards.py`, `inspect.py` | Dead modules (nothing imported them) |
| BE | `flashcards/tests/{test_uploads,test_access,test_throttling,test_generation,test_settings_safety}.py` (new), `fakes.py`, `test_pipeline.py` | 64 new tests; fake model failure/empty modes; F0.5 tests updated for the new contract |
| BE | `README.md`, `.env.example` (new) | Setup and operations documentation |
| FE | `src/source/api.js` | Structured HTTP errors (`code`, `retryAfter`, `limit`); copy chosen by error code |
| FE | `src/study/deck.js`, `deckApi.js`, `useDeck.js` | Opaque deck ids; 404 → missing, `[]` → empty; no local guessing; no "Deck #N" |
| FE | `src/utils/cache.js`, `App.js` | Cache `VERSION` 3 + start-up purge of older versions |
| FE | `src/source/buildRun.js`, `src/Screens/BuildScreen.js` | `buildOutcome`: the real count, "N of M cards created" for partial builds |
| FE | `src/Screens/UploadScreen.js` | Resume card shows name + count from the shared identity helpers, never the id |
| FE | `index.js`, `App.js`, `package.json`, `package-lock.json` | Expo patch alignment; unused gesture-handler / reanimated / linear-gradient removed |
| FE | `tests/f5Contract.test.mjs` (new), `tests/studyDeck.test.mjs` | Contract tests |

### 36.2 Verified findings before the fix (re-audited on `b3cc888`, not copied from F0)

| # | Finding (current state at F5 start) | Evidence |
|---|---|---|
| 1 | Hard-coded `SECRET_KEY` (`django-insecure-sx@&…`) in `settings.py` | source |
| 2 | `DEBUG` defaulted to **True** | `config("DEBUG", default=True)` |
| 3 | `ALLOWED_HOSTS = ["*"]`; `CORS_ALLOW_ALL_ORIGINS = True` (set twice, making the origin list dead) | source |
| 4 | Upload "validation" = file present. A `.txt` analysed successfully; any PyMuPDF-openable format was accepted; no size or page limit; the temp file's suffix came from the client's filename | source + F0 curl |
| 5 | Corrupt PDFs answered **500** with sanitised exception text (F0.5); every other exception text still reached clients verbatim | source |
| 6 | `/generate/` anonymous and unlimited; no throttle classes or cache configured | source |
| 7 | Decks addressed by sequential integer id; `hand`/`toc` world-readable; unknown deck = `200 []`, indistinguishable from empty | source + curl |
| 8 | `/feedback/` kept DRF's `IsAuthenticatedOrReadOnly` with `SessionAuthentication`: anonymous POST → 403; it took global card ids, so even if opened it would let anyone bump any card's counters | source |
| 9 | Zero cards → **500** "Model returned zero cards"; a deck could be created with zero cards if every card lacked front/back (the check ran before filtering); an exception in the catch-up pass discarded all cards already made; warnings didn't state created vs requested, so a short build could look complete | source |
| 10 | `.chunks.pkl` was written and deleted on every generate (F0.5 cleanup) but never read | source |
| 11 | **Django 5.0.4 on Python 3.14 with DEBUG off: any 5xx crashes** in `Context.__copy__` (`'super' object has no attribute 'dicts'`) | reproduced with a corrupt PDF |
| 12 | Django 5.0 is past end of support (April 2025) and officially supports Python ≤3.12; DRF 3.16 stops at 3.13; cors-headers 4.4.0 at Django 5.1 / Python 3.12 | PyPI metadata |
| 13 | Root logging at DEBUG (logs model output excerpts); no model-call timeout | source |
| 14 | `deck_name` (200) and section titles (200) were not trimmed: harmless on SQLite, an error on a stricter database | source |
| 15 | Unused requirements (Pillow, pytesseract, python-docx) and dead modules | import graph |
| 16 | Frontend: Expo Doctor 16/18; three unused native packages | doctor, import graph |

### 36.3 Settings

- `DJANGO_DEBUG` defaults to **false**. With DEBUG off, `DJANGO_SECRET_KEY` (≥50 characters, not `django-insecure-…`) and `DJANGO_ALLOWED_HOSTS` (no `*`) are **required**: the process refuses to start (`ImproperlyConfigured`) rather than run insecurely.
- Local development: `DJANGO_DEBUG=true` alone (`cp .env.example .env`) gives a fixed dev-only key, the localhost host names and any `http://localhost|127.0.0.1:<port>` CORS origin.
- CORS: explicit `DJANGO_CORS_ALLOWED_ORIGINS`; `*` refused; `CORS_ALLOW_CREDENTIALS = False`; only `/api/`; `Retry-After` exposed.
- CSRF: the API has no authentication classes and sets no cookies, so a cross-site request carries no credential to abuse; DRF's `api_view` views are CSRF-exempt and nothing else is mounted. Secure cookie flags are on with DEBUG off anyway.
- `OPENAI_API_KEY` is optional (S14): without it `/generate/` answers 503 and `check`/`migrate`/analysis work.
- HTTPS knobs (`DJANGO_SECURE_SSL_REDIRECT`, `…_HSTS_*`, `…_PROXY_SSL_HEADER`) are opt-in; logging is INFO.
- Tests: `manage.py test` selects `flashsite/test_settings.py`, which forces production-style placeholder values (DEBUG off, a fixed non-secret key, a fake model key that is never used). No `.env` needed. **Test command is now simply `python manage.py test flashcards`.**

### 36.4 Upload protections

Server-side, whatever the picker did (`flashcards/uploads.py`): size checked **while the body is received** by the first upload handler (oversized bodies are read and discarded, never written to disk, and the client still gets the 413) → presence → declared type (PDF/octet-stream/empty only) → `%PDF-` signature in the first 1 KB → PyMuPDF opens it **as a PDF** (no more format sniffing by suffix) → not password-protected → page limit → at least one page with selectable text. Defaults: 20 MB, 200 pages (`FLASH_MAX_UPLOAD_MB`, `FLASH_MAX_PDF_PAGES`).

The accepted file is copied to a private temp file under a server-chosen name (`flash-upload-*.pdf`) and removed when the request ends, on every path. **Windows finding fixed on the way:** an exception raised inside PyMuPDF keeps its document (and the open file) alive through the traceback, so the old `finally: unlink` silently failed for corrupt PDFs on Windows. Errors are now raised only after the failing frames are released, documents are closed in `finally`, and unexpected failures are logged as text (a retained log record would hold the file open); a deliberately hostile test keeps a document open while failing. The unused `.chunks.pkl` is no longer written (`cache_chunks=False`), and still cleaned up if it ever is.

### 36.5 Throttling and cost

- DRF throttles, one scope per kind of work, keyed by client IP, rates from settings on every request: `generate` 10/hour, `analyze` 30/hour, `read` (hand/toc) 120/minute. `health` is unthrottled. Throttled requests never reach the model.
- **Server-wide daily generation budget** (`FLASH_GENERATION_DAILY_LIMIT`, default 100 per UTC day; 0 turns generation off): the only control IP rotation can't bypass. It is counted after validation, so junk uploads and bad plans don't spend it.
- Counters live in Django's cache: `locmem` by default (per process, reset on restart — verified live), or `FLASH_CACHE=database` (shared across workers, survives restarts; non-atomic increments may overshoot slightly). No Redis, no Celery.
- `DJANGO_NUM_PROXIES` for correct client IPs behind a proxy (tested).
- 429 bodies say when to retry ("Try again in about 53 minutes") and carry `Retry-After`.

### 36.6 Deck access design

- `Deck.public_id`: 22 URL-safe characters (`secrets.token_urlsafe(16)`, 128 bits), unique, indexed. The integer primary key stays internal.
- **The API's `deck_id` field and query parameter now carry the public id** (string). Field and parameter names are unchanged, so the request contract and the frontend's plumbing are unchanged; the *type* changed (int → string), deliberately. Card rows report the same id as `deck`. Integer ids → `404 deck_not_found`.
- Migration `0012` backfills a random id for every existing deck. Pre-F5 clients only knew integer ids, so pre-F5 decks are unreachable from those clients (by design — there's no safe way to map an integer to a token without re-opening enumeration).
- Access model: **anyone holding the id can read the deck** (an unlisted link). No accounts were added.
- Frontend: the route param `deckId` holds the public id; `isValidDeckId` accepts only that format; the "Deck #N" label is gone everywhere (a source-scan test guards it; mutation-checked against the old `UploadScreen`). Cache `VERSION` 2 → **3**; `purgeOldCacheVersions()` runs at start-up, so pre-F5 resume entries, hands, TOCs and templates disappear instead of offering a deck that can't open (verified live). Ids are random, so cache keys can no longer collide across servers or database resets (closes the F3/F4 "ids not namespaced by API base" debt).

### 36.7 Missing vs empty

| Server state | `hand` / `toc` | Frontend state |
|---|---|---|
| deck exists, has cards | 200 `[…]` | ready |
| deck exists, no cards | **200 `[]`** | empty — "This deck has no cards. The deck exists on the server, but it has no cards to study." |
| unknown or deleted deck | **404 `deck_not_found`** | missing — "This saved deck is no longer available…", Forget this deck |
| `deck_id` absent | 400 `deck_id_required` | — |

The F3 `expectsCards` heuristic is removed. A 404 drops that deck's cached hand/TOC (the Picker's check drops both); other errors keep healthy cache (offline study still works). 429 on a study load is a "The server is busy" error state with Try again. `generate` never creates an empty deck, so "empty" only arises from manual data changes.

### 36.8 Feedback endpoint: decision B (removed)

The counters had no product value: nothing reads `right`/`wrong`, the MC "Keep score" tally is deliberately on-device (F3 §34.7), and opening the endpoint anonymously would let anyone increment any card's counters by sequential card id. `/feedback/` is removed (404). The columns stay (no migration churn) and `hand` still reports them for response compatibility; they are always 0.

### 36.9 Generation outcomes and errors

- Every requested card made → 201, `partial: false`.
- Fewer cards → still 201, `partial: true`, first warning `"Created N of M requested cards."`; `cards_created` is always the real count.
- A short section gets its existing warning; catch-up cards add `"N cards were added under "Mixed topics" to make up the total…"` and appear in `per_section` (planned 0). Previously a catch-up-filled deck could carry shortfall warnings with no explanation.
- No cards, or the model unreachable → **502 `generation_failed`**, nothing saved (validated live: deck count unchanged). A failed catch-up keeps the cards already made.
- No `OPENAI_API_KEY` → 503 `generation_unavailable`. Daily budget spent → 429 `generation_limit_reached`.
- Plans are validated: unreadable/non-list JSON, all-zero, or more than 30 cards → 400 `invalid_allocations` (the frontend never sends these).
- Every error body is `{detail, code}` (+`limit_mb` / `limit_pages` / `retry_after` where relevant); unexpected failures are a generic 500 with the traceback in the server log only; JSON also for unknown URLs, wrong methods and disallowed hosts. Full table in the backend README.
- Frontend: `RequestError` carries `code`, `retryAfter`, `limit`; analyze/generate copy is chosen by code (not-a-PDF, unreadable, password-protected, no text, too many pages with the limit, too large with the limit, too many requests with the wait, generation failed, unavailable, daily limit, plan rejected). The pre-F5 status/text fallbacks remain for older servers. Build's review screen title is "6 of 9 cards created" with the heading "Fewer cards than you asked for" when partial.

### 36.10 Python / Django

Installed: Python **3.14.7** only. Narrowest officially supported set covering 3.14 (from PyPI classifiers): **Django 5.2.18** (5.2 LTS, support to April 2028; first line listing 3.14), **DRF 3.17.2** (3.16.x lists ≤3.13), **django-cors-headers 4.8.0** (first with Django 5.2 + Python 3.14). Supported Python for the pinned set: 3.10–3.14 (verified on 3.14 only). Migration `0011` was already "Generated by Django 5.2.4", so the author's environment was on 5.2. Proof: the suite passes with the F0.5 `AdminEmailHandler` patch **removed**, and a 5xx test under DEBUG off guards the regression. openai 1.96.1 and PyMuPDF 1.26.3 unchanged.

### 36.11 Database

SQLite unchanged (no demo blocker found). Adequate for local use and a single-host demo (short writes in one transaction; model calls hold no lock). Limits: one host, serialised writers (5 s busy timeout), ephemeral filesystems need a volume. Code is ORM-only and portable; string fields are now trimmed to column sizes. Details in the backend README.

### 36.12 Frontend platform

**Expo alignment.** The two Doctor findings on the F4 tree were the same as F0: `@expo/metro-config` 0.20.17 (expected ~0.20.18) and `@expo/metro-runtime` 5.0.4 → ~5.0.5, slider 4.5.7 → 4.5.6, `expo` 53.0.20 → ~53.0.27, `react-native` 0.79.5 → 0.79.6. `npx expo install --fix` applied exactly those (metro-config follows `expo`). Still SDK 53. **Expo Doctor 18/18.** npm re-sorted `package.json` keys alphabetically; no other change.

**Dependencies.**

| Package | Decision | Evidence |
|---|---|---|
| `@react-native-community/slider` | **kept** | imported by `CardCountSlider.js` (native); in Android/iOS bundles (`RNCSlider`), absent from web |
| `expo-linear-gradient` | removed | no importer anywhere (app or libraries) |
| `react-native-reanimated` | removed | no importer; only `babel-preset-expo` auto-added its plugin because it was installed; it was nevertheless pulled into the web bundle |
| `react-native-gesture-handler` | removed | only a side-effect `import` in `index.js`/`App.js` (needed by the JS stack / drawer, not by `native-stack`); `react-native-screens`' gesture/reanimated integrations are opt-in subpath entries that nothing imports |
| `expo-constants` | unchanged (still undeclared; resolved through `expo`) | not flagged by Doctor; declaring it is a one-line follow-up |

Bundles: web 1.67 MB → 0.90 MB (841 → 530 modules), Android 1152 → 885, iOS 1149 → 883.

**Web/native slider:** F4's split unchanged (web range input, native community slider); the F2 plan reducer is untouched.

**Browser history: deferred.** React Navigation's web `linking` serialises route params into the URL. Here that would put Build's params — the picked file (on web a base64 data-URI of the whole PDF) and the plan — into the address bar; a reload of Build or TOC can't be reconstructed (no file, `returnTo`/jump tokens); the study URLs would expose the deck id (now an access token) to history and referrers; and F6 will embed the app in a portfolio page whose own URL ownership isn't decided. Navigation isn't broken for normal demo use: every screen has in-app Back/Home, and browser Back simply leaves the app (one history entry). Revisit in F6 with an explicit route table and param stringify rules.

### 36.13 Tests and checks

| Check | Result |
|---|---|
| BE `manage.py test flashcards` | ✅ **86/86** (22 F0.5, updated for the new contract, + 64 F5), ~5 s, three consecutive runs, no network, no `.env` |
| BE `check` (DEBUG on; and production env) | ✅ no issues |
| BE `makemigrations --check` | ✅ no changes (0012 matches the model) |
| BE clean install (`git archive` of `9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c` → new Python 3.14.7 venv → `pip install -r requirements.txt`) | ✅ exit 0, `pip check` clean; 86/86; `check` clean; no migration drift |
| FE `npm ci` / `npm test` | ✅ / ✅ **208/208** (195 + 13 net new) |
| FE `expo export` web / android / ios | ✅ all exit 0 (530 / 885 / 883 modules) |
| FE Expo Doctor | ✅ **18/18** |

New backend tests by area: uploads 14 (missing, empty, declared type, signature, unreadable, encrypted, no text, page limit, size limit at the handler and the file, disk-spooled uploads, 415, alias, no temp files, no model calls); access 11 (opaque id, integer ids refused, unknown/malformed ids, missing param, explicit empty 200, deleted → 404, uniqueness, `/feedback/` gone, counters, migration backfill via `MigrationExecutor`); throttling 10 (per-client, scopes, reads, junk counted, health, proxy IP, daily budget shared, rejects don't spend it, 0 = off, UTC reset); generation/errors 18 (full, catch-up explained, partial explicit, failed catch-up keeps cards, no-plan shortfall, zero cards, outage, escaped model error, missing key, generic 500 + Windows file lock, 5xx with DEBUG off, invalid plans, >30, long names trimmed, 405, 404, disallowed host, error shape); settings 11 (subprocess, hermetic env: secret required, weak/hard-coded keys refused, hosts required, `*` refused, CORS `*` refused, invalid values, production profile, dev profile, tunables, three `check --deploy` profiles pinned).

New frontend tests (13 net): structured errors and `Retry-After`; copy per error code with limits and waits; `waitPhrase`; `buildOutcome`; partial builds stay on Build with the real count saved; 404 → missing with cache drop; empty `[]`; other errors keep cache; busy state; opaque-id validation; no "Deck #" in `src` (mutation-checked); cache v3 purge (idempotent, never throws).

### 36.14 `check --deploy` (placeholder production values)

| Profile | Warnings | Classification |
|---|---|---|
| Required variables only | W004 (HSTS), W008 (SSL redirect) | Hosting layer: TLS is terminated by the host/proxy; enable with `DJANGO_SECURE_SSL_REDIRECT` / `DJANGO_SECURE_HSTS_SECONDS` once HTTPS is confirmed end to end |
| + redirect + HSTS | W005 (includeSubDomains), W021 (preload) | Domain owner's decision: binds every subdomain / submits to browser preload lists |
| + both domain-wide flags | **none** | — |

All three are pinned by tests. Before F5 the same command reported W004, W008, W009 (insecure key), W012/W016 (cookies), W018 (DEBUG).

### 36.15 Integrated local verification

**Setup:** the backend from the working tree copied to scratch, run with `runserver` under a **production-style environment** (DEBUG off, random 86-character key, `ALLOWED_HOSTS=127.0.0.1,localhost`, `CORS_ALLOWED_ORIGINS=http://127.0.0.1:8090`, limits lowered for the test: 2 MB, 40 pages, generate 12/hour); an OpenAI-compatible stub on `OPENAI_BASE_URL` serving the backend's own `FakeOpenAI` (modes: normal / empty / fail / empty sections); the exported F5 web bundle served statically; headless Edge driven over the DevTools protocol with real mouse/keyboard events and the file chooser intercepted (scratch scripts, not committed). Synthetic PDFs only.

**API (curl):** analyze OK; `.txt` renamed `.pdf`, declared `text/plain`, corrupt, password-protected, blank/scanned, 50 pages, 3 MB, no file, JSON body, GET → the expected 400/413/415/405 with fixed messages; `/feedback/` 404; unknown URL JSON 404; foreign `Host` JSON 400. CORS preflight echoes only the configured origin (no credentials header); `evil.example` and `localhost:8081` get nothing. Generate: full (8/8), catch-up (warnings explain "Mixed topics"), partial (201, 6 of 9, `partial: true`), zero cards and stub outage (502, deck count unchanged). `hand`/`toc` by public id 200; integer ids 1–3 and unknown ids 404.

**Browser walk (19/19):** legacy v2 cache purged and no stale resume card; one analyze per pick; build → Picker with an opaque id saved for resume; Picker subtitle without any id; one `toc` check by public id; Flip Drill (question side, excerpt hidden before reveal, Space reveals answer + page, → next); TOC lists and jumps to card 3; template sheet with real ranges, Escape closes it; MC answered with key 1 shows result + source; HTML export downloads `uneven-toc-cards.html` with question/answer sheets; **0 console errors**.

**Failure walk (28/29):** each invalid upload (corrupt, scanned, locked, 50 pages → "limit is 40 pages", 3 MB → "limit is 2 MB", text-as-PDF) shows its own message and keeps Build disabled; 390×844 error state has no horizontal overflow; partial build shows "2 of 3 cards created" + "Fewer cards than you asked for" + the server's warning, and the Picker shows 2 cards; failed build shows "No cards could be written… Nothing was saved… HTTP 502" with no deck row created; **throttled** generate shows "Too many requests — Try again in about 53 minutes (HTTP 429)"; backend blocked → Picker explains and Flip Drill studies from the cached hand; deck deleted server-side → 404 → "no longer available", modes hidden, cached hand/TOC dropped, Forget returns to Upload and clears the resume entry; deck with no cards → "This deck has no cards" (not "no longer available"); the partial deck studies in MC. The one flagged item was the console check: it listed F2's intentional `console.error` diagnostics for the six deliberately failed uploads (`[UploadScreen] analyze failed …`), which the walk's filter didn't exclude — expected, no other errors.

**Found and fixed during the walk:** the Upload resume card still rendered `Deck #<id>`, which with opaque ids printed the token (fixed, plus the source-scan test); a disallowed `Host` got Django's HTML 400 (now JSON).

**Secrets:** the web bundle contains none of: the secret key, the model key, `OPENAI`, `DJANGO_`, `SECRET_KEY`, `django-insecure`, `api.openai.com`, the stub port. API responses (success and every error) contain no key, no temp path, no `flash-upload-` name, no traceback, and set no cookies. `%TEMP%` held 0 `flash-upload-*` / `.chunks.pkl` files after all live traffic.

### 36.16 Native QA

- **Native bundle verified:** Android and iOS `expo export` exit 0 after every change (885 / 883 modules); `RNCSlider` present, gesture-handler and reanimated absent.
- **Native runtime: not verified.** No Android SDK, emulator or device, and no macOS, on this machine (unchanged from F4 §35.11). Removing gesture-handler/reanimated and the RN 0.79.6 patch are therefore bundle-verified only; the first device run should cover launch, navigation (native-stack), swipe (PanResponder), haptics and the native slider.

### 36.17 Remaining caveats (deployment)

- Not deployed, not load-tested; no Dockerfile/process manager/CI.
- Throttles are per-process with the default cache; IP limits are evadable; the daily budget is the cost ceiling.
- Generation is synchronous (tens of seconds per request, worker held); a client that disconnects doesn't cancel server work (F2 §33.11).
- Untrusted PDFs are parsed by native code (MuPDF); size/page limits bound the work — run with OS-level memory/CPU limits and keep PyMuPDF patched.
- Deck ids are bearer tokens: anyone with the id reads the deck.
- SQLite: single host; use a persistent volume.
- HTTPS/HSTS are the host's job (§36.14). Cap the request body at the proxy too.
- Card ids are still global integers in responses (no endpoint accepts them any more).
- Frontend still doesn't declare `expo-constants` (works through `expo`).

### 36.18 F6 readiness

- Stable contract: `deck_id` is an opaque string; fixtures must use a 16–32-character URL-safe id (e.g. 22 characters) or `isValidDeckId` rejects them. `hand`/`toc`/`template` shapes are otherwise unchanged; `generate` adds `partial`; cards' `deck` is the public id.
- `useDeck`'s `deckSource` seam is untouched; missing/empty now come from HTTP status, so a fixture source should return items (or throw a `RequestError` with `status: 404` to simulate missing).
- Cache v3: a demo that seeds storage must use `fcache:v3:` keys.
- Browser history is open for F6 (§36.12), to be decided together with the portfolio embedding.
- Not started in F5: fixture deck, portfolio seam, screenshots, Lighthouse, case-study evidence.

### 36.19 Default branches and scope

Frontend `master` and backend `main` untouched. No deployment, no real OpenAI call (the SDK always pointed at the local stub or was patched), no private documents. F6 not started.

---

## 37. F6 — Portfolio extraction and final certification

**Workstream:** `FLASH-V2-F6` (2026-10-07). Frontend only, branch `flashv2/f6-portfolio-certification`, based on `dd20dbbd360f64468210dfd0133709372d78692b` (F5 frontend). Backend read only: certified F5 `9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c`, unmodified (a `git archive` of it ran in scratch). No deployment, no OpenAI call, no private documents. Default branches untouched (frontend `master` = `f60dd52`, backend `main` = `18a6928`). The portfolio-facing package is **`FLASH_PORTFOLIO_HANDOFF.md`**; this section is the engineering record.

### 37.1 Files

| File | Change |
|---|---|
| `src/demo/demoSource.js` (new, pure) | Fixture-backed implementation of the `deckSource` contract; any other id → `RequestError` 404 (the "missing" state); copies on every call; derived facts for the source screen |
| `src/demo/network.js` (new) | `blockNetwork()`: `fetch` / `XMLHttpRequest` reject locally with a logged error |
| `src/demo/demoNav.js` (new, pure) | Source-screen navigation actions (`RESET` to `[Picker, mode]` or `[Picker]`) |
| `src/demo/DemoSourceScreen.js` (new) | The demo's first screen: document, structure (the real `StructureSummary`), sections and cards, one grounded excerpt highlighted on its page |
| `src/demo/DemoApp.js` (new) | Demo root: blocks the network, installs the fixture source, its own stack (`Upload` = source screen, `Picker`, `Game2`, `TOC`, `GameMC`; no `Build`) |
| `src/demo/fixture/harbor-point-deck.json` (new) | The synthetic deck (§37.3) |
| `index.js` | `EXPO_PUBLIC_FLASH_DEMO === "1"` ? DemoApp : App (inlined and constant-folded at build time) |
| `metro.config.js` (new) | Expo's default config + all `EXPO_PUBLIC_*` values under `transformer` (part of the cache key) (§37.5) |
| `scripts/export-demo.mjs` (new), `package.json` | `npm run export:demo` → `dist/demo/` with `--clear`, relative asset paths, demo title |
| `src/study/useDeck.js` | `deckSource.loadTemplate` added; `useSavedTemplate` / `loadTemplateForViewing` read through the seam (identical behaviour in the app) |
| `src/navigation/navTheme.js` (new), `App.js`, `src/navigation/Stack.js` | Shared nav theme and screen options, so the demo doesn't import the app's routes |
| `src/ui/Chip.js`, `src/ui/Button.js`, `src/components/FlipDrill.js`, `src/Screens/BuildScreen.js`, `src/ui/BrandMark.js`, `src/Screens/GameMC.js`, `src/components/study/TemplateSheet.js`, `src/Screens/GamePicker.js` | Web accessibility fixes (§37.6) |
| `.env.example` | Note: never set `EXPO_PUBLIC_FLASH_DEMO` in env files |
| `tests/f6Demo.test.mjs` (new) | 26 tests |
| `docs/portfolio/fixture/build_fixture.py`, `harbor-point-operations-brief.pdf` (new) | Reproducible fixture build; the synthetic source PDF |
| `docs/portfolio/DEMO_INTEGRATION_SPEC.md`, `docs/portfolio/media/*.png` (9) (new) | Framework-neutral spec; curated screenshots |
| `FLASH_PORTFOLIO_HANDOFF.md` (new) | Portfolio package |

### 37.2 Demo architecture decision

Options considered: a separate entry file (`expo export` has no entry flag; `main` is fixed), a runtime toggle (would ship in production builds), and a build-time flag. Chosen: **`EXPO_PUBLIC_FLASH_DEMO=1`, read only in `index.js`, set only by `scripts/export-demo.mjs`.** Metro inlines the value and constant-folds the conditional `require` in production builds, so each bundle contains only its own root. Verified: the normal web bundle (531 modules) has 0 fixture/demo strings; the demo bundle (523 modules) has no Upload/Build code; the Android/iOS bundles contain no demo strings. The demo reuses the real screens through the F3 `deckSource` seam (the only addition is `loadTemplate`); no study screen knows about the demo. The demo's source screen is registered under the `Upload` route name, so the screens' own "New deck" / "Back to Upload" actions land there unchanged.

### 37.3 Fixture

"Harbor Point Microgrid: Operations Brief": fictional, written for the demo; 6 pages, 757 words, a 4-entry outline with uneven ranges (1–2, 3–4, 5, 6). `build_fixture.py` builds the PDF with PyMuPDF, then runs the certified backend in-process through its HTTP API (Django test client, the backend's own `test_settings`, a throwaway SQLite DB). Both model seams are replaced by a scripted stand-in returning hand-written study notes and cards, and `httpx.Client.send` is blocked. 8 scripted model calls (4 template, 4 card batches). Result: 10 cards, pages `1,2,2,3,3,5,5,6,6,null`, ordinals 1..10, `partial: false`, no warnings, template `page_source: "toc"`. Card 10's excerpt is a deliberate paraphrase in the two-page section, so the real `_grounded_page` leaves it `null` ("Page unknown · Section covers pages 3–4"). The random public id is replaced by `demo-harbor-point-brief` (valid format). Re-running the script reproduces the JSON exactly.

### 37.4 Offline proof

- Unit: every demo-source call completes with `fetch`/`XMLHttpRequest` replaced by test-failing spies (0 calls); the guard rejects; `src/demo/*` code uses no `API_BASE`, config, storage or fetch.
- Live (headless Edge, DevTools network log, every walk): exactly `GET /`, the JS bundle and `favicon.ico`; 0 console messages; 0 local/session storage keys; served from a sub-path (`/flash-demo/`).
- The demo bundle still contains the unused default `http://127.0.0.1:8000` string from `src/config.js` (imported by `useDeck.js`); it is never requested.

### 37.5 Verified bug: the Metro cache could ship the demo as the app

Production builds inline `EXPO_PUBLIC_*` values during the Babel transform (`babel-preset-expo` `inline-env-vars`), and Metro's transform cache key (`metro-transform-worker` `getCacheKey`, which hashes `config.transformer`) does not include those values. Reproduced: `npm run export:demo` followed by a plain `npx expo export --platform web` produced a byte-identical **demo** bundle (the F0.5 "use --clear" caveat, now with real consequences). Fix: `metro.config.js` adds the sorted `EXPO_PUBLIC_*` name=value list to `config.transformer`. Verified in both directions without `--clear`: normal-after-demo → 0 demo strings; demo-after-normal → demo only. This also closes the old `EXPO_PUBLIC_API_BASE` caveat. Tested: the key differs per value (mutation: a static key fails the test).

### 37.6 Verified bug: web accessibility states (react-native-web)

react-native-web 0.20's `createDOMProps` ignores `accessibilityState` (it reads only `aria-*` and the deprecated `accessibility*` props). Live DOM before the fix: the MC scoring chips were `role=radio` without `aria-checked` (axe critical), the flip card had no `aria-expanded`, busy buttons no `aria-busy`. Separately, `ProductSteps` was a `<ul>` with plain `<div>` children and the MC options a `<ul>` of buttons (axe critical), and the template dialog had no accessible name.

Fixes: `aria-checked` / `aria-expanded` / `aria-busy` beside `accessibilityState` (RN 0.79 maps `aria-*` to the same native state); `role="listitem"` for the steps; `role="group"` for the options; `aria-label="Study template"` on the Modal. Also, on the Picker, Escape from the template returned focus to a scroll container because the button was disabled while loading; it now stays enabled and ignores re-entry, and focus returns to it (verified with the keyboard). Lighthouse accessibility on the demo: 93 → 100. Tests: every checked/expanded/busy `accessibilityState` must carry its `aria-*` prop (mutation-checked), plus list/group/dialog-name and Picker-focus guards.

Not changed (documented): the "Show source excerpt" switch is RNW's 40×20 native `<input role=switch>`. It passes axe `target-size` (WCAG 2.2 AA, by spacing) but is below the 44 px convention; replacing it would change a native control that can't be device-tested here. axe also reports `label-content-name-mismatch` (e.g. the name "Option B: …" vs the visible "B …"; TOC rows; Picker mode cards), `region` and `scrollable-region-focusable` (template sheet). None are in Lighthouse's scored set.

### 37.7 Verification

| Check | Result |
|---|---|
| `npm ci` / `npm test` | ✅ / ✅ **234/234** (208 + 26) |
| Web export (app) / demo export | ✅ 531 / 523 modules |
| Android / iOS export | ✅ 886 / 884 modules |
| Expo Doctor | ✅ 18/18 |
| Backend at `9b9239d` (clean venv, Python 3.14.7): tests / `check` / migrations / `check --deploy` | ✅ 86/86 / clean / no drift / W004 + W008 only |
| Fresh clone of the final frontend SHA | §37.12 |

**Responsive matrix** (demo, headless Edge, touch emulation at 390/844/768). Screens: source screen, Picker, template sheet, Flip question, Flip answer + source, TOC, Flip unknown-page card, MC question, MC answered. Viewports: 390×844, 844×390, 768×1024, 1280×800, 1440×900. **45/45** with `scrollWidth == innerWidth`, 0 elements past the right edge, and every required control in view and hit-testable (`elementFromPoint`).

**Behaviour at every viewport:** the answer text is absent from the DOM before reveal; focus lands on the card; the reveal shows "Page 3 · concept" and the excerpt; the TOC marks and focuses the current row, search "storage" → 4 of 10, Escape clears it; the jump to card 10 shows "Page unknown · Section covers pages 3–4 · process"; a wrong MC answer waits with ✓/✗ text (glyph-only in short landscape, as designed in F4); a correct answer advances exactly once; 2 px focus ring; template "4 sections · 23 key points", Escape closes it.

**Keyboard only (1440×900):** the first Tab reaches "Start Flip Drill"; the template dialog is named, focus moves inside, Escape returns focus to the opener (Picker and Flip Drill); Enter flips (`aria-expanded` true); Space on the focused Next goes to the next card; Enter on an MC option moves focus to Next; radios report `aria-checked`; the TOC focuses the current row and Escape returns to study.

**Lighthouse 12.8.2** (headless Edge 154, local): demo desktop 99/100/100 (perf/a11y/best practices), 100/100/100 with gzip; mobile 79/100/100 without compression (3 runs; one earlier run 71), 98/100/100 with gzip (4 runs). The real app's first screen: 99 (desktop) and 80 (mobile) / 100 / 100. Before the a11y fixes: a11y 93 (`aria-required-children`).

**API smoke** (certified backend, DEBUG off, allowlists, 2 MB / 40 pages / generate 4 per hour, local `FakeOpenAI` stub): valid analyze 200; generate 201 7/7; partial 201 `partial: true` "Created 5 of 7…"; text-as-PDF 400 `not_pdf` with 0 model calls; 3 MB 413 `limit_mb: 2`; unknown deck 404; empty deck 200 `[]`; 5th generate 429 with `Retry-After`; ids 22 characters; integer ids 1–3 → 404; `/feedback/` 404; foreign Host 400 JSON; 0 temp files left. The real app (normal build) analysed the synthetic PDF through this backend (one `POST /analyze/`, 0 console messages) for `flash-upload-plan.png`. No backend change was needed (no blocker found).

### 37.8 Browser history

Unchanged: no React Navigation `linking` in the app (Build params carry the PDF data URL and plan; deck ids are bearer tokens; Build/TOC can't be rebuilt on reload). The demo doesn't touch the URL either. A recreation may use `#mode/card` hashes (no private data).

### 37.9 Native

Not run on any device, emulator or simulator (none available). Android/iOS exports are build evidence only. The F6 changes are web-gated or cross-platform `aria-*` props that RN 0.79 maps to `accessibilityState`. `FLASH_PORTFOLIO_HANDOFF.md` lists "tested on devices" under Do not claim.

### 37.10 Demo operations

- Build: `npm ci && npm run export:demo` → `dist/demo/`. Serve statically (any path), ideally with gzip/brotli.
- Regenerate the fixture: `python docs/portfolio/fixture/build_fixture.py <flashcard_django checkout at 9b9239d>` with the backend's requirements installed. It rewrites the PDF and the JSON deterministically; then run `npm test`.
- Never set `EXPO_PUBLIC_FLASH_DEMO` in `.env*`.

### 37.11 Remaining debt (outside F6)

Everything in §36.17; the a11y residue in §37.6; no URL routing; the native device pass. Merging and deployment are owner decisions.

### 37.12 SHAs and fresh clone

Implementation commit and fresh-clone results: recorded in the follow-up commit below this line.
