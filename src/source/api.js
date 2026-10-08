// src/source/api.js
// Request helpers for the source/build workflow (F2). Pure: `fetch` and
// FormData are supplied by the caller, so `npm test` can drive them.
//
// Contract (requests unchanged from F0 §7; the backend is authoritative):
//   POST /api/flashcards/analyze/   multipart: file
//   POST /api/flashcards/generate/  multipart: file, deck_name, cards_wanted,
//                                   allocations (JSON, only when non-empty)
//
// Errors (backend F5): JSON { detail, code } plus, for some codes, a limit
// (`limit_mb`, `limit_pages`) or `retry_after` seconds (also the Retry-After
// header). The UI maps `code` to its own copy; `detail` is only logged.

export const ANALYZE_PATH = "/api/flashcards/analyze/";
export const GENERATE_PATH = "/api/flashcards/generate/";

/**
 * Thrown for every failed request. kind: network | http | aborted | file | response.
 * HTTP errors also carry the server's `code`, `retryAfter` (seconds) and `limit`.
 */
export class RequestError extends Error {
  constructor({ kind, status = null, detail = "", code = null, retryAfter = null, limit = null, cause } = {}) {
    super(
      kind === "http"
        ? `HTTP ${status}${code ? ` ${code}` : ""}${detail ? ` – ${detail}` : ""}`
        : `${kind} error${detail ? `: ${detail}` : ""}`
    );
    this.name = "RequestError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.code = code;
    this.retryAfter = retryAfter;
    this.limit = limit;
    if (cause) this.cause = cause;
  }
}

/** RequestError for a non-2xx response, from its parsed JSON body (or raw text). */
export function httpError(res, json, body) {
  const detail = typeof json?.detail === "string" ? json.detail : json ? JSON.stringify(json) : body;
  const header = Number.parseInt(res?.headers?.get?.("Retry-After") ?? "", 10);
  const retryAfter = Number.isFinite(json?.retry_after) ? json.retry_after : Number.isFinite(header) ? header : null;
  const limit = Number.isFinite(json?.limit_mb) ? json.limit_mb : Number.isFinite(json?.limit_pages) ? json.limit_pages : null;
  return new RequestError({
    kind: "http",
    status: res.status,
    detail: String(detail || "").slice(0, 400),
    code: typeof json?.code === "string" ? json.code : null,
    retryAfter,
    limit,
  });
}

function isAbort(err) {
  return err?.name === "AbortError" || err?.kind === "aborted";
}

/** Deck name sent to the server: the filename without its .pdf extension. */
export function deckNameFor(fileName) {
  return String(fileName || "document.pdf").replace(/\.pdf$/i, "");
}

/** The non-file generate fields, in the order they are appended. */
export function generateFields({ fileName, cardsWanted, allocations }) {
  const fields = [
    ["deck_name", deckNameFor(fileName)],
    ["cards_wanted", String(cardsWanted || 12)],
  ];
  if (Array.isArray(allocations) && allocations.length) {
    fields.push(["allocations", JSON.stringify(allocations)]);
  }
  return fields;
}

/**
 * Append the picked file to a FormData. Web uploads a real File built from
 * the picker's blob URL; native uses the { uri, name, type } descriptor.
 */
export async function appendFile(formData, file, { isWeb, fetchImpl, signal, FileImpl } = {}) {
  const name = file?.name ?? "document.pdf";
  const type = file?.mimeType ?? "application/pdf";
  if (isWeb) {
    let blob;
    try {
      blob = await fetchImpl(file.uri, { signal }).then((r) => r.blob());
    } catch (cause) {
      if (isAbort(cause)) throw new RequestError({ kind: "aborted", cause });
      throw new RequestError({ kind: "file", detail: String(cause?.message ?? cause), cause });
    }
    formData.append("file", new FileImpl([blob], name, { type }));
  } else {
    formData.append("file", { uri: file.uri, name, type });
  }
  return formData;
}

/**
 * POST a multipart body and return the parsed JSON, or throw RequestError.
 * The server's `detail` is kept on the error for logging; screens show a
 * human summary instead (see describeAnalyzeError / describeGenerateError).
 */
export async function postMultipart({ fetchImpl, url, formData, signal }) {
  let res;
  try {
    res = await fetchImpl(url, { method: "POST", body: formData, signal });
  } catch (cause) {
    if (isAbort(cause)) throw new RequestError({ kind: "aborted", cause });
    throw new RequestError({ kind: "network", detail: String(cause?.message ?? cause), cause });
  }

  let body = "";
  try {
    body = await res.text();
  } catch (cause) {
    if (isAbort(cause)) throw new RequestError({ kind: "aborted", cause });
    throw new RequestError({ kind: "network", status: res.status, detail: String(cause?.message ?? cause), cause });
  }

  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }

  if (!res.ok) throw httpError(res, json, body);
  if (!json || typeof json !== "object") {
    throw new RequestError({ kind: "response", status: res.status, detail: "Response was not JSON" });
  }
  return json;
}

// ── user-facing error summaries ──────────────────────────────────────────────
// Never show raw server text in the primary UI; it may contain exception
// strings. The full RequestError is logged to the console by the screen.
// Copy is chosen by the server's error `code` (backend F5); the status and
// text checks below it only matter for an older server without codes.

const UNREADABLE = /failed to open|cannot open|no objects found|not a pdf|format error|broken document|password|encrypted/i;

function unreachable(what) {
  return {
    title: "Couldn't reach the flashcard server",
    message: `${what} Check that the server is running and reachable, then try again.`,
  };
}

/** "in about 5 minutes" / "in about 2 hours" / "later", from seconds. */
export function waitPhrase(seconds) {
  if (!(Number.isFinite(seconds) && seconds > 0)) return "later";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 90) return `in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `in about ${Math.round(minutes / 60)} hours`;
}

/**
 * Copy for problems with the upload itself, shared by analyze and generate.
 * `next` is the way out, e.g. "Try another PDF." / "Go back and choose another PDF."
 */
function uploadProblem(err, next) {
  const limit = Number.isFinite(err?.limit) ? err.limit : null;
  switch (err?.code) {
    case "file_required":
      return { title: "The PDF didn't reach the server", message: "Choose the PDF again." };
    case "not_pdf":
      return { title: "This file isn't a PDF", message: `Only PDF files can be used. ${next}` };
    case "pdf_unreadable":
      return { title: "This file couldn't be read as a PDF", message: `It may be damaged. ${next}` };
    case "pdf_encrypted":
      return { title: "This PDF is password-protected", message: `Remove the password first, or use another PDF. ${next}` };
    case "no_text":
      return {
        title: "This PDF has no selectable text",
        message: `It may be a scanned image. Cards are written from a PDF's text. ${next}`,
      };
    case "too_many_pages":
      return { title: "This PDF has too many pages", message: `${limit ? `The limit is ${limit} pages. ` : ""}${next}` };
    case "file_too_large":
      return { title: "This PDF is too large", message: `${limit ? `The limit is ${limit} MB. ` : ""}${next}` };
    case "throttled":
      return {
        title: "Too many requests",
        message: `This device has sent a lot of requests. Try again ${waitPhrase(err.retryAfter)}.`,
      };
    default:
      return null;
  }
}

/** { title, message, status } for an analyze failure. */
export function describeAnalyzeError(err) {
  const status = err?.status ?? null;
  switch (err?.kind) {
    case "network":
      return { ...unreachable("The PDF wasn't analyzed."), status };
    case "file":
      return { title: "Couldn't read the selected file", message: "Choose the PDF again.", status };
    case "http": {
      const known = uploadProblem(err, "Try another PDF.");
      if (known) return { ...known, status };
      if (status === 400) return { title: "The PDF didn't reach the server", message: "Choose the PDF again.", status };
      if (status === 413) return { title: "This PDF is too large", message: "Try a smaller PDF.", status };
      if (UNREADABLE.test(err.detail || "")) {
        return {
          title: "This file couldn't be read as a PDF",
          message: "It may be damaged or password-protected. Try another PDF.",
          status,
        };
      }
      return {
        title: "The server couldn't analyze this PDF",
        message: "Try again, or choose a different PDF.",
        status,
      };
    }
    default:
      return { title: "The PDF couldn't be analyzed", message: "Try again, or choose a different PDF.", status };
  }
}

/** { title, message, status } for a generate failure. */
export function describeGenerateError(err) {
  const status = err?.status ?? null;
  switch (err?.kind) {
    case "network":
      return { ...unreachable("No deck was created."), status };
    case "file":
      return {
        title: "Couldn't read the selected file",
        message: "Go back to your plan and choose the PDF again.",
        status,
      };
    case "http": {
      switch (err.code) {
        case "generation_failed":
          return {
            title: "No cards could be written",
            message: "Nothing was saved. Try again in a moment, or go back and choose another PDF.",
            status,
          };
        case "generation_unavailable":
          return {
            title: "Deck creation isn't available",
            message: "This server isn't set up to write cards right now. Your plan is kept.",
            status,
          };
        case "generation_limit_reached":
          return {
            title: "Today's limit for new decks has been reached",
            message: `This demo makes a limited number of decks each day. Try again ${waitPhrase(err.retryAfter)}.`,
            status,
          };
        case "invalid_allocations":
          return {
            title: "The server didn't accept this plan",
            message: "Go back to your plan, adjust it and try again.",
            status,
          };
        default:
          break;
      }
      const known = uploadProblem(err, "Go back and choose another PDF.");
      if (known) return { ...known, status };
      if (/zero cards/i.test(err.detail || "")) {
        return {
          title: "No cards could be written",
          message: "The server couldn't write any cards for this plan. Try again, or adjust the plan or choose another PDF.",
          status,
        };
      }
      if (UNREADABLE.test(err.detail || "")) {
        return {
          title: "This file couldn't be read as a PDF",
          message: "It may be damaged or password-protected. Go back and choose another PDF.",
          status,
        };
      }
      return { title: "The deck couldn't be built", message: "The server reported an error. Try again.", status };
    }
    default:
      return { title: "The deck couldn't be built", message: "Something went wrong. Try again.", status };
  }
}
