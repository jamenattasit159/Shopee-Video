import assert from "node:assert/strict";
import { adjustNarrationGender } from "../src/lib/narrationGender";

const cases = [
  ["สวัสดีครับ ขอบคุณครับ", "female", "สวัสดีค่ะ ขอบคุณค่ะ"],
  ["สนใจไหมครับ ซื้อเลยนะครับ ใช่มั้ยครับ", "female", "สนใจไหมคะ ซื้อเลยนะคะ ใช่มั้ยคะ"],
  ["พร้อมหรือยังครับ มีของหรือเปล่าครับ", "female", "พร้อมหรือยังคะ มีของหรือเปล่าคะ"],
  ["ราคาเท่าไรครับ? สีอะไรครับ？", "female", "ราคาเท่าไรคะ? สีอะไรคะ？"],
  ["ขอบคุณครับผม", "female", "ขอบคุณค่ะ"],
  ["ชนะครับ ราคากี่บาทครับ ส่งเมื่อไหร่ครับ", "female", "ชนะค่ะ ราคากี่บาทคะ ส่งเมื่อไหร่คะ"],
  ["สวัสดีค่ะ สนใจไหมคะ ซื้อเลยนะคะ", "male", "สวัสดีครับ สนใจไหมครับ ซื้อเลยนะครับ"],
  ["คะแนนดี คะน้าสด สินค้า 199 บาท BrandX", "male", "คะแนนดี คะน้าสด สินค้า 199 บาท BrandX"],
  ["คะแนนดี คะน้าสด สินค้า 199 บาท BrandX", "female", "คะแนนดี คะน้าสด สินค้า 199 บาท BrandX"],
  ["ดีครับคุ้มครับ\nลองไหมครับ!", "female", "ดีค่ะคุ้มค่ะ\nลองไหมคะ!"],
  ["", "female", ""],
] as const;

for (const [input, gender, expected] of cases) {
  assert.equal(adjustNarrationGender(input, gender), expected);
  assert.equal(adjustNarrationGender(expected, gender), expected, "Repeated clicks must be idempotent");
}
console.log(`Narration gender: ${cases.length} cases passed (including repeated clicks).`);
