import { GoogleGenAI } from "@google/genai";
import {
  CTAData,
  HookData,
  PaperTheme,
  SceneData,
  SceneLayout,
  StoryboardPlan,
  StyleDNA,
} from "../../remotion/types";
import { loadStyleHistory, pickStyleDNA } from "./styleDirector";
import { buildNaturalNarrationText } from "./narrationHelper";

export { buildNaturalNarrationText };

export interface ScriptGenerationParams {
  productName: string;
  price: string;
  highlights: string;
  tone: string;
  imageCount: number;
  ctaText?: string;
  styleDNA?: StyleDNA;
  recentHeadlines?: string[];
  dominantColors?: string[];
  category?: string;
  promoTag?: string;
  facts?: any;
}

export async function generateShopeeScript(
  params: ScriptGenerationParams
): Promise<StoryboardPlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Ensure styleDNA is prepared
  const styleDNA =
    params.styleDNA ||
    pickStyleDNA({
      productId: params.productName,
      dominantColors: params.dominantColors,
    });

  const recentHistory = loadStyleHistory();
  const recentHeadlines =
    params.recentHeadlines ||
    recentHistory
      .slice(-5)
      .map((h) => h.dna.hookFormula)
      .filter(Boolean);

  if (apiKey && apiKey.trim() !== "" && !apiKey.includes("your_gemini_api_key")) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const toneDescriptions: Record<string, { desc: string; defaultTheme: PaperTheme }> = {
        exciting: {
          desc: "สายป้ายยา ตื่นเต้น เร้าใจ ภาษาวัยรุ่น มีเอเนอร์จี้ ชวนว้าว",
          defaultTheme: "halftone-orange",
        },
        minimal: {
          desc: "มินิมอล คลีนๆ อบอุ่น ฟังสบาย น่าเชื่อถือ เรียบหรู",
          defaultTheme: "cream-grid",
        },
        problem_solving: {
          desc: "เน้นชี้ Pain Point แก้ปัญหาในชีวิตประจำวัน รีวิวแบบจริงใจ",
          defaultTheme: "pastel-mint",
        },
        promo: {
          desc: "เน้นโปรโมชั่น Flash Sale เร่งด่วน คุ้มสุดๆ ด่วนก่อนหมดเวลา",
          defaultTheme: "halftone-orange",
        },
      };

      const selectedTone = toneDescriptions[params.tone] || {
        desc: params.tone,
        defaultTheme: "kraft",
      };

      const systemPrompt = `You are a top-tier viral Shopee & TikTok Affiliate Video Director, Motion Designer, and Copywriter.
Your task is to write a high-converting, professional short-form video storyboard formatted for a Paper Collage & Stop-Motion aesthetic in THAI.

CREATIVE DIRECTION LOCK (STYLE DNA):
- STYLE PACK: ${styleDNA.pack}
- HOOK FORMULA: ${styleDNA.hookFormula}
- STORY STRUCTURE: ${styleDNA.structure}
- TEMPO: ${styleDNA.tempo}

COPYWRITING FLAVOR FOR PACK "${styleDNA.pack}":
- If comic-popart: use energetic sound effects like "💥 ปังมาก!", "POW!", "ว้าวสุดๆ"
- If zine-newspaper: short punchy breaking-news headlines like "📰 พาดหัวด่วน!", "เปิดพิกัดลับ"
- If supermarket-flyer: high-urgency bargain discount phrases like "🔥 ลดแรง!", "ดีลเดือด!", "คุ้มตาแตก"
- If soft-kawaii: sweet cute review tones like "✨ ละมุนใจมาก", "น่ารักนุบนิบ", "ใจฟู"
- If notebook-doodle: relatable personal notebook tone like "✏️ จดลิสต์ด่วน", "เทคนิคเด็กหอ"
- If pinboard-corkboard: investigation / curated find tone like "📌 ปักหมุดไอเทมเด็ด", "ของแท้ตรงปก"
- If sticker-bomb: electric street-style hype phrases like "⚡ ไม่ซื้อคือพลาด", "ตะโกนว่าดี"
- If kraft-scrapbook: warm creator journal review like "🏷️ ของดีบอกต่อ", "ใช้จริงไม่อวย"

CRITICAL ANTI-REPETITION RULES:
1. PREVIOUS HEADLINES TO AVOID:
${recentHeadlines.map((h, i) => `   - [${i + 1}] "${h}"`).join("\n")}
   DO NOT reuse phrases or sentence structures from these recent headlines!
2. READABILITY:
   - Hook headline: Under 24 Thai characters, punchy and clear.
   - Scene headline: Under 24 Thai characters.
   - Headline and Subtitle MUST be strictly distinct within the same scene (Headline ≠ Subtitle).
   - Price placement: Mention the price ONLY in the CTA scene. Do not repeat price in previous scenes!
3. COMPLIANCE & FACT GROUNDING:
   - Use ONLY facts explicitly provided in Verified Facts or Product Name. DO NOT invent false ingredients, functions, or results.
   - For baby, health, beauty products: STRICTLY PROHIBIT medical claims and 100% guarantees (e.g. NEVER say "ปลอดภัย 100%", "ไม่ระคายเคืองแน่นอน", "รักษา/ป้องกันโรค", "ดีกว่ายี่ห้ออื่น").
   - Claims like "ออร์แกนิค" may only be used if they appear directly in the product title or verified facts.
   - If a Promo Tag is present (e.g. "${params.promoTag || ''}"), it may be used as badge text or sticker text.

Return ONLY a valid JSON object matching this schema:
{
  "hook": {
    "headline": "Punchy Thai hook headline (max 24 chars)",
    "subheadline": "Catchy intrigue subtitle (max 28 chars)",
    "badgeText": "Badge tag with emoji",
    "highlightWord": "Word to highlight with marker",
    "paperTheme": "kraft",
    "durationSec": 3
  },
  "scenes": [
    {
      "highlightTitle": "Key feature title (max 24 chars)",
      "highlightDesc": "Distinct benefit without repeating price (max 28 chars)",
      "stickerText": "Sticker tag with emoji",
      "highlightWord": "Word to highlight",
      "layout": "hero-center",
      "paperTheme": "cream-grid",
      "imageIndex": 0,
      "durationSec": 4
    }
  ],
  "cta": {
    "ctaTitle": "Call to action headline (e.g. จิ้มตะกร้าส้มซ้ายล่างเลย!)",
    "ctaSubtitle": "Incentive like free shipping or coupon",
    "buttonText": "ช้อปเลยที่ Shopee",
    "badgeText": "⚡ โค้ดส่งฟรีจำนวนจำกัด",
    "basketNote": "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    "paperTheme": "halftone-orange",
    "durationSec": 3
  },
  "narrationScript": "Full spoken voiceover in continuous, natural Thai."
}`;

      const userContent = `Product Name: ${params.productName}
Price / Promotion: ${params.price}
Highlights / Key Selling Points: ${params.highlights}
Desired Tone: ${selectedTone.desc}
User CTA preference: ${params.ctaText || "พิกัดตะกร้าส้มซ้ายล่าง"}
Number of uploaded images: ${params.imageCount}
${params.category ? `Product Category: ${params.category}\n` : ""}${params.promoTag ? `Promo Tag: ${params.promoTag}\n` : ""}${params.facts ? `Verified Facts: ${JSON.stringify(params.facts)}\n` : ""}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\n${userContent}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.95, // Higher temperature for rich diversity
        },
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        const validated = validateAndNormalizeStoryboard(parsed, params, styleDNA);
        return validated;
      }
    } catch (error) {
      console.warn("Gemini API call failed, falling back to intelligent template:", error);
    }
  }

  // Fallback template generator when API key is not yet set or API failed
  return generateFallbackStoryboard(params, styleDNA);
}

function deriveIntelligentBenefits(
  productName: string,
  highlights: string,
  index: number
): { title: string; desc: string; word: string } {
  const combined = `${productName} ${highlights}`.toLowerCase();

  if (
    combined.includes("หอม") ||
    combined.includes("น้ำหอม") ||
    combined.includes("perfume") ||
    combined.includes("เซ็กซี่")
  ) {
    const list = [
      { title: "หอมติดทน เซ็กซี่ดึงดูด", desc: "กลิ่นหอมมีเสน่ห์ เพิ่มความมั่นใจตลอดวัน", word: "หอมติดทน" },
      { title: "กลิ่นเอกลักษณ์ ไม่ฉุน", desc: "ละมุนมีระดับ ใครได้กลิ่นก็ต้องทัก", word: "ไม่ฉุน" },
      { title: "ของแท้ การันตีตรงปก", desc: "กลิ่นฟุ้งกระจาย ฉีดได้ทุกวัน", word: "ตรงปก" },
    ];
    return list[index % list.length];
  }

  if (
    combined.includes("ผิว") ||
    combined.includes("ครีม") ||
    combined.includes("เซรั่ม") ||
    combined.includes("หน้าใส") ||
    combined.includes("สิว") ||
    combined.includes("บำรุง") ||
    combined.includes("กันแดด")
  ) {
    const list = [
      { title: "บำรุงล้ำลึก ผิวดูอิ่มฟู", desc: "ฟื้นฟูผิวเร่งด่วน ผิวสุขภาพดีอย่างเป็นธรรมชาติ", word: "ผิวอิ่มฟู" },
      { title: "อ่อนโยน ซึมไว ไม่เหนอะ", desc: "เนื้อบางเบา สบายผิว ไม่ระคายเคือง", word: "ซึมไว" },
      { title: "เห็นผลจริง ลูกค้าซื้อซ้ำ", desc: "รีวิวแน่น ใช้ต่อเนื่องผิวยิ่งกระจ่างใส", word: "เห็นผลจริง" },
    ];
    return list[index % list.length];
  }

  if (
    combined.includes("ผ้า") ||
    combined.includes("เสื้อ") ||
    combined.includes("กางเกง") ||
    combined.includes("รองเท้า") ||
    combined.includes("กระเป๋า") ||
    combined.includes("แฟชั่น")
  ) {
    const list = [
      { title: "ผ้านุ่ม ใส่สบาย ระบายอากาศ", desc: "คัตติ้งเนี้ยบ ทรงสวย แมตช์ง่ายทุกลุค", word: "นุ่มสบาย" },
      { title: "ดีไซน์ทันสมัย ดูดีมีสไตล์", desc: "ใส่ได้ทุกโอกาส มั่นใจทุกการเคลื่อนไหว", word: "ทรงสวย" },
      { title: "งานเย็บประณีต ทนทาน", desc: "ของจริงตรงปก คุณภาพเกินราคา", word: "ตรงปก" },
    ];
    return list[index % list.length];
  }

  if (
    combined.includes("หูฟัง") ||
    combined.includes("บลูทูธ") ||
    combined.includes("แบต") ||
    combined.includes("เสียง") ||
    combined.includes("สายชาร์จ") ||
    combined.includes("gadget") ||
    combined.includes("ไอที")
  ) {
    const list = [
      { title: "เสียงคมชัด เบสแน่นสะใจ", desc: "ตัดเสียงรบกวนรอบข้าง ฟังเพลงเพลินไม่มีสะดุด", word: "เสียงคมชัด" },
      { title: "แบตเตอรี่อึด ใช้งานได้ยาวนาน", desc: "ชาร์จเร็ว พกพาสะดวก พร้อมลุยทุกที่", word: "แบตอึด" },
      { title: "เชื่อมต่อง่าย เสถียร ไม่ดีเลย์", desc: "รองรับทุกอุปกรณ์ ตอบโจทย์ทุกไลฟ์สไตล์", word: "เชื่อมต่อง่าย" },
    ];
    return list[index % list.length];
  }

  if (
    combined.includes("แก้ว") ||
    combined.includes("กระติก") ||
    combined.includes("น้ำแข็ง") ||
    combined.includes("สแตนเลส") ||
    combined.includes("tyeso")
  ) {
    const list = [
      { title: "เก็บอุณหภูมิยาวนาน 24 ชม.", desc: "สแตนเลสคุณภาพสูง ไอน้ำไม่เกาะโต๊ะ", word: "เก็บอุณหภูมิ" },
      { title: "พกพาสะดวก ฝาปิดแน่น", desc: "ไม่หกเลอะเทอะ ใช้งานง่ายได้ทุกวัน", word: "ไม่หกเลอะ" },
      { title: "ดีไซน์มินิมอล สวยตรงปก", desc: "ทำความสะอาดง่าย แข็งแรงทนทาน", word: "ตรงปก" },
    ];
    return list[index % list.length];
  }

  if (
    combined.includes("อาหาร") ||
    combined.includes("ขนม") ||
    combined.includes("อร่อย") ||
    combined.includes("ชา") ||
    combined.includes("กาแฟ") ||
    combined.includes("กิน")
  ) {
    const list = [
      { title: "รสชาติเข้มข้น อร่อยกลมกล่อม", desc: "คัดสรรวัตถุดิบชั้นดี สะอาด สดใหม่ทุกคำ", word: "รสชาติเข้มข้น" },
      { title: "ทานเพลิน หยุดไม่อยู่", desc: "พกพาสะดวก อิ่มอร่อยได้ทุกที่ทุกเวลา", word: "อร่อยเพลิน" },
      { title: "สูตรเด็ด ยอดขายการันตี", desc: "ของแท้ส่งตรง คุณภาพมาตรฐาน", word: "สูตรเด็ด" },
    ];
    return list[index % list.length];
  }

  const defaultList = [
    { title: "ฟังก์ชันครบ คุ้มค่าเกินราคา", desc: "ตอบโจทย์การใช้งานจริงในชีวิตประจำวัน", word: "คุ้มค่า" },
    { title: "ดีไซน์สวย ตรงปกไม่จกตา", desc: "วัสดุคุณภาพดี พกพาสะดวก ใช้งานง่าย", word: "ตรงปก" },
    { title: "ของแท้ การันตีความประทับใจ", desc: "รีวิวแน่น ผู้ใช้จริงบอกต่อ ช้อปได้มั่นใจ", word: "ของแท้" },
  ];
  return defaultList[index % defaultList.length];
}

function validateAndNormalizeStoryboard(
  data: any,
  params: ScriptGenerationParams,
  styleDNA: StyleDNA
): StoryboardPlan {
  const layouts: SceneLayout[] = styleDNA.layouts || [
    "hero-center",
    "polaroid-stack",
    "callout-circle",
  ];
  const themes: PaperTheme[] = ["cream-grid", "pastel-mint", "kraft"];

  const hook: HookData = {
    headline: (data.hook?.headline || `${params.productName} ไอเทมที่ต้องมี!`).slice(0, 32),
    subheadline: data.hook?.subheadline || `ป้ายยาวันนี้ ราคาดีเกินต้าน`,
    badgeText: data.hook?.badgeText || "🔥 ของมันต้องมี",
    highlightWord: data.hook?.highlightWord,
    paperTheme: data.hook?.paperTheme || "kraft",
    durationSec: Number(data.hook?.durationSec) || 3,
  };

  const rawScenes = Array.isArray(data.scenes) && data.scenes.length > 0 ? data.scenes : [];
  let prevLayout: SceneLayout = "callout-circle";

  const scenes: SceneData[] = rawScenes.map((s: any, idx: number) => {
    const smart = deriveIntelligentBenefits(params.productName, params.highlights, idx);
    let desc = s.highlightDesc || "";
    if (!desc || desc.includes(params.price)) {
      desc = smart.desc;
    }

    // Ensure alternating layouts so no adjacent scenes duplicate layout
    let layout: SceneLayout = s.layout || layouts[idx % layouts.length];
    if (layout === prevLayout) {
      layout = layouts[(layouts.indexOf(layout) + 1) % layouts.length];
    }
    prevLayout = layout;

    const paperTheme: PaperTheme = s.paperTheme || themes[idx % themes.length];

    return {
      highlightTitle: (s.highlightTitle || `จุดเด่นที่น่าสนใจ`).slice(0, 30),
      highlightDesc: desc.slice(0, 35),
      stickerText:
        s.stickerText ||
        (idx === 0 ? "✨ ไฮไลท์เด็ด" : idx === 1 ? "👍 คุณภาพพรีเมียม" : "🏷️ คุ้มค่าที่สุด"),
      highlightWord: s.highlightWord,
      layout,
      paperTheme,
      imageIndex: typeof s.imageIndex === "number" ? s.imageIndex : idx,
      durationSec: Number(s.durationSec) || (rawScenes.length === 2 ? 4.5 : 3),
    };
  });

  if (scenes.length === 0) {
    scenes.push(
      {
        highlightTitle: "คุณภาพพรีเมียมเกินราคา",
        highlightDesc: "วัสดุเกรดดี แข็งแรงทนทาน",
        stickerText: "✨ คุ้มค่าที่สุด",
        layout: "hero-center",
        paperTheme: "cream-grid",
        imageIndex: 0,
        durationSec: 4.5,
      },
      {
        highlightTitle: "ดีไซน์สวย ตรงปกไม่จกตา",
        highlightDesc: "พกพาง่าย คุมโทนทุกมุม",
        stickerText: "👍 สวยตรงปก",
        layout: "polaroid-stack",
        paperTheme: "pastel-mint",
        imageIndex: 1,
        durationSec: 4.5,
      }
    );
  }

  const cta: CTAData = {
    ctaTitle: data.cta?.ctaTitle || "จิ้มตะกร้าส้มซ้ายล่างด่วน!",
    ctaSubtitle: data.cta?.ctaSubtitle || "เก็บโค้ดส่งฟรี + คูปองลดเพิ่มทันที",
    buttonText: data.cta?.buttonText || "ช้อปเลยที่ Shopee",
    badgeText: data.cta?.badgeText || "⚡ สิทธิ์มีจำนวนจำกัด",
    basketNote: data.cta?.basketNote || "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    paperTheme: data.cta?.paperTheme || "halftone-orange",
    durationSec: Number(data.cta?.durationSec) || 3,
  };

  const theme = {
    primaryColor: styleDNA.primaryColor || "#EE4D2D",
    accentColor: styleDNA.accentColor || "#FFD23F",
    bgColor: styleDNA.bgColor || "#FFF4E0",
    textColor: "#1B1B1B",
    styleName: `Paper Collage (${styleDNA.pack})`,
  };

  const audioSuggestion = {
    mood: data.audioSuggestion?.mood || "ตื่นเต้น เร่งเร้า ชวนช้อป",
    musicGenre: data.audioSuggestion?.musicGenre || "TikTok Upbeat Affiliate Beat",
    soundEffectTips:
      data.audioSuggestion?.soundEffectTips ||
      "เสียง Paper Slap ตอนเปลี่ยนฉาก และ Cash Ding ตอนโชว์ราคา",
  };

  let narrationScript = data.narrationScript?.trim();
  if (!narrationScript) {
    narrationScript = buildNaturalNarrationText(params.productName, params.price, scenes, cta);
  }

  return { hook, scenes, cta, theme, audioSuggestion, narrationScript, styleDNA };
}



function generateFallbackStoryboard(
  params: ScriptGenerationParams,
  styleDNA: StyleDNA
): StoryboardPlan {
  // Rich pack & hook formula phrase bank (>= 5 options per formula)
  const hookPhrases: Record<string, string[]> = {
    question: [
      `ใครยังใช้แบบเดิมอยู่? ต้องลอง ${params.productName}`,
      `ทำไมเพิ่งมาเจอสิ่งนี้? ${params.productName}`,
      `กำลังหาตัวช่วยอยู่มั้ย? ชิ้นนี้ตอบโจทย์!`,
      `คุ้มจริงมั้ย? มาดู ${params.productName} กัน`,
      `มีใครเคยเห็นสิ่งนี้ยัง? โคตรดี!`,
    ],
    pov: [
      `POV: เมื่อได้ลอง ${params.productName} ครั้งแรก`,
      `POV: ชีวิตง่ายขึ้นเยอะตั้งแต่มีชิ้นนี้`,
      `POV: ของดีบอกต่อ ชิ้นเดียวจบ`,
      `POV: ป้ายยาตามรีวิว ไม่คิดว่าจะดีขนาดนี้`,
      `POV: สั่งมาใช้เองแล้วชอบมากกก`,
    ],
    "price-shock": [
      `ราคาแค่นี้จริงดิ?! ${params.productName}`,
      `ตกใจราคาวันนี้ ลดแรงแซงทุกดีล!`,
      `กำแบงก์ร้อยมีทอน คุ้มเกินคาด`,
      `ราคาหลักร้อย คุณภาพหลักพัน`,
      `โปรช็อกโลกวันเดียวเท่านั้น!`,
    ],
    "listicle-number": [
      `3 เหตุผลที่ต้องมี ${params.productName}`,
      `รวมจุดเด่น ทำไมใครๆ ก็ใช้ตัวนี้`,
      `3 ข้อดีที่ทำให้ต้องรีบกดสั่ง`,
      `เปิดกรุ 3 ฟังก์ชันเด็ดห้ามพลาด`,
      `3 เหตุผลที่รีวิวแน่นตลอดกาล`,
    ],
    secret: [
      `ไอเทมลับที่คนถามเยอะมาก!`,
      `ของดีที่ไม่มีใครยอมบอก!`,
      `เปิดวาร์ปไอเทมเด็ดช้อปปี้`,
      `ความลับของคนชอบความคุ้มค่า`,
      `เจอของดีในช้อปปี้ ต้องรีบเซฟ!`,
    ],
    "relatable-pain": [
      `หยุดปัญหาเดิมๆ ด้วย ${params.productName}`,
      `หมดปัญหาซ้ำซาก ชิ้นนี้ช่วยได้จริง`,
      `เบื่อมั้ยกับของเดิมๆ? เปลี่ยนมาใช้ตัวนี้`,
      `ตัวช่วยกู้ชีวิต ใช้งานง่ายสุดๆ`,
      `ปัญหาหมดไป แค่มีชิ้นนี้ติดไว้`,
    ],
    seasonal: [
      `ไอเทมประจำซีซั่นนี้ที่ต้องมี!`,
      `เปิดเทอมนี้ต้องจัด ${params.productName}`,
      `ของมันต้องมีในฤดูนี้ ดีงามมาก`,
      `รับลมร้อน/ฝน ด้วยไอเทมสุดฮิต`,
      `เทรนด์ฮิตตอนนี้ ตัวนี้มาแรงสุด`,
    ],
    reaction: [
      `ไม่คิดว่าจะดีขนาดนี้! ${params.productName}`,
      `เกินคาดมากกก ตรงปกสุดๆ`,
      `กรี๊ดมาก ได้มาแล้วชอบเลย`,
      `ว้าวเลย ลองแล้วรักมาก`,
      `สมคำร่ำลือ ตัวดังในตำนาน!`,
    ],
  };

  const packBadges: Record<string, string> = {
    "comic-popart": "💥 BAM! ปังมาก",
    "zine-newspaper": "📰 ข่าวด่วนวันนี้",
    "supermarket-flyer": "🔥 ด่วนลดพิเศษ",
    "soft-kawaii": "✨ คิ้วท์มากใจฟู",
    "notebook-doodle": "✏️ จดลิสต์ด่วน",
    "pinboard-corkboard": "📌 ปักหมุดไอเทมเด็ด",
    "sticker-bomb": "⚡ ไม่ซื้อคือพลาด",
    "kraft-scrapbook": "🏷️ ของดีบอกต่อ",
  };

  const hookList = hookPhrases[styleDNA.hookFormula] || hookPhrases.question;
  const hookTitle = hookList[Math.floor(Math.random() * hookList.length)];
  const hookBadge = packBadges[styleDNA.pack] || "🔥 ป้ายยาไอเทมเด็ด";

  const count = Math.max(2, Math.min(params.imageCount || 3, 3));
  const scenes: SceneData[] = [];

  const splitHighlights = params.highlights
    .split(/[,.\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const layouts = styleDNA.layouts || ["hero-center", "polaroid-stack", "callout-circle"];
  const themes: PaperTheme[] = ["cream-grid", "pastel-mint", "kraft"];

  for (let i = 0; i < count; i++) {
    const smart = deriveIntelligentBenefits(params.productName, params.highlights, i);
    const rawTitle =
      splitHighlights[i] ||
      smart.title;
    const cleanTitle = rawTitle.length > 24 ? rawTitle.substring(0, 24) : rawTitle;
    const cleanDesc = smart.desc.length > 35 ? smart.desc.substring(0, 35) : smart.desc;

    scenes.push({
      highlightTitle: cleanTitle,
      highlightDesc: cleanDesc,
      stickerText:
        i === 0 ? "✨ ไฮไลท์เด็ด" : i === 1 ? "👍 สวยตรงปก" : "🏷️ คุ้มค่าที่สุด",
      highlightWord: smart.word || (i === 0 ? "ครบจบ" : i === 1 ? "ตรงปก" : "คุ้มค่า"),
      layout: layouts[i % layouts.length],
      paperTheme: themes[i % themes.length],
      imageIndex: i,
      durationSec: count === 2 ? 4.5 : 3,
    });
  }

  const cta: CTAData = {
    ctaTitle: params.ctaText || "จิ้มตะกร้าส้มซ้ายล่างด่วน!",
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่มเฉพาะคลิปนี้",
    buttonText: "ช้อปเลยที่ Shopee",
    badgeText: "⚡ โค้ดมีจำนวนจำกัด",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    paperTheme: "halftone-orange",
    durationSec: 3,
  };

  const narrationScript = buildNaturalNarrationText(params.productName, params.price, scenes, cta);

  return {
    hook: {
      headline: hookTitle.slice(0, 30),
      subheadline: "ของดีตรงปก บอกเลยว่าห้ามพลาด",
      badgeText: hookBadge,
      highlightWord: "ตัวดัง",
      paperTheme: "kraft",
      durationSec: 3,
    },
    scenes,
    cta,
    theme: {
      primaryColor: styleDNA.primaryColor || "#EE4D2D",
      accentColor: styleDNA.accentColor || "#FFD23F",
      bgColor: styleDNA.bgColor || "#FFF4E0",
      textColor: "#1B1B1B",
      styleName: `Paper Collage (${styleDNA.pack})`,
    },
    audioSuggestion: {
      mood: "จังหวะสนุกสนาน กระตุ้นการตัดสินใจ (Upbeat TikTok Dance)",
      musicGenre: "Viral Shopee Beat",
      soundEffectTips: "เสียง Paper Slap ตอนเปิดตัว และ Cash Ding ตอนโชว์ราคาพิเศษ",
    },
    narrationScript,
    styleDNA,
  };
}
