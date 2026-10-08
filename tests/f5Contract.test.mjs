// tests/f5Contract.test.mjs — the backend F5 contract as the frontend sees it:
// structured errors ({detail, code}, limits, Retry-After), explicit partial
// builds, and the cache version that retires integer deck ids.
import { test } from "node:test";
import assert from "node:assert/strict";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deckSubtitle, resolveDeckIdentity } from "../src/study/deck.js";
import {
  RequestError,
  describeAnalyzeError,
  describeGenerateError,
  httpError,
  postMultipart,
  waitPhrase,
} from "../src/source/api.js";
import { buildOutcome, completeBuild } from "../src/source/buildRun.js";
import { getJSON } from "../src/study/deckApi.js";
import { purgeOldCacheVersions } from "../src/utils/cache.js";

function response(status, body, headers = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return { ok: status >= 200 && status < 300, status, text: async () => text, headers: { get: (k) => h.get(k.toLowerCase()) ?? null } };
}

const httpErr = (status, code, extra = {}) =>
  new RequestError({ kind: "http", status, code, detail: "server text that must not be shown", ...extra });

// ── structured HTTP errors ──────────────────────────────────────────────────
test("httpError keeps the server's code, limit and retry time", () => {
  const e = httpError(response(413, ""), { detail: "The file is larger than the 20 MB limit.", code: "file_too_large", limit_mb: 20 });
  assert.deepEqual([e.kind, e.status, e.code, e.limit, e.retryAfter], ["http", 413, "file_too_large", 20, null]);
  const p = httpError(response(400, ""), { detail: "x", code: "too_many_pages", limit_pages: 200, pages: 250 });
  assert.equal(p.limit, 200);
  const t = httpError(response(429, "", { "Retry-After": "90" }), { detail: "x", code: "throttled" });
  assert.equal(t.retryAfter, 90, "falls back to the Retry-After header");
  const b = httpError(response(429, "", { "Retry-After": "90" }), { detail: "x", code: "throttled", retry_after: 30 });
  assert.equal(b.retryAfter, 30, "the body wins");
  const html = httpError(response(502, ""), null, "<html>Bad gateway</html>");
  assert.deepEqual([html.code, html.detail], [null, "<html>Bad gateway</html>"]);
});

test("postMultipart and getJSON both raise the structured error", async () => {
  const body = { detail: "No cards could be generated", code: "generation_failed" };
  await assert.rejects(postMultipart({ fetchImpl: async () => response(502, body), url: "u" }), { kind: "http", status: 502, code: "generation_failed" });
  await assert.rejects(getJSON({ fetchImpl: async () => response(404, { detail: "x", code: "deck_not_found" }), url: "http://x/" }),
    { kind: "http", status: 404, code: "deck_not_found" });
  await assert.rejects(getJSON({ fetchImpl: async () => response(503, "<html>down</html>"), url: "http://x/" }),
    { kind: "http", status: 503, code: null });
});

// ── human copy, chosen by code ──────────────────────────────────────────────
test("analyze errors: one clear message per upload problem, never the server's text", () => {
  const cases = {
    not_pdf: /isn't a PDF/,
    pdf_unreadable: /couldn't be read as a PDF/,
    pdf_encrypted: /password-protected/,
    no_text: /no selectable text/,
    file_required: /didn't reach the server/,
    too_many_pages: /too many pages/,
    file_too_large: /too large/,
    throttled: /Too many requests/,
  };
  for (const [code, title] of Object.entries(cases)) {
    const d = describeAnalyzeError(httpErr(code === "file_too_large" ? 413 : code === "throttled" ? 429 : 400, code));
    assert.match(d.title, title, code);
    assert.ok(!JSON.stringify(d).includes("server text"), code);
  }
  assert.match(describeAnalyzeError(httpErr(413, "file_too_large", { limit: 20 })).message, /limit is 20 MB/);
  assert.match(describeAnalyzeError(httpErr(400, "too_many_pages", { limit: 200 })).message, /limit is 200 pages/);
  assert.match(describeAnalyzeError(httpErr(429, "throttled", { retryAfter: 600 })).message, /in about 10 minutes/);
  assert.match(describeAnalyzeError(httpErr(500, "server_error")).title, /couldn't analyze/);
});

test("generate errors: failure, unavailable, daily limit, bad plan, upload problems", () => {
  assert.equal(describeGenerateError(httpErr(502, "generation_failed")).title, "No cards could be written");
  assert.match(describeGenerateError(httpErr(502, "generation_failed")).message, /Nothing was saved/);
  assert.equal(describeGenerateError(httpErr(503, "generation_unavailable")).title, "Deck creation isn't available");
  const limit = describeGenerateError(httpErr(429, "generation_limit_reached", { retryAfter: 3 * 3600 }));
  assert.match(limit.title, /limit for new decks/);
  assert.match(limit.message, /in about 3 hours/);
  assert.match(describeGenerateError(httpErr(400, "invalid_allocations")).title, /didn't accept this plan/);
  assert.match(describeGenerateError(httpErr(400, "no_text")).message, /Go back and choose another PDF/);
  assert.match(describeGenerateError(httpErr(429, "throttled")).title, /Too many requests/);
  assert.equal(describeGenerateError(httpErr(500, "server_error")).title, "The deck couldn't be built");
});

test("waitPhrase", () => {
  assert.equal(waitPhrase(null), "later");
  assert.equal(waitPhrase(0), "later");
  assert.equal(waitPhrase(20), "in about 1 minute");
  assert.equal(waitPhrase(45 * 60), "in about 45 minutes");
  assert.equal(waitPhrase(5 * 3600), "in about 5 hours");
});

// ── partial builds ──────────────────────────────────────────────────────────
test("buildOutcome shows what was actually made", () => {
  assert.deepEqual(buildOutcome({ cards_created: 10, requested: 10, partial: false }), {
    created: 10, requested: 10, partial: false, title: "10 cards created", warningsTitle: "Some sections had less material",
  });
  const p = buildOutcome({ cards_created: 6, requested: 9, partial: true });
  assert.equal(p.title, "6 of 9 cards created");
  assert.equal(p.warningsTitle, "Fewer cards than you asked for");
  assert.equal(buildOutcome({ cards_created: 1, requested: 1 }).title, "1 card created");
  // An older server without `partial`: derived from the counts.
  assert.equal(buildOutcome({ cards_created: 2, requested: 3 }).partial, true);
  assert.equal(buildOutcome({}).title, "Deck created");
});

test("a partial build stays on Build with its warnings; the real count is saved", () => {
  const saved = [];
  const nav = [];
  const out = completeBuild({
    json: { deck_id: "cA5OSbFx_UWsflkXNFyH-w", cards_created: 6, requested: 9, partial: true,
            warnings: ["Created 6 of 9 requested cards."], template: { title: "bio" } },
    deckName: "bio",
    buildMs: 10,
    storage: { saveLastDeck: async (m) => saved.push(m), saveTemplate: async () => {} },
    goToPicker: (p) => nav.push(p),
  });
  assert.equal(out.navigated, false);
  assert.deepEqual(nav, []);
  assert.equal(saved[0].cardsCount, 6);
  assert.equal(saved[0].deckId, "cA5OSbFx_UWsflkXNFyH-w");
});

// ── opaque ids never reach the UI ───────────────────────────────────────────
test("the resume card shows the deck's name and count, never its opaque id", () => {
  const meta = { deckId: "cA5OSbFx_UWsflkXNFyH-w", name: "uneven-toc", cardsCount: 3, buildMs: 400 };
  const id = resolveDeckIdentity({ deckId: meta.deckId, meta });
  assert.equal(id.displayTitle, "uneven-toc");
  assert.equal(deckSubtitle(id), "3 cards · Built in under a second");
});

test("no screen formats a 'Deck #<id>' label any more", () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".js") && /Deck #\{|Deck #\$\{|`deck \$\{/.test(readFileSync(p, "utf8"))) hits.push(p);
    }
  };
  walk(new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  assert.deepEqual(hits, []);
});

// ── cache version ───────────────────────────────────────────────────────────
test("cache v3: keys from older versions (integer deck ids) are purged, others kept", async () => {
  const keys = new Set([
    "fcache:v2:last_deck_meta", "fcache:v2:deck:5:hand:doc:all", "fcache:v2:template:5",
    "fcache:v3:last_deck_meta", "fcache:v3:deck:cA5OSbFx_UWsflkXNFyH-w:toc", "someone-else:key",
  ]);
  const orig = { getAllKeys: AsyncStorage.getAllKeys, multiRemove: AsyncStorage.multiRemove };
  AsyncStorage.getAllKeys = async () => [...keys];
  AsyncStorage.multiRemove = async (ks) => ks.forEach((k) => keys.delete(k));
  try {
    assert.equal(await purgeOldCacheVersions(), 3);
    assert.deepEqual([...keys].sort(), ["fcache:v3:deck:cA5OSbFx_UWsflkXNFyH-w:toc", "fcache:v3:last_deck_meta", "someone-else:key"]);
    assert.equal(await purgeOldCacheVersions(), 0, "idempotent");
    AsyncStorage.getAllKeys = async () => { throw new Error("storage unavailable"); };
    assert.equal(await purgeOldCacheVersions(), 0, "never throws");
  } finally {
    Object.assign(AsyncStorage, orig);
  }
});
