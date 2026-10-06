// tests/sourceBuild.test.mjs — F2 request contract, error summaries and the
// Build-screen lifecycle guard (src/source/api.js, src/source/buildRun.js).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ANALYZE_PATH,
  GENERATE_PATH,
  RequestError,
  appendFile,
  deckNameFor,
  describeAnalyzeError,
  describeGenerateError,
  generateFields,
  postMultipart,
} from "../src/source/api.js";
import { completeBuild, createRun, formatDuration, resolveBuildMs, runRequest } from "../src/source/buildRun.js";

// ── fakes ───────────────────────────────────────────────────────────────────
class FakeFormData {
  constructor() {
    this.entries = [];
  }
  append(k, v) {
    this.entries.push([k, v]);
  }
}

function response(status, body) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

/** fetch that resolves after `ms` unless aborted (like a real fetch). */
function slowFetch(ms, res, calls = []) {
  return (url, init = {}) =>
    new Promise((resolve, reject) => {
      calls.push({ url, init });
      const t = setTimeout(() => resolve(res), ms);
      init.signal?.addEventListener?.("abort", () => {
        clearTimeout(t);
        const e = new Error("The operation was aborted.");
        e.name = "AbortError";
        reject(e);
      });
    });
}

/** fetch that ignores abort (a platform without abortable fetch). */
function stubbornFetch(ms, res, calls = []) {
  return (url, init) =>
    new Promise((resolve) => {
      calls.push({ url, init });
      setTimeout(() => resolve(res), ms);
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── contract ────────────────────────────────────────────────────────────────
test("endpoint paths are unchanged", () => {
  assert.equal(ANALYZE_PATH, "/api/flashcards/analyze/");
  assert.equal(GENERATE_PATH, "/api/flashcards/generate/");
});

test("generate fields: deck_name, cards_wanted, allocations (only when present)", () => {
  const allocations = [{ title: "Cells", page_start: 1, page_end: 4, cards: 2 }];
  assert.deepEqual(generateFields({ fileName: "Biology Notes.PDF", cardsWanted: 5, allocations }), [
    ["deck_name", "Biology Notes"],
    ["cards_wanted", "5"],
    ["allocations", JSON.stringify(allocations)],
  ]);
  assert.deepEqual(generateFields({ fileName: "x.pdf", cardsWanted: 7, allocations: [] }), [
    ["deck_name", "x"],
    ["cards_wanted", "7"],
  ]);
  const keys = generateFields({ fileName: "x.pdf", cardsWanted: 7, allocations }).map(([k]) => k);
  assert.ok(!keys.includes("coverage"), "coverage is not a backend field");
  assert.equal(deckNameFor(undefined), "document");
});

test("appendFile: web uploads a File named after the pick; native a uri descriptor", async () => {
  class FakeFile {
    constructor(parts, name, opts) {
      Object.assign(this, { parts, name, type: opts.type });
    }
  }
  const web = await appendFile(new FakeFormData(), { uri: "blob:1", name: "a.pdf", mimeType: "application/pdf" }, {
    isWeb: true,
    FileImpl: FakeFile,
    fetchImpl: async () => ({ blob: async () => "BLOB" }),
  });
  assert.deepEqual(web.entries.map(([k, v]) => [k, v.name, v.type, v.parts]), [["file", "a.pdf", "application/pdf", ["BLOB"]]]);

  const native = await appendFile(new FakeFormData(), { uri: "file:///a.pdf", name: "a.pdf" }, { isWeb: false });
  assert.deepEqual(native.entries, [["file", { uri: "file:///a.pdf", name: "a.pdf", type: "application/pdf" }]]);

  await assert.rejects(
    appendFile(new FakeFormData(), { uri: "blob:gone" }, { isWeb: true, FileImpl: FakeFile, fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "file"
  );
});

test("postMultipart: POST with body and signal; JSON on success", async () => {
  const calls = [];
  const fd = new FakeFormData();
  const ctl = new AbortController();
  const json = await postMultipart({
    fetchImpl: async (url, init) => (calls.push({ url, init }), response(201, { deck_id: 9 })),
    url: "http://h/api/flashcards/generate/",
    formData: fd,
    signal: ctl.signal,
  });
  assert.deepEqual(json, { deck_id: 9 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, fd);
  assert.equal(calls[0].init.signal, ctl.signal);
});

test("postMultipart: HTTP errors keep status + detail (JSON or text); network and abort are typed", async () => {
  await assert.rejects(
    postMultipart({ fetchImpl: async () => response(500, { detail: "Deck build failed: Model returned zero cards." }), url: "u" }),
    (e) => e instanceof RequestError && e.kind === "http" && e.status === 500 && /zero cards/.test(e.detail)
  );
  await assert.rejects(
    postMultipart({ fetchImpl: async () => response(502, "<html>Bad gateway</html>"), url: "u" }),
    (e) => e.kind === "http" && e.status === 502 && e.detail.includes("Bad gateway")
  );
  await assert.rejects(
    postMultipart({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); }, url: "u" }),
    (e) => e.kind === "network"
  );
  await assert.rejects(
    postMultipart({ fetchImpl: async () => { const e = new Error("x"); e.name = "AbortError"; throw e; }, url: "u" }),
    (e) => e.kind === "aborted"
  );
  await assert.rejects(postMultipart({ fetchImpl: async () => response(200, "not json"), url: "u" }), (e) => e.kind === "response");
});

// ── error summaries ─────────────────────────────────────────────────────────
test("error summaries are human and never echo server text or paths", () => {
  const leaky = new RequestError({ kind: "http", status: 500, detail: "analyze failed: Failed to open file 'C:\\Temp\\tmpab12.pdf'." });
  const a = describeAnalyzeError(leaky);
  assert.equal(a.title, "This file couldn't be read as a PDF");
  assert.equal(a.status, 500);
  for (const s of [a.title, a.message]) assert.ok(!/tmp|C:\\|failed to open/i.test(s), s);

  assert.match(describeAnalyzeError(new RequestError({ kind: "network", detail: "TypeError: Failed to fetch" })).title, /reach/);
  assert.match(describeAnalyzeError(new RequestError({ kind: "http", status: 500, detail: "boom" })).title, /couldn't analyze/);

  const g = describeGenerateError(new RequestError({ kind: "http", status: 500, detail: "Deck build failed: Model returned zero cards." }));
  assert.equal(g.title, "No cards could be written");
  assert.ok(!/Model returned/.test(g.message));
  assert.match(describeGenerateError(new RequestError({ kind: "network" })).message, /No deck was created/);
  assert.equal(describeGenerateError(new RequestError({ kind: "http", status: 500, detail: "KeyError 'x'" })).title, "The deck couldn't be built");
});

// ── leave-build race (verified F0 bug) ──────────────────────────────────────
function harness() {
  const events = [];
  const storage = {
    saveLastDeck: async (m) => events.push(["saveLastDeck", m.deckId]),
    saveTemplate: async (id) => events.push(["saveTemplate", id]),
  };
  const onSuccess = (json) =>
    completeBuild({ json, deckName: "bio", buildMs: 1, storage, goToPicker: (p) => events.push(["navigate", p.deckId]) });
  const onError = (e) => events.push(["error", e.kind]);
  return { events, onSuccess, onError };
}

test("leaving Build before the response: no navigation, no storage writes, no error state", async () => {
  const { events, onSuccess, onError } = harness();
  const calls = [];
  const run = createRun();
  const pending = runRequest({
    run,
    request: (signal) => postMultipart({ fetchImpl: slowFetch(40, response(201, { deck_id: 7, warnings: [] }), calls), url: "u", signal }),
    onSuccess,
    onError,
  });
  await sleep(5);
  run.cancel(); // Build unmounts (Home / Back / Cancel)
  assert.equal(calls[0].init.signal.aborted, true, "the HTTP request is aborted");
  assert.equal(await pending, "cancelled");
  await sleep(60); // well past when the server would have answered
  assert.deepEqual(events, []);
});

test("even if the platform cannot abort fetch, a late response is dropped", async () => {
  const { events, onSuccess, onError } = harness();
  const run = createRun();
  const pending = runRequest({
    run,
    request: (signal) => postMultipart({ fetchImpl: stubbornFetch(30, response(201, { deck_id: 7, template: {}, warnings: [] })), url: "u", signal }),
    onSuccess,
    onError,
  });
  run.cancel();
  assert.equal(await pending, "cancelled");
  assert.deepEqual(events, []);
});

test("a late failure after leaving is dropped too", async () => {
  const { events, onSuccess, onError } = harness();
  const run = createRun();
  const pending = runRequest({
    run,
    request: (signal) => postMultipart({ fetchImpl: stubbornFetch(20, response(500, { detail: "boom" })), url: "u", signal }),
    onSuccess,
    onError,
  });
  run.cancel();
  assert.equal(await pending, "cancelled");
  assert.deepEqual(events, []);
});

test("staying on Build: storage writes are issued before navigation; exactly one request", async () => {
  const { events, onSuccess, onError } = harness();
  const calls = [];
  const run = createRun();
  const outcome = await runRequest({
    run,
    request: (signal) => postMultipart({ fetchImpl: slowFetch(5, response(201, { deck_id: 7, template: { title: "bio" }, warnings: [] }), calls), url: "u", signal }),
    onSuccess,
    onError,
  });
  assert.equal(outcome, "success");
  assert.equal(calls.length, 1);
  assert.deepEqual(events, [["saveLastDeck", 7], ["saveTemplate", 7], ["navigate", 7]]);
  run.cancel(); // unmount after navigating: harmless, nothing more happens
  await sleep(10);
  assert.equal(events.length, 3);
});

test("warnings: deck is saved for resume, Build stays to show them (no navigation)", () => {
  const events = [];
  const out = completeBuild({
    json: { deck_id: 3, cards_created: 5, warnings: ['Section "Cells": requested 6, generated 3.'], template: { t: 1 } },
    deckName: "bio",
    buildMs: 1234,
    storage: {
      saveLastDeck: async (m) => events.push(["saveLastDeck", m]),
      saveTemplate: async (id, t) => events.push(["saveTemplate", id, t]),
    },
    goToPicker: () => events.push(["navigate"]),
  });
  assert.equal(out.navigated, false);
  assert.deepEqual(out.warnings, ['Section "Cells": requested 6, generated 3.']);
  assert.deepEqual(out.pickerParams, { deckId: 3, buildMs: 1234 });
  assert.deepEqual(events, [
    ["saveLastDeck", { deckId: 3, name: "bio", cardsCount: 5, buildMs: 1234, metrics: null }],
    ["saveTemplate", 3, { t: 1 }],
  ]);
});

test("storage failures are logged, never thrown, and never block navigation", async () => {
  const warned = [];
  let navigated = 0;
  completeBuild({
    json: { deck_id: 1, template: {}, warnings: [] },
    deckName: "x",
    buildMs: 1,
    storage: {
      saveLastDeck: () => { throw new Error("sync fail"); },
      saveTemplate: async () => { throw new Error("async fail"); },
    },
    goToPicker: () => navigated++,
    log: { warn: (...a) => warned.push(a[0]) },
  });
  await sleep(0);
  assert.equal(navigated, 1);
  assert.deepEqual(warned.sort(), ["[BuildScreen] saveLastDeck failed", "[BuildScreen] saveTemplate failed"]);
});

test("a server error is reported once and never retried automatically", async () => {
  const { events, onSuccess, onError } = harness();
  const calls = [];
  const outcome = await runRequest({
    run: createRun(),
    request: (signal) => postMultipart({ fetchImpl: slowFetch(1, response(500, { detail: "boom" }), calls), url: "u", signal }),
    onSuccess,
    onError,
  });
  assert.equal(outcome, "error");
  assert.equal(calls.length, 1);
  assert.deepEqual(events, [["error", "http"]]);
});

test("createRun works without AbortController (guard still holds)", () => {
  const run = createRun(null);
  assert.equal(run.signal, undefined);
  assert.equal(run.active, true);
  run.cancel();
  run.cancel();
  assert.equal(run.active, false);
});

test("build time prefers a server total, else the measured time", () => {
  assert.equal(resolveBuildMs({ metrics: { total_ms: 900 } }, 1200), 900);
  assert.equal(resolveBuildMs({}, 1200), 1200);
});

test("finished build duration reads naturally", () => {
  assert.equal(formatDuration(370), "under a second");
  assert.equal(formatDuration(1000), "1 second");
  assert.equal(formatDuration(42_900), "42 seconds");
  assert.equal(formatDuration(125_000), "2 min 05 s");
});
