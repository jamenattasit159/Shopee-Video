import assert from "node:assert";
import { normalizeForSpeech, numberToThaiWords } from "../src/lib/speechText.js";
import { VOICE_PRESETS, buildEffectiveStylePrompt } from "../src/lib/voicePresets.js";

console.log("=== RUNNING SPEECH TEXT & VOICE PRESETS TEST SUITE ===");

// 1. Test Number Conversion
console.log("\n[Test 1] numberToThaiWords:");
assert.strictEqual(numberToThaiWords("0"), "ศูนย์");
assert.strictEqual(numberToThaiWords("5"), "ห้า");
assert.strictEqual(numberToThaiWords("11"), "สิบเอ็ด");
assert.strictEqual(numberToThaiWords("21"), "ยี่สิบเอ็ด");
assert.strictEqual(numberToThaiWords("101"), "หนึ่งร้อยเอ็ด");
assert.strictEqual(numberToThaiWords("544"), "ห้าร้อยสี่สิบสี่");
assert.strictEqual(numberToThaiWords("1000"), "หนึ่งพัน");
assert.strictEqual(numberToThaiWords("1000000"), "หนึ่งล้าน");
console.log("  ✓ Thai number conversion passed: 0, 5, 11, 21, 101, 544, 1000, 1000000");

// 2. Test Normalize for Speech: Price, % and Quantities
console.log("\n[Test 2] normalizeForSpeech - Prices & Quantities:");
const priceRes1 = normalizeForSpeech("ราคา ฿199 เท่านั้น");
assert.strictEqual(priceRes1.textForSpeech.includes("หนึ่งร้อยเก้าสิบเก้าบาท"), true);
console.log("  ✓ ฿199 ->", priceRes1.textForSpeech);

const priceRes2 = normalizeForSpeech("ลดเหลือ 544 บาท โปร 1 แถม 1");
assert.strictEqual(priceRes2.textForSpeech.includes("ห้าร้อยสี่สิบสี่บาท"), true);
assert.strictEqual(priceRes2.textForSpeech.includes("หนึ่ง") && priceRes2.textForSpeech.includes("แถม"), true);
console.log("  ✓ 544 บาท + 1 แถม 1 ->", priceRes2.textForSpeech);

const pctRes = normalizeForSpeech("ลดแรง 100% และลดอีก 50%");
assert.strictEqual(pctRes.textForSpeech.includes("ร้อยเปอร์เซ็นต์"), true);
assert.strictEqual(pctRes.textForSpeech.includes("ห้าสิบเปอร์เซ็นต์"), true);
console.log("  ✓ 100% & 50% ->", pctRes.textForSpeech);

const rangeRes = normalizeForSpeech("เก็บความเย็นได้ 10-20 ชั่วโมง");
assert.strictEqual(rangeRes.textForSpeech.includes("สิบถึงยี่สิบ"), true);
console.log("  ✓ 10-20 ชั่วโมง ->", rangeRes.textForSpeech);

// 3. Test Brand Names and Unverified Words
console.log("\n[Test 3] Pronunciation Map & English Brand Detection:");
const brandRes = normalizeForSpeech("แก้ว Tyeso ซื้อใน Shopee แถมถุงผ้า BrandXYZ");
assert.strictEqual(brandRes.textForSpeech.includes("ไทโซ"), true, "Tyeso should map to ไทโซ");
assert.strictEqual(brandRes.textForSpeech.includes("ช้อปปี้"), true, "Shopee should map to ช้อปปี้");
assert.strictEqual(brandRes.unverifiedWords.includes("BrandXYZ"), true, "Unmapped English word should be flagged");
console.log("  ✓ Brand names mapped, unverified word detected:", brandRes.unverifiedWords);

// 4. Test Emojis removal
console.log("\n[Test 4] Emoji & Pictograph Stripping:");
const emojiRes = normalizeForSpeech("🔥 โปรเด็ดแก้วสแตนเลส ❄️ ส่งฟรี 📦");
assert.strictEqual(emojiRes.textForSpeech.includes("🔥"), false);
assert.strictEqual(emojiRes.textForSpeech.includes("❄️"), false);
assert.strictEqual(emojiRes.textForSpeech.includes("📦"), false);
console.log("  ✓ Emojis stripped cleanly:", emojiRes.textForSpeech);

// 5. Test Voice Presets
console.log("\n[Test 5] Voice Style Presets & Intensity:");
assert.strictEqual(VOICE_PRESETS.length, 6, "Must have exactly 6 presets");
const p1 = buildEffectiveStylePrompt("vendor-live", "high");
assert.strictEqual(p1.includes("จัดเต็มขึ้นอีกนิด"), true);
const p2 = buildEffectiveStylePrompt("friendly-trust", "low");
assert.strictEqual(p2.includes("ให้เบาและเป็นธรรมชาติ"), true);
console.log("  ✓ 6 presets loaded and intensity modifier applied correctly");

console.log("\n🎉 ALL SPEECH TEXT & VOICE PRESETS TESTS PASSED!\n");
