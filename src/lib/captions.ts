/**
 * Shopee Video & TikTok Caption Engine
 * Generates engaging, non-repetitive captions optimized for Shopee Video (< 100 words limit)
 */

export interface CaptionPackage {
  id: string;
  styleName: string;
  styleDescription: string;
  captionText: string;
  hashtags: string[];
  fullPost: string;
  wordCount: number;
  charCount: number;
}

export interface CaptionGeneratorOptions {
  productName: string;
  price: string;
  highlights: string;
  ctaText?: string;
  originalUrl?: string;
  category?: string;
  seed?: number;
}

/**
 * Accurately counts words in Thai/English text using Intl.Segmenter.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  try {
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter("th", { granularity: "word" });
      const segments = Array.from(segmenter.segment(text.trim()));
      return segments.filter((s: any) => s.isWordLike).length;
    }
  } catch {
    // fallback below
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Counts characters excluding leading/trailing whitespace.
 */
export function countChars(text: string): number {
  return text ? text.trim().length : 0;
}

/**
 * Truncates text so the total word count does not exceed maxWords.
 */
export function enforceWordLimit(text: string, maxWords = 90): string {
  if (countWords(text) <= maxWords) return text;

  try {
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter("th", { granularity: "word" });
      const segments = Array.from(segmenter.segment(text));
      let wordCount = 0;
      let cutIndex = text.length;

      for (const seg of segments) {
        if ((seg as any).isWordLike) {
          wordCount++;
          if (wordCount > maxWords) {
            cutIndex = (seg as any).index;
            break;
          }
        }
      }
      return text.slice(0, cutIndex).trim() + "...";
    }
  } catch {
    // fallback
  }

  const parts = text.split(/\s+/);
  return parts.slice(0, maxWords).join(" ") + "...";
}

/**
 * Helper to pick a pseudo-random item from an array given a seed.
 */
function pickVariation<T>(arr: T[], seed: number, offset = 0): T {
  const index = Math.abs(Math.floor(seed + offset)) % arr.length;
  return arr[index];
}

/**
 * Category-aware hashtags helper.
 */
function getCategoryHashtags(category?: string, productName = ""): string[] {
  const cat = (category || "").toLowerCase();
  const prod = productName.toLowerCase();

  const baseTags = ["#Shopeeป้ายยา", "#ของดีบอกต่อ", "#รีวิวช้อปปี้", "#พิกัดในตะกร้าส้ม"];

  if (cat.includes("beauty") || cat.includes("skincare") || prod.includes("lotion") || prod.includes("ครีม") || prod.includes("น้ำหอม")) {
    return [...baseTags, "#รีวิวบิวตี้", "#ใช้ดีบอกต่อ", "#howtobeauty"];
  }
  if (cat.includes("home") || cat.includes("kitchen") || prod.includes("แก้ว") || prod.includes("บ้าน")) {
    return [...baseTags, "#ของใช้ในบ้าน", "#แต่งบ้าน", "#เด็กหอต้องมี"];
  }
  if (cat.includes("electronic") || cat.includes("gadget") || prod.includes("หูฟัง") || prod.includes("ชาร์จ")) {
    return [...baseTags, "#เด็กไอที", "#ของมันต้องมี", "#แกดเจ็ต"];
  }
  if (cat.includes("fashion") || prod.includes("เสื้อ") || prod.includes("กางเกง") || prod.includes("กระเป๋า")) {
    return [...baseTags, "#ootd", "#แฟชั่นshopee", "#ชี้เป้าแฟชั่น"];
  }

  return [...baseTags, "#ช้อปปี้ถูกชัวร์", "#ป้ายยาช้อปปี้"];
}

/**
 * Generates 5 distinct, high-converting Shopee Video caption styles.
 * All captions strictly obey the 100-word limit constraint for Shopee Video.
 */
export function generatePostCaptions(
  productName: string,
  price: string,
  highlights: string,
  ctaText?: string,
  originalUrl?: string,
  options?: { category?: string; seed?: number }
): CaptionPackage[] {
  const seed = options?.seed ?? Date.now();
  const cleanHighlights = highlights
    .split(/[,.\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const topHighlight = cleanHighlights[0] || "ฟังก์ชันครบ คุ้มเกินราคา";
  const secondHighlight = cleanHighlights[1] || "งานเนี๊ยบ ตรงปกไม่จกตา";

  const categoryTags = getCategoryHashtags(options?.category, productName);
  // Pick top 4-5 hashtags to keep word count low
  const chosenTags = categoryTags.slice(0, 4);
  const tagString = chosenTags.join(" ");

  // Variation Pools to prevent repetitive captions
  const punchyHooks = [
    `⚡ เจอนี่แล้วจบเลย! ${productName}`,
    `🔥 ยกให้เป็นไอเทมแห่งปี! ${productName}`,
    `💥 หยุดเลื่อนก่อน! ใครหา ${productName} อยู่รีบดู`,
    `👀 สวยตรงปกในงบ ${price}! ${productName}`,
    `💯 คุ้มเกินเบอร์มากแม่! ${productName}`,
  ];

  const relatableHooks = [
    `แก... เพิ่งเข้าใจว่าทำไมคนถึงป้ายยาตัวนี้กันเยอะมาก 🥺`,
    `คือไม่อยากเก็บไว้ใช้คนเดียวจริงๆ อะทุกคนน ${productName}`,
    `โดนตกจนได้! ได้ลอง ${productName} แล้วชอบมากก`,
    `เพื่อนทักถามพิกัดจนต้องทำคลิปบอก! ${productName}`,
    `ใครยังลังเลอยู่บอกเลยไม่ต้องคิดเยอะ คุ้มจริง!`,
  ];

  const dealHooks = [
    `🏷️ จัดโปรเดือดรอบนี้เหลือแค่ ${price} เท่านั้น!`,
    `🚨 FLASH SALE พิกัดตะกร้าส้ม ลดเหลือ ${price}!`,
    `💸 งบหลักร้อยแต่คุณภาพหลักพัน! เพียง ${price}`,
    `⚡ คุ้มตาแตก! ${productName} ลดราคาพิเศษวันนี้`,
  ];

  const problemHooks = [
    `ใครเจอปัญหานี้อยู่ลองดูตัวนี้เลย! ${productName}`,
    `หยุดเสียเงินลองผิดลองถูก แล้วมาจบที่ ${productName}`,
    `แก้ปัญหาตรงจุดมากก ตัวนี้ตอบโจทย์สุดๆ`,
    `ถ้ากำลังหาตัวช่วยดีๆ แนะนำ ${productName} เลย`,
  ];

  const aestheticHooks = [
    `✨ สวยมินิมอลตรงปกมากก ดีต่อใจสุดๆ ${productName}`,
    `Unbox ออกมาแล้วประทับใจมาก ดีไซน์ดี งานพรีเมียมในราคา ${price}`,
    `ป้ายยาของน่ารักน่าใช้ ${productName} สวยจนอยากบอกต่อ`,
  ];

  const ctaVariations = [
    `🛒 พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง รีบเก็บโค้ดส่งฟรีน้า 👇`,
    `👉 จิ้มตะกร้าส้มซ้ายล่างได้เลย มีโค้ดลดเพิ่มด้วยจ้า 📦`,
    `📌 แปะพิกัดไว้ในตะกร้าส้มซ้ายมือแล้วน้า รีบตำก่อนหมด! ✨`,
    `🛒 พิกัดในตะกร้าส้มเลยงับ กดสั่งซื้อด่วนๆ ของหมดไวมาก 🔥`,
  ];

  const pickedCta = pickVariation(ctaVariations, seed);

  // 1. Style: Punchy & Short (< 45 words) — Perfect for fast scrollers
  const hook1 = pickVariation(punchyHooks, seed, 1);
  const text1 = `${hook1}
ราคาเบาๆ แค่ ${price} เท่านั้น จุดเด่นคือ${topHighlight} แถมยัง${secondHighlight}
${pickedCta}`;
  const fullPost1 = enforceWordLimit(`${text1}\n\n${tagString}`, 90);

  // 2. Style: Relatable Bestie (< 65 words) — Friendly & Authentic
  const hook2 = pickVariation(relatableHooks, seed, 2);
  const text2 = `${hook2}
สำหรับ ${productName} ตัวนี้ เนื้อดี/ฟังก์ชันครบ ${topHighlight} ในราคาแค่ ${price} คุ้มเกินต้านมาก
${pickVariation(ctaVariations, seed, 3)}`;
  const fullPost2 = enforceWordLimit(`${text2}\n\n${tagString}`, 90);

  // 3. Style: Shopee Deal Hunter (< 60 words) — High Urgency & Savings
  const hook3 = pickVariation(dealHooks, seed, 3);
  const text3 = `${hook3}
${productName} ไอเทมตัวท็อป ${topHighlight}
🎟️ มีโค้ดส่งฟรี + คูปองลดเพิ่มในคลิป
${pickVariation(ctaVariations, seed, 5)}`;
  const fullPost3 = enforceWordLimit(`${text3}\n\n${tagString}`, 90);

  // 4. Style: Problem-Solver (< 65 words) — Solution-focused
  const hook4 = pickVariation(problemHooks, seed, 4);
  const text4 = `${hook4}
ช่วยเรื่อง ${topHighlight} ได้ดีมาก แถมยัง ${secondHighlight}
งบแค่ ${price} เท่านั้น
${pickVariation(ctaVariations, seed, 7)}`;
  const fullPost4 = enforceWordLimit(`${text4}\n\n${tagString}`, 90);

  // 5. Style: Minimal Aesthetic (< 55 words) — Clean & Quality
  const hook5 = pickVariation(aestheticHooks, seed, 5);
  const text5 = `${hook5}
${topHighlight} คุ้มค่าเกินราคา ${price}
${pickVariation(ctaVariations, seed, 9)}`;
  const fullPost5 = enforceWordLimit(`${text5}\n\n${tagString}`, 90);

  const rawPackages = [
    {
      id: "punchy-short",
      styleName: "⚡ สั้นกระชับ ฮุกแรง (Shopee Video Recommend)",
      styleDescription: "สั้น ตรงประเด็น อ่านจบใน 3 วินาที ไม่เกิน 50 คำ เหมาะกับคนไถฟีดไว",
      captionText: text1,
      hashtags: chosenTags,
      fullPost: fullPost1,
    },
    {
      id: "relatable-bestie",
      styleName: "💬 ฟีลเพื่อนป้ายยา (Authentic Bestie)",
      styleDescription: "ภาษาเป็นกันเอง เล่าเหมือนเพื่อนสนิทบอกต่อ เพิ่มความน่าเชื่อถือ",
      captionText: text2,
      hashtags: chosenTags,
      fullPost: fullPost2,
    },
    {
      id: "deal-hunter",
      styleName: "🏷️ เน้นโปร & โค้ดส่งฟรี (Shopee Deal Hunter)",
      styleDescription: "ชูราคาลดพิเศษ เตือนเก็บโค้ดส่งฟรีในตะกร้าส้ม กระตุ้นยอดสั่งซื้อ",
      captionText: text3,
      hashtags: chosenTags,
      fullPost: fullPost3,
    },
    {
      id: "problem-solver",
      styleName: "🎯 แก้ปัญหาตรงจุด (Problem Solver)",
      styleDescription: "เปิดด้วย Pain point แล้วชูสินค้าเป็นทางออก เหมาะกับสินค้าฟังก์ชัน",
      captionText: text4,
      hashtags: chosenTags,
      fullPost: fullPost4,
    },
    {
      id: "aesthetic-minimal",
      styleName: "✨ มินิมอล สวยตรงปก (Aesthetic & Quality)",
      styleDescription: "เน้นคุณภาพ ดีไซน์ เรียบหรู เหมาะกับของแต่งบ้าน ความงาม แฟชั่น",
      captionText: text5,
      hashtags: chosenTags,
      fullPost: fullPost5,
    },
  ];

  return rawPackages.map((pkg) => ({
    ...pkg,
    wordCount: countWords(pkg.fullPost),
    charCount: countChars(pkg.fullPost),
  }));
}
