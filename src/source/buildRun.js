// src/source/buildRun.js
// Lifecycle guard for one generate request (F2). Pure, no React imports.
//
// A run is created per Build attempt and cancelled when the Build screen
// unmounts (Home, Back, Cancel). Cancelling aborts the HTTP request where
// the platform supports it AND marks the run inactive, so a response that
// still arrives later (the server keeps working after the client leaves)
// can never navigate, write storage or set state.

export function createRun(AbortControllerImpl = globalThis.AbortController) {
  const controller = typeof AbortControllerImpl === "function" ? new AbortControllerImpl() : null;
  let active = true;
  return {
    signal: controller ? controller.signal : undefined,
    get active() {
      return active;
    },
    cancel() {
      if (!active) return;
      active = false;
      try {
        controller?.abort();
      } catch {
        // abort() never matters for correctness: `active` is the guard.
      }
    },
    /** Mark finished without aborting (the response is already in hand). */
    finish() {
      active = false;
    },
  };
}

/**
 * Await `request(signal)` and report the outcome exactly once — or not at
 * all if the run was cancelled meanwhile. Never retries.
 * Resolves to "success" | "error" | "cancelled".
 */
export async function runRequest({ run, request, onSuccess, onError }) {
  let json;
  try {
    json = await request(run.signal);
  } catch (err) {
    if (!run.active || err?.kind === "aborted" || err?.name === "AbortError") return "cancelled";
    run.finish();
    onError(err);
    return "error";
  }
  if (!run.active) return "cancelled";
  run.finish();
  onSuccess(json);
  return "success";
}

/** "under a second", "42 seconds", "2 min 05 s" — for the finished build. */
export function formatDuration(ms) {
  const s = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  if (s < 1) return "under a second";
  if (s < 60) return `${s} ${s === 1 ? "second" : "seconds"}`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Build time: a server-reported total if one ever appears, else measured. */
export function resolveBuildMs(json, measuredMs) {
  const serverTotal = json?.metrics?.total_ms;
  return typeof serverTotal === "number" ? serverTotal : measuredMs;
}

/**
 * What the server actually made (backend F5). `partial` comes from the
 * server when present, else from the counts; `created` is always the real
 * number of cards, never the requested one.
 */
export function buildOutcome(json) {
  const created = Number.isInteger(json?.cards_created) ? json.cards_created : null;
  const requested = Number.isInteger(json?.requested) ? json.requested : null;
  const partial =
    typeof json?.partial === "boolean" ? json.partial : created != null && requested != null && created < requested;
  let title = "Deck created";
  if (created != null) {
    title = partial && requested != null
      ? `${created} of ${requested} cards created`
      : `${created} ${created === 1 ? "card" : "cards"} created`;
  }
  return {
    created,
    requested,
    partial,
    title,
    warningsTitle: partial ? "Fewer cards than you asked for" : "Some sections had less material",
  };
}

/**
 * Success handoff. Storage writes are issued first (not awaited, so a slow
 * device store never blocks the UI), then — only when there are no warnings
 * to read — the caller navigates to the Picker. With warnings the Build
 * screen stays put and shows them; the deck is already saved for resume.
 *
 * Returns { warnings, pickerParams, navigated }.
 */
export function completeBuild({ json, deckName, buildMs, storage, goToPicker, log = console }) {
  const deckId = json?.deck_id;
  const warnings = Array.isArray(json?.warnings) ? json.warnings.filter((w) => typeof w === "string" && w) : [];

  // Called synchronously so each write is issued (and, on web, applied to
  // localStorage) before navigation; failures are logged, never thrown.
  const fire = (what, fn) => {
    const report = (e) => log?.warn?.(`[BuildScreen] ${what} failed`, e);
    try {
      Promise.resolve(fn()).catch(report);
    } catch (e) {
      report(e);
    }
  };
  fire("saveLastDeck", () =>
    storage.saveLastDeck({
      deckId,
      name: deckName,
      cardsCount: json?.cards_created ?? null,
      buildMs,
      metrics: json?.metrics ?? null,
    })
  );
  if (json?.template) fire("saveTemplate", () => storage.saveTemplate(deckId, json.template));

  const pickerParams = { deckId, buildMs };
  const navigated = warnings.length === 0;
  if (navigated) goToPicker(pickerParams);
  return { warnings, pickerParams, navigated };
}
