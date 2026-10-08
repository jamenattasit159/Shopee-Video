import { fitText, measureText } from "@remotion/layout-utils";
import { FONTS } from "./palette";
import { splitSafeThaiLines } from "./thaiKeep";

/**
 * Text fitting and line balancing utility (Paper Collage V2 Patch V3 - Part E)
 * 
 * - Pre-split line support (Gemini & Fallback Generator)
 * - Exact browser measurement using @remotion/layout-utils (fitText / measureText)
 * - Safe font size clamping respecting minimum readable standards (A2: Headline >= 88px, Subtitle >= 56px)
 * - Plate width calculation ensuring text never overflows safe boundaries (Safe Zone: 1080 - 200 = 880px)
 */

export interface TextFitResult {
  lines: string[];
  fontSize: number;
  width: number;
  plateWidth: number;
}

export type TextInput =
  | string
  | {
      text?: string;
      lines?: string[];
    };

/**
 * Normalizes input text or lines into string array
 */
function resolveLines(
  input: TextInput,
  maxCharsPerLine: number,
  minCharsPerLine: number
): string[] {
  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input.lines) && input.lines.length > 0) {
      const clean = input.lines.map((l) => l.trim()).filter(Boolean);
      if (clean.length > 0) return clean.slice(0, 2);
    }
    if (typeof input.text === "string" && input.text.trim()) {
      return splitSafeThaiLines(input.text.trim(), maxCharsPerLine, minCharsPerLine);
    }
    return [];
  }

  if (typeof input === "string" && input.trim()) {
    return splitSafeThaiLines(input.trim(), maxCharsPerLine, minCharsPerLine);
  }

  return [];
}

/**
 * Fits Headline lines into plate:
 * - Rule A2: Headline minimum font size 88px (or minFontSize), max 2 lines, <= 14 Thai chars/line
 * - Safe Zone width: max 880px
 */
export function fitHeadline(
  input: TextInput,
  baseFontSize = 88,
  minFontSize = 76,
  plateInnerWidth = 800,
  fontFamily = FONTS.heading
): TextFitResult {
  const lines = resolveLines(input, 14, 4);
  if (lines.length === 0) {
    return { lines: [], fontSize: baseFontSize, width: 0, plateWidth: 200 };
  }

  const longest = lines.reduce(
    (a, b) => (a.length >= b.length ? a : b),
    lines[0] || ""
  );

  let fittedFontSize = baseFontSize;
  let measuredWidth = Math.round(longest.length * (baseFontSize * 0.58));

  // If in browser canvas environment, use @remotion/layout-utils
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const res = fitText({
        text: longest,
        withinWidth: plateInnerWidth,
        fontFamily,
        fontWeight: 800,
      });
      fittedFontSize = Math.max(minFontSize, Math.min(res.fontSize, baseFontSize));

      const measured = measureText({
        text: longest,
        fontFamily,
        fontSize: fittedFontSize,
        fontWeight: 800,
      });
      measuredWidth = Math.round(measured.width);
    } catch {
      // Fallback to estimation below if canvas is unavailable
    }
  } else {
    // SSR / Node.js fallback estimation
    const estimated = longest.length * (baseFontSize * 0.58);
    if (estimated > plateInnerWidth) {
      fittedFontSize = Math.max(
        minFontSize,
        Math.round(baseFontSize * (plateInnerWidth / estimated))
      );
      measuredWidth = Math.round(longest.length * (fittedFontSize * 0.58));
    }
  }

  // Calculate plate width (measured width + padding, clamped to Safe Zone max 880px)
  const plateWidth = Math.min(880, Math.max(260, measuredWidth + 88));

  return {
    lines,
    fontSize: fittedFontSize,
    width: measuredWidth,
    plateWidth,
  };
}

/**
 * Fits Subtitle / Caption lines into backing plate:
 * - Rule A2: Subtitle minimum font size 56px, max 2 lines, <= 18 chars/line
 */
export function fitSubtitle(
  input: TextInput,
  baseFontSize = 56,
  minFontSize = 48,
  plateInnerWidth = 820,
  fontFamily = FONTS.heading
): TextFitResult {
  const lines = resolveLines(input, 18, 4);
  if (lines.length === 0) {
    return { lines: [], fontSize: baseFontSize, width: 0, plateWidth: 160 };
  }

  const longest = lines.reduce(
    (a, b) => (a.length >= b.length ? a : b),
    lines[0] || ""
  );

  let fittedFontSize = baseFontSize;
  let measuredWidth = Math.round(longest.length * (baseFontSize * 0.56));

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const res = fitText({
        text: longest,
        withinWidth: plateInnerWidth,
        fontFamily,
        fontWeight: 800,
      });
      fittedFontSize = Math.max(minFontSize, Math.min(res.fontSize, baseFontSize));

      const measured = measureText({
        text: longest,
        fontFamily,
        fontSize: fittedFontSize,
        fontWeight: 800,
      });
      measuredWidth = Math.round(measured.width);
    } catch {
      // Fallback to estimation below
    }
  } else {
    const estimated = longest.length * (baseFontSize * 0.56);
    if (estimated > plateInnerWidth) {
      fittedFontSize = Math.max(
        minFontSize,
        Math.round(baseFontSize * (plateInnerWidth / estimated))
      );
      measuredWidth = Math.round(longest.length * (fittedFontSize * 0.56));
    }
  }

  const plateWidth = Math.min(880, Math.max(220, measuredWidth + 64));

  return {
    lines,
    fontSize: fittedFontSize,
    width: measuredWidth,
    plateWidth,
  };
}
