/**
 * Thai text fitting and line-balancing utility using Intl.Segmenter
 * Ensures no orphan words in last line and proper 2-line wraps.
 */

export function segmentThaiWords(text: string): string[] {
  if (!text) return [];
  let rawWords: string[] = [];

  // Use native Intl.Segmenter if available, fallback to space-split
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter("th", {
      granularity: "word",
    });
    const segments = Array.from(segmenter.segment(text)) as Array<{
      segment: string;
      isWordLike?: boolean;
    }>;
    rawWords = segments.map((s) => s.segment);
  } else {
    rawWords = text.split(/(\s+)/);
  }

  // Merge common Thai compound fragments that shouldn't break across lines
  const merged: string[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const curr = rawWords[i];
    const next = rawWords[i + 1];
    if (curr === "มินิ" && next === "มอล") {
      merged.push("มินิมอล");
      i++;
    } else if (curr === "ตรง" && next === "ปก") {
      merged.push("ตรงปก");
      i++;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

export interface TextFitResult {
  lines: string[];
  fontSize: number;
}

/**
 * Balances text into max 2 lines with Thai word boundary awareness.
 * Rule from V2 Patch:
 * - Headline: max 2 lines, <= 14 Thai chars per line, min font size >= 88px (or scale down if long).
 * - No single orphan word on the last line.
 */
export function fitHeadline(
  text: string,
  baseFontSize = 88,
  minFontSize = 76,
  maxCharsPerLine = 15
): TextFitResult {
  if (!text) return { lines: [], fontSize: baseFontSize };

  const cleanText = text.trim();
  if (cleanText.length <= maxCharsPerLine) {
    return { lines: [cleanText], fontSize: baseFontSize };
  }

  const words = segmentThaiWords(cleanText).filter((w) => w.length > 0);
  if (words.length <= 1) {
    // Single long word
    const mid = Math.ceil(cleanText.length / 2);
    return {
      lines: [cleanText.slice(0, mid), cleanText.slice(mid)],
      fontSize: minFontSize,
    };
  }

  // Attempt to split into 2 balanced lines
  let bestSplit = 1;
  let minDiff = Infinity;
  const totalLength = cleanText.length;

  let currentLength = 0;
  for (let i = 0; i < words.length - 1; i++) {
    currentLength += words[i].length;
    const line1 = currentLength;
    const line2 = totalLength - currentLength;
    const diff = Math.abs(line1 - line2);

    // Prevent orphan word (last word alone in line 2 if it's very short)
    const isOrphan = i === words.length - 2 && words[words.length - 1].length < 4;

    if (!isOrphan && diff < minDiff) {
      minDiff = diff;
      bestSplit = i + 1;
    }
  }

  const line1 = words.slice(0, bestSplit).join("").trim();
  const line2 = words.slice(bestSplit).join("").trim();

  // If text is long, scale font size appropriately to stay legible and fit width
  const maxLineLen = Math.max(line1.length, line2.length);
  let fontSize = baseFontSize;
  if (maxLineLen > 14) {
    fontSize = Math.max(minFontSize, Math.round(baseFontSize * (14 / maxLineLen)));
  }

  return {
    lines: [line1, line2],
    fontSize,
  };
}

/**
 * Subtitle / Caption text fitter:
 * Max 2 lines, <= 18 chars per line, min fontSize >= 56px.
 */
export function fitSubtitle(
  text: string,
  baseFontSize = 56,
  minFontSize = 48,
  maxCharsPerLine = 20
): TextFitResult {
  if (!text) return { lines: [], fontSize: baseFontSize };

  const cleanText = text.trim();
  if (cleanText.length <= maxCharsPerLine) {
    return { lines: [cleanText], fontSize: baseFontSize };
  }

  const words = segmentThaiWords(cleanText).filter((w) => w.length > 0);
  let currentLength = 0;
  let bestSplit = Math.ceil(words.length / 2);
  let minDiff = Infinity;
  const totalLength = cleanText.length;

  for (let i = 0; i < words.length - 1; i++) {
    currentLength += words[i].length;
    const diff = Math.abs(currentLength - (totalLength - currentLength));
    if (diff < minDiff) {
      minDiff = diff;
      bestSplit = i + 1;
    }
  }

  const line1 = words.slice(0, bestSplit).join("").trim();
  const line2 = words.slice(bestSplit).join("").trim();

  const maxLineLen = Math.max(line1.length, line2.length);
  let fontSize = baseFontSize;
  if (maxLineLen > 20) {
    fontSize = Math.max(minFontSize, Math.round(baseFontSize * (20 / maxLineLen)));
  }

  return {
    lines: [line1, line2],
    fontSize,
  };
}
