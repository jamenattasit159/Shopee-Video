/**
 * Turns caption text segments into word-timed "pages" for TikTok-style captions.
 * Thai has no spaces between words, so words come from Intl.Segmenter.
 * Word timing is spread across the segment window, weighted by word length.
 */

export interface CaptionSegmentInput {
  th: string;
  en?: string;
  from: number; // absolute start frame
  durationFrames: number; // frames available for this segment's speech
}

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface CaptionPage {
  words: CaptionWord[];
  start: number;
  end: number;
  en?: string;
  segmentStart: number;
  segmentEnd: number;
}

const LEAD_FRAMES = 3;
const TAIL_FRAMES = 6;
const SENTENCE_END = /[!?！？.。…]$/;

const segmentWords = (text: string): string[] => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const Segmenter = (Intl as any).Segmenter;
  if (!Segmenter) return clean.split(" ").map((w, i, a) => (i < a.length - 1 ? `${w} ` : w));

  const tokens: string[] = [];
  for (const { segment, isWordLike } of new Segmenter("th", { granularity: "word" }).segment(clean)) {
    const prev = tokens[tokens.length - 1];
    // Spaces, punctuation, stray marks (ๆ, ฯ) and number parts (฿259, 50%, 24/7) stick to the previous word
    const joinsNumber = prev !== undefined && /[฿$\d.,/]$/.test(prev) && /^[\d%.,/]/.test(segment);
    if (tokens.length > 0 && (!isWordLike || /^[ๆฯ]$/.test(segment) || joinsNumber)) {
      tokens[tokens.length - 1] += segment;
    } else {
      tokens.push(segment);
    }
  }
  return tokens;
};

export const buildCaptionPages = (
  segments: CaptionSegmentInput[],
  maxCharsPerPage: number
): CaptionPage[] => {
  const pages: CaptionPage[] = [];

  for (const seg of segments) {
    const words = segmentWords(seg.th);
    if (words.length === 0 || seg.durationFrames <= 0) continue;

    const segmentEnd = seg.from + seg.durationFrames;
    const windowStart = seg.from + LEAD_FRAMES;
    const windowFrames = Math.max(words.length, seg.durationFrames - LEAD_FRAMES - TAIL_FRAMES);
    const weights = words.map((w) => Math.max(2, w.trim().length));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let cursor = windowStart;
    const timed: CaptionWord[] = words.map((text, i) => {
      const len = (weights[i] / totalWeight) * windowFrames;
      const word = { text, start: Math.round(cursor), end: Math.round(cursor + len) };
      cursor += len;
      return word;
    });

    // Group words into short pages so captions never exceed ~2 short lines
    let current: CaptionWord[] = [];
    let chars = 0;
    const flush = () => {
      if (current.length === 0) return;
      pages.push({
        words: current,
        start: current[0].start,
        end: current[current.length - 1].end,
        en: seg.en,
        segmentStart: seg.from,
        segmentEnd,
      });
      current = [];
      chars = 0;
    };

    timed.forEach((w) => {
      const len = w.text.trim().length;
      if (chars > 0 && chars + len > maxCharsPerPage) flush();
      current.push(w);
      chars += len;
      if (SENTENCE_END.test(w.text.trim())) flush();
    });
    flush();
  }

  // Each page stays until the next one starts (or its segment ends)
  return pages.map((p, i) => {
    const next = pages[i + 1];
    const end = next && next.segmentStart === p.segmentStart ? next.start : p.segmentEnd;
    return { ...p, end };
  });
};
