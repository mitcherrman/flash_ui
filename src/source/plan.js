// src/source/plan.js
// Source → Structure → Plan state for the Upload screen (F2).
//
// Pure logic, no React / React Native imports, so `npm test` covers it.
// The screen drives it with useReducer(planReducer, initialPlanState).
//
// Semantics:
// • Analysis is authoritative. `recommendation` is a snapshot of the
//   analysis-time total and per-section allocation; it never changes until a
//   new document is analyzed.
// • The plan total always equals the sum of the section cards when the
//   document has sections (the backend generates sum(allocations)).
// • Slider (setTotal) redistributes by the backend's recommendation rule,
//   unless the user has edited sections by hand (`manual`), in which case it
//   is ignored rather than overwriting those edits.
// • Section edits set `manual` and recompute the total deterministically.
// • reset() restores the snapshot (total + allocation) and clears `manual`.

// Bounds the backend actually enforces (flashcards/views.py generate_deck:
// MAX_TOTAL = 30, MAX_PER_SECTION = 8, total clamped to ≥ 3).
export const CARD_LIMITS = Object.freeze({ min: 3, max: 30, perSection: 8 });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sum = (xs) => xs.reduce((s, x) => s + x, 0);

/** Python's round(): halves go to the even neighbour (banker's rounding). */
export function roundHalfEven(x) {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * The backend's allocation rule (flashcards/ai/analysis.py, "Per-section
 * allocation at the recommended count"), mirrored exactly for any total:
 * one card per section first, the rest by word share (Python rounding),
 * then normalised to exactly `total` round-robin from the first section.
 */
export function shareAllocation(sections, total) {
  const n = sections.length;
  if (!n) return [];
  const t = Math.max(0, Math.floor(total) || 0);
  const remaining = Math.max(0, t - n);
  const totalWords = sum(sections.map((s) => s.words || 0)) || n;
  const prelim = sections.map((s) => 1 + roundHalfEven(remaining * ((s.words || 1) / totalWords)));

  let delta = t - sum(prelim);
  let i = 0;
  while (delta !== 0) {
    const j = i % n;
    if (delta > 0) {
      prelim[j] += 1;
      delta -= 1;
    } else if (prelim[j] > 0) {
      prelim[j] -= 1;
      delta += 1;
    }
    i += 1;
  }
  return prelim;
}

/**
 * Enforce the per-section cap without changing the total: any excess is
 * moved, one card at a time, to the next sections (in document order) that
 * are still under the cap. Callers keep total ≤ cap × sections.
 */
export function capAllocation(cards, cap = CARD_LIMITS.perSection) {
  const out = cards.map((c) => Math.max(0, c));
  let excess = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i] > cap) {
      excess += out[i] - cap;
      out[i] = cap;
    }
  }
  for (let i = 0; excess > 0 && out.some((c) => c < cap); i = (i + 1) % out.length) {
    if (out[i] < cap) {
      out[i] += 1;
      excess -= 1;
    }
  }
  return out;
}

/** Highest total the plan can request (8 per section, 30 per deck). */
export function maxTotalFor(sectionCount) {
  if (!sectionCount) return CARD_LIMITS.max;
  return Math.max(CARD_LIMITS.min, Math.min(CARD_LIMITS.max, CARD_LIMITS.perSection * sectionCount));
}

/**
 * Automatic allocation for `total`. At the recommended total it is the
 * analysis snapshot itself; elsewhere the backend rule, capped at 8.
 */
export function allocate(sections, total, recommendation) {
  if (recommendation && total === recommendation.total && recommendation.cards.length === sections.length) {
    return recommendation.cards.slice();
  }
  return capAllocation(shareAllocation(sections, total));
}

// ── page provenance ──────────────────────────────────────────────────────────
const isPage = (p) => Number.isInteger(p) && p >= 1;

/**
 * Human page label that never invents precision:
 *   1–4 → "Pages 1–4", 5–5 → "Page 5", page_source "estimated" → "About …",
 *   missing/null start → "Page unknown".
 */
export function formatPageRange(section) {
  const start = section?.page_start;
  const end = section?.page_end;
  if (!isPage(start)) return "Page unknown";
  const single = !isPage(end) || end <= start;
  const range = single ? `Page ${start}` : `Pages ${start}–${end}`;
  return section?.page_source === "estimated" ? `About ${range.toLowerCase()}` : range;
}

// ── small formatters ─────────────────────────────────────────────────────────
/** "1,234" without relying on Intl (Hermes/web parity). */
export function formatCount(n) {
  const v = Math.round(Number(n) || 0);
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "820 KB", "1.4 MB"; null when the picker gave no size. */
export function formatFileSize(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return null;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The picker is restricted to application/pdf; this catches files that slip
 * through (e.g. "All files" in a web dialog) before any upload.
 */
export function isPdfFile(file) {
  const mime = String(file?.mimeType || "").toLowerCase();
  if (mime === "application/pdf") return true;
  return /\.pdf$/i.test(String(file?.name || "")) && (!mime || mime === "application/octet-stream");
}

// ── state ────────────────────────────────────────────────────────────────────
export const initialPlanState = Object.freeze({
  status: "idle", // idle | analyzing | ready | error
  file: null,
  requestId: 0, // id of the analysis whose result we will accept
  stats: null,
  error: null,
  recommendation: null, // { total, range: { lo, hi }, cards: number[] }
  total: null,
  sections: [], // [{ title, page_start, page_end, page_source?, words, cards }]
  manual: false,
});

function sectionsFromStats(stats) {
  const raw = Array.isArray(stats?.per_section_allocation) ? stats.per_section_allocation : [];
  return raw.map((s) => {
    const sec = {
      title: String(s.title ?? ""),
      // Real analysis ranges, passed through untouched (null stays null).
      page_start: s.page_start ?? null,
      page_end: s.page_end ?? null,
      words: Number(s.words) || 0,
      cards: Math.max(0, Math.floor(Number(s.cards) || 0)),
    };
    if (s.page_source != null) sec.page_source = s.page_source;
    return sec;
  });
}

function recommendationFromStats(stats, sections) {
  const maxTotal = maxTotalFor(sections.length);
  const rec = Number(stats?.recommended_cards);
  const fromCards = sum(sections.map((s) => s.cards));
  const base = Number.isFinite(rec) && rec > 0 ? rec : sections.length ? fromCards : 12;
  const total = clamp(Math.round(base), CARD_LIMITS.min, maxTotal);

  // The backend's allocation sums to the recommendation; keep it verbatim
  // when it is coherent, otherwise derive it with the same rule.
  const given = sections.map((s) => s.cards);
  const coherent =
    sections.length > 0 && sum(given) === total && given.every((c) => c <= CARD_LIMITS.perSection);
  const cards = sections.length ? (coherent ? given : allocate(sections, total, null)) : [];

  const lo = Number(stats?.suggested_range?.lo);
  const hi = Number(stats?.suggested_range?.hi);
  const range = Number.isFinite(lo) && Number.isFinite(hi) ? { lo, hi } : null;
  return { total, range, cards };
}

function sameCards(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function withCards(sections, cards) {
  return sections.map((s, i) => ({ ...s, cards: cards[i] ?? 0 }));
}

export function planReducer(state, action) {
  switch (action.type) {
    case "pick":
      // A new document: everything about the previous one is discarded.
      return {
        ...initialPlanState,
        status: "analyzing",
        file: action.file,
        requestId: action.requestId,
      };

    case "retry":
      if (!state.file) return state;
      return {
        ...initialPlanState,
        status: "analyzing",
        file: state.file,
        requestId: action.requestId,
      };

    case "analyzed": {
      if (action.requestId !== state.requestId || state.status !== "analyzing") return state;
      const stats = action.stats || {};
      const parsed = sectionsFromStats(stats);
      const recommendation = recommendationFromStats(stats, parsed);
      return {
        ...state,
        status: "ready",
        stats,
        error: null,
        recommendation,
        total: recommendation.total,
        sections: withCards(parsed, recommendation.cards),
        manual: false,
      };
    }

    case "analyzeFailed":
      if (action.requestId !== state.requestId || state.status !== "analyzing") return state;
      return { ...state, status: "error", error: action.error ?? null };

    case "setTotal": {
      if (state.status !== "ready" || state.manual) return state;
      const total = clamp(Math.round(Number(action.total) || 0), CARD_LIMITS.min, maxTotalFor(state.sections.length));
      if (total === state.total) return state;
      if (!state.sections.length) return { ...state, total };
      const cards = allocate(state.sections, total, state.recommendation);
      return { ...state, total, sections: withCards(state.sections, cards) };
    }

    case "setSectionCards":
    case "bumpSection": {
      if (state.status !== "ready") return state;
      const i = action.index;
      if (!(i >= 0 && i < state.sections.length)) return state;
      const current = state.sections[i].cards;
      const raw =
        action.type === "bumpSection"
          ? current + (Number(action.delta) || 0)
          : parseInt(String(action.value ?? "").replace(/[^\d]/g, "") || "0", 10);
      const others = state.total - current;
      const next = clamp(raw, 0, Math.min(CARD_LIMITS.perSection, CARD_LIMITS.max - others));
      if (next === current) return state;
      const sections = state.sections.map((s, j) => (j === i ? { ...s, cards: next } : s));
      const cards = sections.map((s) => s.cards);
      return {
        ...state,
        sections,
        total: sum(cards),
        // Matching the recommendation exactly means nothing manual is left.
        manual: !(state.recommendation && sameCards(cards, state.recommendation.cards)),
      };
    }

    case "reset": {
      if (state.status !== "ready" || !state.recommendation) return state;
      const { total, cards } = state.recommendation;
      return {
        ...state,
        total,
        sections: state.sections.length ? withCards(state.sections, cards) : state.sections,
        manual: false,
      };
    }

    case "clear":
      return { ...initialPlanState, requestId: action.requestId ?? state.requestId + 1 };

    default:
      return state;
  }
}

// ── selectors ────────────────────────────────────────────────────────────────
/** True when the total or any section differs from the analysis snapshot. */
export function isChangedFromRecommendation(state) {
  const rec = state.recommendation;
  if (state.status !== "ready" || !rec) return false;
  if (state.total !== rec.total) return true;
  return !sameCards(state.sections.map((s) => s.cards), rec.cards);
}

export function planLimits(state) {
  return { min: CARD_LIMITS.min, max: maxTotalFor(state.sections.length), perSection: CARD_LIMITS.perSection };
}

export function planSummary(state) {
  const n = state.sections.length;
  const withCardsCount = state.sections.filter((s) => s.cards > 0).length;
  return { total: state.total, sectionCount: n, sectionsWithCards: withCardsCount, sectionsWithout: n - withCardsCount };
}

/** { ok, reason } — whether "Create cards" may be pressed. */
export function validatePlan(state) {
  if (state.status === "analyzing") return { ok: false, reason: "Waiting for the analysis to finish." };
  if (state.status === "error") return { ok: false, reason: "Analyze the PDF before creating cards." };
  if (state.status !== "ready") return { ok: false, reason: "Choose a PDF to start." };
  if (state.total < CARD_LIMITS.min) {
    return { ok: false, reason: `Plan at least ${CARD_LIMITS.min} cards in total (currently ${state.total}).` };
  }
  return { ok: true, reason: null };
}

/**
 * Build-screen params. Same shape the generate request has always used:
 * cardsWanted (3–30) and allocations [{ title, page_start, page_end, cards }]
 * (empty when the PDF has no outline).
 */
export function buildParams(state) {
  return {
    cardsWanted: clamp(state.total ?? 12, CARD_LIMITS.min, CARD_LIMITS.max),
    allocations: state.sections.map((s) => ({
      title: s.title,
      page_start: s.page_start,
      page_end: s.page_end,
      cards: clamp(s.cards, 0, CARD_LIMITS.perSection),
    })),
  };
}
