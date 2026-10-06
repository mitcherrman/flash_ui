# Flashcard Maker V2 — F0 Baseline Audit & Modernization Handoff

**Workstream:** F0 — baseline audit (investigative only; no product code changed)
**Audit date:** 2026-10-06
**Frontend branch:** `flashv2/f0-baseline` (this file is the only change)

> **F0.5 update:** blockers B1–B4 are fixed on `flashv2/f05-stabilization` in both repos. See **§31 F0.5 Addendum** at the end. Where §1–§30 describe F0.5-fixed behaviour (page ranges, `ordinal = 0`, `src/env.js`, `tiktoken`, `.chunks.pkl`, temp paths in errors, template title), §31 supersedes them.

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
| Frontend `mitcherrman/flash_ui` | `flashv2/f05-stabilization` | `78b289edf651e98100fa83ae71d7b490e44fd69b` (F0) | `a9e1d82bce589820508b90ae6a071772f703d586` (config fix), then the commit adding this addendum (its direct child) |
| Backend `mitcherrman/flashcard_django` | `flashv2/f05-stabilization` | `18a69289c7d34869fa6a141ec10210e3cc3835d0` (`main`) | `9575ae04e48c54f60d679dbe97b984ab9eb2fcc7` |

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
6. **Card `page`:**
   - The page inside the section's real range whose text contains the card's excerpt verbatim. The check uses the whole excerpt, or its first or last 8 words, normalised for case, punctuation and whitespace.
   - Otherwise, the section's first page.
   - With no real range, i.e. `estimated` or the global "Mixed topics" catch-up: the excerpt may be located anywhere in the document; otherwise `page = null`. There is **no more fabricated `page=1`**.
   - Limits: paraphrased excerpts fall back to the section start; text is grounded per page, not per line.
7. **Unchanged budgets:** section chunks are still trimmed to `max(2000, max_tokens×6)` chars, and section input is still capped at 24,000 chars.

### 31.5 Ordinal policy

- `Card.ordinal` = the 1-based position in the document order already used by `hand?order=doc` and `toc`: page ascending, unknown (`null`) pages last, then insertion order.
- Before `bulk_create`, cards are stably sorted by `(page is null, page)`. Ties keep pipeline (section) order, and ids are assigned in the same order.
- For new decks, `card.ordinal == toc.ordinal == hand index + 1` (tested).
- Ordering semantics are unchanged: `hand`/`toc` still sort by page/id, not by `ordinal`.
- Decks created before F0.5 keep `ordinal = 0`; there is no backfill migration.
- Side effect: "Mixed topics" catch-up cards now have `page = null`, so they sort **last** instead of first.

### 31.6 Tests and checks

**Backend suite:** `flashcards/tests/test_pipeline.py`, 15 tests, about 0.3 s, deterministic over 3 consecutive runs.

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
- no temp files left after generate; parse errors expose no temp path.

**Run** (the settings still require `OPENAI_API_KEY`, but any placeholder works and it is never used):

```bash
OPENAI_API_KEY=unused-test-key python manage.py test flashcards
```

On Python 3.14 the suite patches out Django's `mail_admins` handler (see §31.7, item 1).

| Check (all on Python 3.14.7 / Node 24.19.0) | Result |
|---|---|
| BE clean clone (`git archive 9575ae0`) → new venv → `pip install -r requirements.txt` | ✅ exit 0; `tiktoken` not installed; `pip check` clean |
| BE `manage.py check` | ✅ no issues |
| BE `makemigrations --check --dry-run` | ✅ no changes (no model changes in F0.5) |
| BE `manage.py test flashcards` (clean clone) | ✅ 15/15 OK. On the base pipeline the same suite gave 8 failures + 3 errors (before/after evidence) |
| BE import every module | ✅ all active modules; ❌ only the dead `ai.chunker` (tiktoken) and `ai.prompt_cards` (genanki), as in F0 |
| BE synthetic E2E: real `runserver`, real OpenAI SDK → local `/v1/chat/completions` stub via `OPENAI_BASE_URL` (scratch only) | ✅ analyze 6 pages / rec 3 / ranges 1–4,5–5,6–6. Generate 10/10, no warnings, `title="uneven"`, sections `toc` 1–4/5–5/6–6. Hand: ordinals 1..10, pages 1,1,1,2,2,2,5,5,6,6, matching the excerpt pages. TOC equals hand. 7 model calls (3 template + 4 card), each with only its own section's pages. 0 `.chunks.pkl` in `%TEMP%`. Broken PDF → `'broken.pdf'` in `detail` |
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
  - `page` can be `null` for "Mixed topics" or estimated cards (all screens already handle `null`);
  - catch-up cards sort last;
  - card `ordinal` is meaningful (1..N) for new decks;
  - card `section` always equals a template section title (or "Mixed topics").
- **F1–F4 (frontend):** configure the API with `EXPO_PUBLIC_API_BASE` / `.env.local`; never reintroduce a required untracked module. The §26 global criterion (`npm ci && expo export` on a fresh clone) now holds.
- **F5:** extend `flashcards/tests/` rather than starting over. `FakeOpenAI` plus `make_pdf` is the reusable seam, and the scratch HTTP stub pattern (`OPENAI_BASE_URL`) works with the real SDK. Remaining F5 acceptance items from §26: `check --deploy`, throttling, upload limits, path-free errors in general, env-driven settings, plus item 1 above.
- **F6:** fixture page numbers can now come from a real generate run against `make_pdf`-style synthetic documents. The fixture must be shaped exactly like the `hand`/`toc`/`template` responses, including `page_source`.
