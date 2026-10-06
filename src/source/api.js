// src/source/api.js
// Request helpers for the source/build workflow (F2). Pure: `fetch` and
// FormData are supplied by the caller, so `npm test` can drive them.
//
// Contract (unchanged from F0 §7; the backend is authoritative):
//   POST /api/flashcards/analyze/   multipart: file
//   POST /api/flashcards/generate/  multipart: file, deck_name, cards_wanted,
//                                   allocations (JSON, only when non-empty)

export const ANALYZE_PATH = "/api/flashcards/analyze/";
export const GENERATE_PATH = "/api/flashcards/generate/";

/** Thrown for every failed request. kind: network | http | aborted | file | response */
export class RequestError extends Error {
  constructor({ kind, status = null, detail = "", cause } = {}) {
    super(
      kind === "http"
        ? `HTTP ${status}${detail ? ` – ${detail}` : ""}`
        : `${kind} error${detail ? `: ${detail}` : ""}`
    );
    this.name = "RequestError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    if (cause) this.cause = cause;
  }
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

  if (!res.ok) {
    const detail = typeof json?.detail === "string" ? json.detail : json ? JSON.stringify(json) : body;
    throw new RequestError({ kind: "http", status: res.status, detail: String(detail || "").slice(0, 400) });
  }
  if (!json || typeof json !== "object") {
    throw new RequestError({ kind: "response", status: res.status, detail: "Response was not JSON" });
  }
  return json;
}

// ── user-facing error summaries ──────────────────────────────────────────────
// Never show raw server text in the primary UI; it may contain exception
// strings. The full RequestError is logged to the console by the screen.

const UNREADABLE = /failed to open|cannot open|no objects found|not a pdf|format error|broken document|password|encrypted/i;

function unreachable(what) {
  return {
    title: "Couldn't reach the flashcard server",
    message: `${what} Check that the server is running and reachable, then try again.`,
  };
}

/** { title, message, status } for an analyze failure. */
export function describeAnalyzeError(err) {
  const status = err?.status ?? null;
  switch (err?.kind) {
    case "network":
      return { ...unreachable("The PDF wasn't analyzed."), status };
    case "file":
      return { title: "Couldn't read the selected file", message: "Choose the PDF again.", status };
    case "http":
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
    case "http":
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
    default:
      return { title: "The deck couldn't be built", message: "Something went wrong. Try again.", status };
  }
}
