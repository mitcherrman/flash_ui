// tests/notifyStore.test.mjs — queue semantics behind notify() on web.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _resetForTests, enqueue, makeDialog, resolveDialog, subscribe } from "../src/ui/notifyStore.js";

beforeEach(() => _resetForTests());

test("Alert.alert-style args normalise to a dialog with an OK default", () => {
  const d = makeDialog("Export failed", new Error("HTTP 500"));
  assert.equal(d.title, "Export failed");
  assert.equal(d.message, "Error: HTTP 500");
  assert.deepEqual(d.buttons.map((b) => [b.text, b.style]), [["OK", "default"]]);
});

test("button styles are preserved; unknown styles become default", () => {
  const d = makeDialog("t", "m", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive" }, { text: "Go", style: "weird" }]);
  assert.deepEqual(d.buttons.map((b) => b.style), ["cancel", "destructive", "default"]);
});

test("FIFO queue: one dialog at a time, subscribers see every change", () => {
  const seen = [];
  subscribe((q) => seen.push(q.map((d) => d.title)));
  const a = enqueue(makeDialog("first"));
  enqueue(makeDialog("second"));
  resolveDialog(a);
  assert.deepEqual(seen, [[], ["first"], ["first", "second"], ["second"]]);
});

test("resolving runs the chosen button handler once, after removal", () => {
  let calls = 0;
  let queueAtCall = null;
  let latest = [];
  subscribe((q) => (latest = q));
  const id = enqueue(makeDialog("t", "m", [{ text: "OK", onPress: () => { calls++; queueAtCall = latest.length; } }]));
  resolveDialog(id, 0);
  resolveDialog(id, 0); // already gone → no-op
  assert.equal(calls, 1);
  assert.equal(queueAtCall, 0);
});

test("dismissing without a button runs no handler", () => {
  let calls = 0;
  const id = enqueue(makeDialog("t", "m", [{ text: "OK", onPress: () => calls++ }]));
  resolveDialog(id, null);
  assert.equal(calls, 0);
});
