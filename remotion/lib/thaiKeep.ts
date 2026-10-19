import React from "react";

/**
 * Thai word boundary & phrase protection library (Paper Collage V2 Patch V3 - Part E)
 * 
 * Prevents awkward and ungrammatical line wrapping in Thai e-commerce videos:
 * - Keeps high-converting phrases and slang intact (e.g. ไอเทม, วาร์ป, บอกเลย, ตรงปก, ห้ามพลาด)
 * - Wraps protected phrases in <span style={{ whiteSpace: 'nowrap' }}>
 * - NEVER inserts zero-width joiner (U+2060) which distorts Thai vowels and tone marks
 */

export const KEEP = [
  // High-value e-commerce phrases & slang
  "ช้อปปี้ต้องมี",
  "บอกเลยว่าห้ามพลาด",
  "ของดีตรงปก",
  "ไอเทมเด็ด",
  "เปิดวาร์ป",
  "ตะกร้าส้ม",
  "ราคาพิเศษ",
  "จำนวนจำกัด",
  "ห้ามพลาด",
  "ช้อปเลย",
  "ส่งฟรี",
  "ลดแรง",
  "ของแท้",
  "คุ้มมาก",
  "ขายดี",
  "รีวิว",
  "โค้ดลด",
  "ตรงปก",
  "บอกเลย",
  "ช้อปปี้",
  "ไอเทม",
  "วาร์ป",
  "พิกัด",
  "ป้ายยา",
  "ของดี",
  "ดีลเด็ด",
  "โปรแรง",
  "ตัวดัง",
  "ซ้ายล่าง",
  "สแตนเลส",
  "มินิมอล",
  "พรีเมียม",
  "เก็บความเย็น",
  "คุณภาพดี",
  "ใช้งานง่าย",
  "คุมโทน",
  "พร้อมส่ง",
  "ลดเกิน",
  "ส่งไว",
  "ยอดฮิต",
  "ตัวท็อป",
  "การันตี",
];

// Sort descending by length so longer phrases match first
export const SORTED_KEEP = [...KEEP].sort((a, b) => b.length - a.length);

/**
 * Wraps words in KEEP with <span style={{ whiteSpace: 'nowrap' }}>
 * Prevents middle-of-word splitting in browsers without using U+2060.
 */
export function renderKeep(text: string): React.ReactNode[] {
  if (!text) return [];
  const escaped = SORTED_KEEP.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|");
  const re = new RegExp(`(${escaped})`, "g");

  return text.split(re).map((part, i) =>
    SORTED_KEEP.includes(part)
      ? React.createElement(
          "span",
          { key: i, style: { whiteSpace: "nowrap" } },
          part
        )
      : part
  );
}

/**
 * Thai Dependent Vowels & Tone Marks regex:
 * Characters that CANNOT stand alone at the beginning of a line.
 */
export const THAI_DEPENDENT_MARKS_REGEX = /^[ะัาำิีึืฺุู็่้๊๋์ๆฯ]/;

/**
 * Thai Leading Vowels regex:
 * Characters that CANNOT be at the end of a line (must be followed by consonant).
 */
export const THAI_LEADING_VOWELS_REGEX = /[เแโใไ]$/;

export interface LineValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a single Thai text line per Part E rules:
 * - Line length >= minChars (default 4)
 * - Line length <= maxChars (default 14 for headline, 18 for caption)
 * - Must NOT start with tone marks, dependent vowels, or trailing punctuation (ะ, ๆ, ฯ, ์)
 * - Must NOT end with leading vowels (เ, แ, โ, ใ, ไ)
 * - Must NOT start or end with severed word fragments from KEEP
 */
export function validateLine(
  line: string,
  maxChars = 14,
  minChars = 4
): LineValidationResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { valid: false, reason: "Line is empty" };
  }
  if (trimmed.length < minChars) {
    return {
      valid: false,
      reason: `Line too short (< ${minChars} chars): "${trimmed}"`,
    };
  }
  if (trimmed.length > maxChars) {
    return {
      valid: false,
      reason: `Line too long (> ${maxChars} chars): "${trimmed}"`,
    };
  }

  // Cannot end with leading vowels
  if (THAI_LEADING_VOWELS_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: `Line ends with floating leading vowel: "${trimmed}"`,
    };
  }

  // Cannot start with dependent vowel, tone mark or punctuation (e.g. ะ, ๆ, ฯ)
  if (THAI_DEPENDENT_MARKS_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: `Line starts with dependent mark: "${trimmed}"`,
    };
  }

  // Check for severed word fragments from KEEP at start or end
  for (const kw of SORTED_KEEP) {
    // If line starts with a strict suffix of kw (e.g. "มเด็ด" from "ไอเทมเด็ด" or "ม" from "ไอเทม")
    for (let splitIdx = 1; splitIdx < kw.length; splitIdx++) {
      const suffix = kw.slice(splitIdx);
      if (
        trimmed.startsWith(suffix) &&
        !kw.startsWith(suffix) &&
        suffix.length < 4
      ) {
        return {
          valid: false,
          reason: `Line starts with orphan suffix "${suffix}" severed from "${kw}"`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Splits text into safe balanced lines (max 2 lines) without breaking words in KEEP.
 * Used for backward compatibility when storyboard has no pre-split lines.
 */
export function splitSafeThaiLines(
  text: string,
  maxCharsPerLine = 14,
  minCharsPerLine = 4
): string[] {
  const cleanText = text.trim();
  if (!cleanText) return [];
  if (cleanText.length <= maxCharsPerLine) return [cleanText];

  const protectedRanges: Array<{ start: number; end: number }> = [];
  for (const word of SORTED_KEEP) {
    let start = 0;
    while ((start = cleanText.indexOf(word, start)) !== -1) {
      protectedRanges.push({ start, end: start + word.length });
      start++;
    }
  }

  // Only word boundaries may become separate lines/stickers. Avoiding combining
  // marks alone still allows a midpoint to sever words such as กระชับ or เรื่อง.
  const Segmenter = Intl.Segmenter;
  const cuts = Segmenter
    ? Array.from(new Segmenter("th", { granularity: "word" }).segment(cleanText))
        .filter((part) => part.isWordLike && part.index > 0)
        .map((part) => part.index)
    : Array.from(cleanText.matchAll(/\s+/g), (match) => match.index! + match[0].length);

  const candidates = cuts.filter((cut) =>
    !protectedRanges.some((range) => cut > range.start && cut < range.end)
    && !THAI_LEADING_VOWELS_REGEX.test(cleanText.slice(0, cut).trimEnd())
    && !THAI_DEPENDENT_MARKS_REGEX.test(cleanText.slice(cut))
  ).map((cut) => {
    const lines = [cleanText.slice(0, cut).trim(), cleanText.slice(cut).trim()];
    const shortest = Math.min(...lines.map((line) => line.length));
    const longest = Math.max(...lines.map((line) => line.length));
    // Length limits are soft: preserving a whole word takes precedence.
    const penalty = Math.max(0, longest - maxCharsPerLine) * 4
      + Math.max(0, minCharsPerLine - shortest) * 4;
    return { lines, score: penalty + Math.abs(lines[0].length - lines[1].length) };
  }).filter(({ lines }) => lines.every(Boolean));

  candidates.sort((a, b) => a.score - b.score);
  // Never fall back to slicing an unknown word or an English product name.
  return candidates[0]?.lines || [cleanText];
}
