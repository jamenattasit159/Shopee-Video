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
  if (!text) return [];
  const cleanText = text.trim();

  // If already fits in 1 line
  if (cleanText.length <= maxCharsPerLine) {
    return [cleanText];
  }

  // Step 1: If text contains whitespace, split by whitespace first
  if (/\s+/.test(cleanText)) {
    const parts = cleanText.split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      const v1 = validateLine(parts[0], maxCharsPerLine + 4, minCharsPerLine);
      const v2 = validateLine(parts[1], maxCharsPerLine + 4, minCharsPerLine);
      if (v1.valid && v2.valid) {
        return [parts[0], parts[1]];
      }
    } else if (parts.length > 2) {
      // Find best split point among whitespace tokens
      let bestSplit = 1;
      let minDiff = Infinity;
      for (let i = 1; i < parts.length; i++) {
        const l1 = parts.slice(0, i).join(" ");
        const l2 = parts.slice(i).join(" ");
        const diff = Math.abs(l1.length - l2.length);
        if (
          l1.length <= maxCharsPerLine + 4 &&
          l2.length <= maxCharsPerLine + 4 &&
          diff < minDiff
        ) {
          minDiff = diff;
          bestSplit = i;
        }
      }
      const line1 = parts.slice(0, bestSplit).join(" ");
      const line2 = parts.slice(bestSplit).join(" ");
      return [line1, line2];
    }
  }

  // Step 2: Continuous text without spaces.
  // Find protected ranges for all keywords in KEEP.
  const protectedRanges: Array<{ start: number; end: number }> = [];
  for (const kw of SORTED_KEEP) {
    let startIdx = 0;
    while ((startIdx = cleanText.indexOf(kw, startIdx)) !== -1) {
      protectedRanges.push({ start: startIdx, end: startIdx + kw.length });
      startIdx += 1;
    }
  }

  const isCutInsideProtected = (pos: number) => {
    return protectedRanges.some((r) => pos > r.start && pos < r.end);
  };

  const isCutAtForbiddenThaiChar = (pos: number) => {
    if (pos <= 0 || pos >= cleanText.length) return true;
    const charBefore = cleanText[pos - 1];
    const charAfter = cleanText[pos];
    // Cannot cut after leading vowels
    if (/[เแโใไ]/.test(charBefore)) return true;
    // Cannot cut before tone marks or dependent vowels
    if (THAI_DEPENDENT_MARKS_REGEX.test(charAfter)) return true;
    return false;
  };

  // Find candidate cut point closest to center
  const center = cleanText.length / 2;
  let bestCut = -1;
  let minDistance = Infinity;

  for (let cut = minCharsPerLine; cut <= cleanText.length - minCharsPerLine; cut++) {
    if (isCutInsideProtected(cut)) continue;
    if (isCutAtForbiddenThaiChar(cut)) continue;

    const l1 = cleanText.slice(0, cut).trim();
    const l2 = cleanText.slice(cut).trim();
    const v1 = validateLine(l1, maxCharsPerLine + 6, minCharsPerLine);
    const v2 = validateLine(l2, maxCharsPerLine + 6, minCharsPerLine);
    if (!v1.valid || !v2.valid) continue;

    const dist = Math.abs(cut - center);
    if (dist < minDistance) {
      minDistance = dist;
      bestCut = cut;
    }
  }

  if (bestCut !== -1) {
    return [cleanText.slice(0, bestCut).trim(), cleanText.slice(bestCut).trim()];
  }

  // Fallback: If no protected cut passed validation, cut at center avoiding forbidden marks
  let fallbackCut = Math.round(center);
  for (let offset = 0; offset < cleanText.length / 2; offset++) {
    for (const sign of [1, -1]) {
      const testPos = fallbackCut + offset * sign;
      if (
        testPos >= minCharsPerLine &&
        testPos <= cleanText.length - minCharsPerLine &&
        !isCutAtForbiddenThaiChar(testPos)
      ) {
        const fl1 = cleanText.slice(0, testPos).trim();
        const fl2 = cleanText.slice(testPos).trim();
        if (
          validateLine(fl1, maxCharsPerLine + 8, minCharsPerLine).valid &&
          validateLine(fl2, maxCharsPerLine + 8, minCharsPerLine).valid
        ) {
          return [fl1, fl2];
        }
      }
    }
  }

  return [cleanText];
}
