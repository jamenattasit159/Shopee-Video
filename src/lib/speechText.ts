import fs from "fs";
import path from "path";

const DIGITS_TH = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POSITIONS_TH = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

/**
 * Converts an integer number string (up to 99,999,999) to Thai spoken words
 */
export function numberToThaiWords(numStr: string): string {
  const clean = numStr.replace(/^0+/, "");
  if (!clean) return "ศูนย์";
  const n = parseInt(clean, 10);
  if (isNaN(n)) return numStr;
  if (n === 0) return "ศูนย์";

  // Helper for numbers < 1,000,000
  function chunkToThai(val: number): string {
    if (val === 0) return "";
    let result = "";
    const digits = val.toString().split("").map(Number);
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const d = digits[i];
      const pos = len - i - 1; // 0 = unit, 1 = ten, 2 = hundred, etc.

      if (d === 0) continue;

      if (pos === 1) {
        // หลักสิบ
        if (d === 1) {
          result += "สิบ";
        } else if (d === 2) {
          result += "ยี่สิบ";
        } else {
          result += DIGITS_TH[d] + "สิบ";
        }
      } else if (pos === 0) {
        // หลักหน่วย
        if (d === 1 && len > 1) {
          result += "เอ็ด";
        } else {
          result += DIGITS_TH[d];
        }
      } else {
        result += DIGITS_TH[d] + POSITIONS_TH[pos];
      }
    }
    return result;
  }

  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    return chunkToThai(millions) + "ล้าน" + chunkToThai(remainder);
  }

  return chunkToThai(n);
}

/**
 * Loads default pronunciation map from data/pronunciation-map.json
 */
export function loadPronunciationMap(): Record<string, string> {
  const filePath = path.join(process.cwd(), "data", "pronunciation-map.json");
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err: any) {
    console.debug("[speechText] Failed to load pronunciation map:", err?.message);
  }
  return {};
}

export function savePronunciationMap(map: Record<string, string>): void {
  const filePath = path.join(process.cwd(), "data", "pronunciation-map.json");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2), "utf-8");
}

/**
 * Strips emojis and symbols that should not be spoken aloud
 */
export function removeEmojisAndSymbols(text: string): string {
  return text
    // Emojis & Pictographs
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, "")
    // Decorative stars, bullets, brackets
    .replace(/[★☆✦✧✨🔥⚡📦🛒📍🏷️•●▪️■▶️◀️]/g, "")
    // Excessive punctuation
    .replace(/[~_#`^*+=|\\\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface NormalizeSpeechResult {
  textForSpeech: string;
  unverifiedWords: string[];
}

/**
 * Normalizes text for Thai TTS:
 * 1. Price symbols (฿199 -> "หนึ่งร้อยเก้าสิบเก้าบาท")
 * 2. Ranges (100-200 -> "หนึ่งร้อยถึงสองร้อย")
 * 3. Percentages (100% -> "ร้อยเปอร์เซ็นต์", 50% -> "ห้าสิบเปอร์เซ็นต์")
 * 4. Decimals (12.5 -> "สิบสองจุดห้า")
 * 5. General numbers -> Thai words
 * 6. English words & brand names -> Thai pronunciation map
 * 7. Flags English words not present in the map as unverifiedWords
 */
export function normalizeForSpeech(
  rawText: string,
  customMap?: Record<string, string>
): NormalizeSpeechResult {
  if (!rawText || !rawText.trim()) {
    return { textForSpeech: "", unverifiedWords: [] };
  }

  const map = { ...loadPronunciationMap(), ...(customMap || {}) };
  let processed = removeEmojisAndSymbols(rawText);

  // 1. Convert Prices e.g. ฿199, 199 บาท, ฿ 250
  processed = processed.replace(/(?:฿\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*บาท)/g, (_match, p1, p2) => {
    const amountStr = p1 || p2;
    if (amountStr.includes(".")) {
      const [intPart, decPart] = amountStr.split(".");
      return `${numberToThaiWords(intPart)}บาท${numberToThaiWords(decPart)}สตางค์`;
    }
    return `${numberToThaiWords(amountStr)}บาท`;
  });

  // 2. Convert Percentages e.g. 100%, 50 %
  processed = processed.replace(/(\d+)%/g, (_match, p1) => {
    if (p1 === "100") return "ร้อยเปอร์เซ็นต์";
    return `${numberToThaiWords(p1)}เปอร์เซ็นต์`;
  });

  // 3. Convert Range numbers e.g. 100-200, 10-20, 100–200
  processed = processed.replace(/(\d+)\s*[-–—]\s*(\d+)/g, (_match, p1, p2) => {
    return `${numberToThaiWords(p1)}ถึง${numberToThaiWords(p2)}`;
  });

  // 4. Convert Decimals e.g. 12.5, 3.5
  processed = processed.replace(/(\d+)\.(\d+)/g, (_match, p1, p2) => {
    const decDigits = p2.split("").map((d: string) => DIGITS_TH[parseInt(d, 10)] || d).join("");
    return `${numberToThaiWords(p1)}จุด${decDigits}`;
  });

  // 5. Convert Standalone remaining numbers e.g. 80 แผ่น -> แปดสิบแผ่น, 1 แถม 1 -> หนึ่งแถมหนึ่ง
  processed = processed.replace(/\b(\d+)\b/g, (_match, p1) => {
    return numberToThaiWords(p1);
  });

  // 6. Map English words & brand names
  const unverifiedSet = new Set<string>();

  // Check known map first (case-insensitive key match)
  for (const [key, thaiReplacement] of Object.entries(map)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    processed = processed.replace(regex, thaiReplacement);
  }

  // 7. Find remaining unmapped English words (3+ characters)
  const remainingEnglishWords = processed.match(/\b[A-Za-z]{3,}\b/g);
  if (remainingEnglishWords) {
    for (const word of remainingEnglishWords) {
      unverifiedSet.add(word);
    }
  }

  // Clean double spaces
  processed = processed.replace(/\s+/g, " ").trim();

  return {
    textForSpeech: processed,
    unverifiedWords: Array.from(unverifiedSet),
  };
}
