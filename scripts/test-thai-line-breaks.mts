import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSafeThaiLines } from "../remotion/lib/thaiKeep";

test("caption stickers break at Thai words instead of the character midpoint", () => {
  assert.deepEqual(splitSafeThaiLines("ขอบเอวกระชับกันรั่วซึม", 12, 6), ["ขอบเอวกระชับ", "กันรั่วซึม"]);
  assert.deepEqual(splitSafeThaiLines("หมดกังวลเรื่องอับชื้น", 12, 6), ["หมดกังวล", "เรื่องอับชื้น"]);
});

test("line boundaries preserve words, protected phrases, punctuation and all content", () => {
  const texts = [
    "ขอบเอวก็กระชับกันรั่วซึม",
    "ลดแรงวันนี้ส่งฟรีพร้อมส่ง",
    "ทิชชู่เปียกอ่อนโยนต่อผิวเด็ก",
    "DODOLOVE ราคา 1,299.50 บาท",
    "ซื้อเลย! คุ้มมาก ส่งฟรี",
    "อ่อนโยน ปลอดภัย",
    "สแตนเลสเก็บความเย็น",
    "Supercalifragilisticexpialidocious",
  ];
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  for (const text of texts) {
    for (const max of [8, 12, 14, 18]) {
      const lines = splitSafeThaiLines(text, max, 4);
      assert.ok(lines.length >= 1 && lines.length <= 2);
      assert.equal(lines.join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
      if (lines.length === 2) {
        const cut = lines[0].length;
        assert.ok([...segmenter.segment(text)].some((s) => s.index === cut || s.index === cut + (text.slice(cut).match(/^\s*/)?.[0].length || 0)), `${text}: ${lines.join(" | ")}`);
      }
    }
  }
  assert.deepEqual(splitSafeThaiLines("สแตนเลสเก็บความเย็น", 8, 4), ["สแตนเลส", "เก็บความเย็น"]);
  assert.deepEqual(splitSafeThaiLines("Supercalifragilisticexpialidocious", 8, 4), ["Supercalifragilisticexpialidocious"]);
});

test("empty and short text stay unchanged", () => {
  assert.deepEqual(splitSafeThaiLines(""), []);
  assert.deepEqual(splitSafeThaiLines("  ส่งฟรี  "), ["ส่งฟรี"]);
});
