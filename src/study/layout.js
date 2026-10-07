// src/study/layout.js
// Study-screen composition per layout class (F4). Pure: no React / React
// Native imports, so every viewport in the verification matrix is unit-tested.
//
// The class comes from getLayoutClass (src/theme/breakpoints.js): window
// geometry only. This module turns it into concrete decisions:
//
//   phone    one column; card + source scroll; Previous/Next pinned in a
//            footer above the template bar.
//   tablet   the same, in a centred column (no cliff into desktop chrome).
//   short    side by side: the card (or question) on the left, controls and
//            source on the right with Previous/Next pinned at the bottom of
//            that column. No bottom template bar (it is a header button), so
//            nothing covers the card.
//   desktop  two columns: card/question beside its source context, centred
//            vertically, with width caps so lines never get too long.
//
// Long content never shrinks below the readable sizes in STUDY_TEXT and is
// never truncated: a card grows to fit its text and its column scrolls.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const CARD_ASPECT = 0.6;
export const CARD_MAX_W = 720; // ~60–70 characters per line at the card sizes
export const COL_GAP = { short: 16, desktop: 32 };
export const GUTTER = { phone: 16, short: 16, tablet: 24, desktop: 32 };

// Vertical chrome around the card text: the face label (16px margin + 16px
// line), the hint (20px line + 12px margin), 12px breathing room above and
// below the text, and the 6px index-card rule. Matches FlipDrill.styles.
export const FACE_CHROME = 16 + 16 + 20 + 12 + 24 + 6;

// Header heights (the 44px buttons plus padding) used to estimate the body.
const HEADER_H = { phone: 72, tablet: 72, short: 60, desktop: 80 };

// Readable sizes per class. Short landscape steps down one notch; nothing
// goes below 16px for study text.
export const STUDY_TEXT = {
  phone: { front: [24, 32], back: [21, 29], question: [21, 29], option: [16, 22] },
  tablet: { front: [26, 34], back: [22, 30], question: [22, 30], option: [16, 24] },
  short: { front: [21, 28], back: [19, 26], question: [18, 25], option: [16, 21] },
  desktop: { front: [26, 34], back: [22, 30], question: [24, 32], option: [17, 24] },
};

export function studyText(layoutClass) {
  const t = STUDY_TEXT[layoutClass] ?? STUDY_TEXT.phone;
  const style = ([fontSize, lineHeight]) => ({ fontSize, lineHeight });
  return { front: style(t.front), back: style(t.back), question: style(t.question), option: style(t.option) };
}

function frame({ width, height, insets = {}, layoutClass }) {
  const gutter = GUTTER[layoutClass] ?? GUTTER.phone;
  const availW = Math.max(0, (width || 0) - (insets.left || 0) - (insets.right || 0) - 2 * gutter);
  const availH = Math.max(0, (height || 0) - (insets.top || 0) - (insets.bottom || 0));
  return { gutter, availW, availH };
}

/**
 * Flip Drill geometry.
 * Returns { layoutClass, columns, gutter, cardW, baseCardH, sideW, rowW,
 *           navPlacement: "footer" | "side" | "underCard",
 *           templatePlacement: "bar" | "header", showKeyHint }
 */
export function flipDrillLayout({ layoutClass = "phone", width, height, insets = {} }) {
  const { gutter, availW, availH } = frame({ width, height, insets, layoutClass });
  const bodyH = availH - (HEADER_H[layoutClass] ?? HEADER_H.phone);

  if (layoutClass === "short") {
    const sideW = clamp(Math.round(availW * 0.38), 220, 340);
    const cardW = Math.max(200, Math.min(CARD_MAX_W, availW - sideW - COL_GAP.short));
    return {
      layoutClass,
      columns: 2,
      gutter,
      cardW,
      sideW,
      rowW: cardW + COL_GAP.short + sideW,
      // The card fills the column height; FlipDrill refines this from the
      // measured body so it lines up exactly.
      baseCardH: Math.max(160, bodyH - 8),
      navPlacement: "side",
      templatePlacement: "header",
      showKeyHint: false,
    };
  }

  if (layoutClass === "desktop") {
    const sideW = clamp(Math.round(availW * 0.3), 300, 400);
    const cardW = Math.max(320, Math.min(CARD_MAX_W, availW - sideW - COL_GAP.desktop));
    // Card + Previous/Next (44 + 16) + key hint (20 + 8) + body padding (48)
    const roomForCard = bodyH - 60 - 28 - 48;
    return {
      layoutClass,
      columns: 2,
      gutter,
      cardW,
      sideW,
      rowW: cardW + COL_GAP.desktop + sideW,
      baseCardH: clamp(Math.round(cardW * CARD_ASPECT), 220, Math.max(220, roomForCard)),
      navPlacement: "underCard",
      templatePlacement: "header",
      showKeyHint: true,
    };
  }

  // phone / tablet: one column
  const isTablet = layoutClass === "tablet";
  const cardW = Math.max(200, Math.min(isTablet ? 640 : CARD_MAX_W, availW));
  // Portrait phones have height to spare: a slightly taller index card,
  // capped so the source panel still shows below it.
  const aspect = isTablet ? CARD_ASPECT : 0.72;
  const baseCardH = clamp(Math.round(cardW * aspect), 180, Math.max(180, Math.round(availH * 0.42)));
  return {
    layoutClass,
    columns: 1,
    gutter,
    cardW,
    sideW: cardW,
    rowW: cardW,
    baseCardH,
    navPlacement: "footer",
    templatePlacement: "bar",
    showKeyHint: false,
  };
}

/**
 * Card height that fits its text: never below the layout's base height, and
 * never clipped. `contentH` is the measured height of the tallest face text
 * (0 before measurement).
 */
export function flipCardHeight(baseCardH, contentH = 0) {
  const needed = Math.ceil((Number(contentH) || 0) + FACE_CHROME);
  return Math.max(Math.round(baseCardH) || 0, contentH > 0 ? needed : 0);
}

/**
 * Multiple Choice geometry.
 * Returns { layoutClass, columns, gutter, leftW, rightW, rowW,
 *           navPlacement: "footer" | "side", showKeyHint, optionMinH }
 */
export function mcLayout({ layoutClass = "phone", width, height, insets = {} }) {
  const { gutter, availW } = frame({ width, height, insets, layoutClass });

  if (layoutClass === "short" || layoutClass === "desktop") {
    const gap = COL_GAP[layoutClass];
    const short = layoutClass === "short";
    const leftW = short
      ? clamp(Math.round(availW * 0.42), 220, 420)
      : clamp(Math.round(availW * 0.45), 360, 520);
    const rightW = Math.max(240, Math.min(short ? 520 : 560, availW - leftW - gap));
    return {
      layoutClass,
      columns: 2,
      gutter,
      leftW,
      rightW,
      rowW: leftW + gap + rightW,
      navPlacement: "side",
      showKeyHint: !short,
      optionMinH: short ? 44 : 56,
    };
  }

  const colW = Math.min(layoutClass === "tablet" ? 640 : CARD_MAX_W, availW);
  return {
    layoutClass,
    columns: 1,
    gutter,
    leftW: colW,
    rightW: colW,
    rowW: colW,
    navPlacement: "footer",
    showKeyHint: false,
    optionMinH: 52,
  };
}

// ——— Swipe ———

export const SWIPE_ACTIVATE_PX = 20;

/** Distance that commits a swipe: about a fifth of the card, 64–120px. */
export function swipeThreshold(cardW) {
  return clamp(Math.round((Number(cardW) || 0) * 0.2), 64, 120);
}

/** A drag becomes a swipe only when it is clearly horizontal (not a scroll). */
export function isHorizontalSwipe(dx, dy) {
  const ax = Math.abs(dx || 0);
  return ax > SWIPE_ACTIVATE_PX && ax > Math.abs(dy || 0) * 1.2;
}

/** Released drag → "next" (left), "prev" (right) or null (spring back). */
export function swipeDirection(dx, threshold) {
  if (dx <= -threshold) return "next";
  if (dx >= threshold) return "prev";
  return null;
}
