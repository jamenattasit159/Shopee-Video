export function buildNaturalNarrationText(
  productName: string,
  price: string,
  scenes: Array<{ highlightTitle: string; highlightDesc: string }>,
  cta: { ctaTitle: string; basketNote?: string }
): string {
  const formatScene = (s?: { highlightTitle: string; highlightDesc: string }) => {
    if (!s) return "";
    const t = s.highlightTitle.trim();
    const d = s.highlightDesc.trim();
    if (!d || d === t) return t;
    if (d.startsWith(t) || d.includes(t)) return d;
    return `${t} ${d}`;
  };

  const scene1 = scenes[0] ? formatScene(scenes[0]) : "";
  const scene2 = scenes[1] ? `แถมยัง${formatScene(scenes[1])}` : "";
  const scene3 = scenes[2] ? `ที่สำคัญคือ${formatScene(scenes[2])}` : "";

  const featuresText = [scene1, scene2, scene3].filter(Boolean).join(" ");
  const cleanPrice = price ? `เหลือแค่ ${price} เท่านั้น` : "ราคาดีมาก";

  return `ทุกคนนน เจอไอเทมเด็ดอีกแล้ว! ${productName} ตัวนี้คือดีงามมาก ${featuresText} ตอนนี้จัดโปรพิเศษ${cleanPrice} พิกัดจิ้มที่ตะกร้าส้มซ้ายล่างได้เลยจ้า รีบกดก่อนของหมดน้า!`;
}
