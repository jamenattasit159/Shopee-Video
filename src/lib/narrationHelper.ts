export function buildNaturalNarrationText(
  productName: string,
  price: string,
  scenes: Array<{ highlightTitle: string; highlightDesc: string }>,
  cta: { ctaTitle: string; basketNote?: string }
): string {
  const scene1 = scenes[0] ? `${scenes[0].highlightTitle} ${scenes[0].highlightDesc}` : "";
  const scene2 = scenes[1] ? `แถมยัง${scenes[1].highlightTitle} ${scenes[1].highlightDesc}` : "";
  const scene3 = scenes[2] ? `ที่สำคัญคือ${scenes[2].highlightTitle}` : "";

  const featuresText = [scene1, scene2, scene3].filter(Boolean).join(" ");

  return `ทุกคนนน เจอไอเทมเด็ดอีกแล้ว! ${productName} ตัวนี้คือดีงามมาก ${featuresText} ตอนนี้จัดโปรพิเศษเหลือแค่ ${price} เท่านั้น พิกัดจิ้มที่ตะกร้าส้มซ้ายล่างได้เลยจ้า รีบกดก่อนของหมดน้า!`;
}
