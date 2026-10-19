export type NarrationGender = "male" | "female";

/** Adjust polite particles without replacing syllables inside ordinary Thai words. */
export function adjustNarrationGender(text: string, gender: NarrationGender): string {
  const segments = Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text));

  return segments.map(({ segment, index }, i) => {
    if (gender === "female" && segment === "ผม" && segments[i - 1]?.segment === "ครับ") {
      return ""; // ครับผม is one polite response, not a first-person pronoun here.
    }
    if (!["ครับ", "ค่ะ", "คะ"].includes(segment)) return segment;
    if (gender === "male") return "ครับ";

    const clause = text.slice(0, index).split(/[.!?。！？\n]/).pop()?.trimEnd() || "";
    const following = text.slice(index + segment.length);
    const isQuestion = segments[i - 1]?.segment === "นะ"
      || /(?:ไหม|มั้ย|หรือ|เหรอ|หรอ|หรือเปล่า|รึเปล่า|หรือยัง|รึยัง|เท่าไร|เท่าไหร่|กี่บาท|กี่ชิ้น|กี่อัน|กี่วัน|กี่โมง|อย่างไร|ยังไง|ที่ไหน|เมื่อไร|เมื่อไหร่|สีอะไร)$/.test(clause)
      || /^[\s”"'»)]*[?？]/.test(following);
    return isQuestion ? "คะ" : "ค่ะ";
  }).join("");
}
