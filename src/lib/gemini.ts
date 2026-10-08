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
import { splitSafeThaiLines, validateLine } from "../../remotion/lib/thaiKeep";

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
2. READABILITY & MANDATORY PRE-SPLIT LINES (PART E SPECIFICATION):
   - Every headline and caption MUST be pre-split by you into semantic lines:
     * "headlineLines": array of 1 to 2 strings. Max 14 Thai characters per line. Minimum 4 characters!
     * "captionLines": array of 1 to 2 strings. Max 18 Thai characters per line. Minimum 4 characters!
   - STRICT RULES FOR LINE SPLITTING:
     * Cut ONLY at natural semantic phrase boundaries (ขอบของวลีตามความหมาย)
     * NEVER cut in the middle of a word! (e.g. NEVER "เปิดวาร์ปไอเท" / "มเด็ดช้อปปี้", MUST BE "เปิดวาร์ป" / "ไอเทมเด็ดช้อปปี้")
     * NEVER split contiguous phrases! Phrases that MUST stay intact together: "บอกเลย", "ตรงปก", "ห้ามพลาด", "ไอเทมเด็ด", "ส่งฟรี", "ตะกร้าส้ม", "ของแท้", "คุ้มมาก", "ลดแรง", "ตัวดัง", "พิกัด"
     * NEVER start or end a line with orphan letters, tone marks, or dependent vowels (e.g. no line starting with "ม", "ป", "ะ", "ๆ")
   - Headline and Subtitle MUST be strictly distinct within the same scene (Headline ≠ Subtitle).
   - Price placement: Mention the price ONLY in the CTA scene. Do not repeat price in previous scenes!
3. COMPLIANCE & FACT GROUNDING:
   - Use ONLY facts explicitly provided in Verified Facts or Product Name. DO NOT invent false ingredients, functions, or results.
   - For baby, health, beauty products: STRICTLY PROHIBIT medical claims and 100% guarantees (e.g. NEVER say "ปลอดภัย 100%", "ไม่ระคายเคืองแน่นอน", "รักษา/ป้องกันโรค", "ดีกว่ายี่ห้ออื่น").
   - Claims like "ออร์แกนิค" may only be used if they appear directly in the product title or verified facts.
   - If a Promo Tag is present (e.g. "${params.promoTag || ''}"), it may be used as badge text or sticker text.
4. BESPOKE PRO STICKER BADGES & BENEFIT HEADLINES:
   - STRICTLY FORBIDDEN CHEAP CLICHES: NEVER use lazy generic filler phrases like "ไฮไลท์เด็ด", "สวยตรงปก", "คุ้มค่าที่สุด", "ดีงามมาก", "คุณภาพพรีเมียม", "เด็ดจริง"
   - NO ENUMERATIONS: NEVER copy list numbers like "1)", "2.", "1-", "จุดเด่นที่ 1" into titles, stickers, or captions! Convert raw specs into crisp benefits.
   - "stickerText" MUST be a bespoke, high-trust tag with 1 relevant emoji tailored to the product's actual category:
     * Baby/Mom: "🌿 ออร์แกนิคบริสุทธิ์", "👶 สบายผิวลูกน้อย", "🛡️ ปลอดภัยไร้สารเคมี", "สูตรแพทย์ผิวหนัง", "ซึมไวไม่เหนอะ"
     * Skincare/Beauty: "💧 ล็อกความชุ่มชื้น", "✨ บำรุงล้ำลึก", "ฟื้นฟูผิวเร่งด่วน", "เนื้อสัมผัสบางเบา", "รีวิว 5 ดาวแน่น"
     * Tumbler/Kitchen: "❄️ เก็บเย็น 24 ชม.", "สแตนเลส 316 แท้", "ฝาล็อกแน่นไม่หก", "Food Grade ปลอดภัย"
     * IT/Gadget: "🎧 เสียงเบสทรงพลัง", "⚡ แบตอึดใช้งานยาว", "บลูทูธ 5.3 เสถียร", "น้ำหนักเบาพกง่าย"
     * Fashion: "ผ้านุ่มใส่สบาย", "คัตติ้งเนี้ยบเป๊ะ", "ทรงสวยแมตช์ง่าย"
   - Every stickerText should be 2-4 Thai words + 1 emoji (e.g. "🌿 อ่อนโยนต่อลูก").

Return ONLY a valid JSON object matching this schema:
{
  "hook": {
    "headline": "Full punchy Thai hook headline (max 24 chars)",
    "headlineLines": ["Line 1 (<= 14 chars)", "Line 2 (<= 14 chars)"],
    "subheadline": "Catchy intrigue subtitle (max 28 chars)",
    "captionLines": ["Line 1 (<= 18 chars)", "Line 2 (<= 18 chars)"],
    "badgeText": "Badge tag with emoji",
    "highlightWord": "Word to highlight with marker",
    "paperTheme": "kraft",
    "durationSec": 3
  },
  "scenes": [
    {
      "highlightTitle": "Key feature title (max 24 chars)",
      "headlineLines": ["Line 1 (<= 14 chars)", "Line 2 (<= 14 chars)"],
      "highlightDesc": "Distinct benefit without repeating price (max 28 chars)",
      "captionLines": ["Line 1 (<= 18 chars)", "Line 2 (<= 18 chars)"],
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
    "headlineLines": ["จิ้มตะกร้าส้ม", "ซ้ายล่างเลย!"],
    "ctaSubtitle": "Incentive like free shipping or coupon",
    "captionLines": ["เก็บโค้ดส่งฟรี", "ลดเพิ่มทันที"],
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

      let currentPrompt = `${systemPrompt}\n\n${userContent}`;
      let parsedStoryboard: any = null;

      // Generation loop with up to 2 retry attempts if line breaking or character limits fail
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: currentPrompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.95,
          },
        });

        const responseText = response.text?.trim() || "";
        if (!responseText) continue;

        try {
          const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          const parsed = JSON.parse(cleaned);

          // Check if any lines exceed limits or break forbidden words
          const violations = checkLineViolations(parsed);
          if (violations.length === 0 || attempt === 2) {
            parsedStoryboard = parsed;
            break;
          }

          // Re-prompt Gemini to shorten the offending lines
          currentPrompt = `${systemPrompt}\n\n${userContent}\n\nCORRECTION REQUIRED:
The previous response had lines that violated character length or phrase boundary rules:
${violations.map((v) => `- ${v}`).join("\n")}
Please rewrite these lines shorter (headlineLines <= 14 chars/line, captionLines <= 18 chars/line) without cutting middle of words or separating phrases. Return full JSON.`;
        } catch {
          // JSON parse failed, try next attempt
        }
      }

      if (parsedStoryboard) {
        return validateAndNormalizeStoryboard(parsedStoryboard, params, styleDNA);
      }
    } catch (error) {
      console.warn("Gemini API call failed, falling back to intelligent template:", error);
    }
  }

  // Fallback template generator when API key is not yet set or API failed
  return generateFallbackStoryboard(params, styleDNA);
}

/**
 * Checks for line length and boundary violations in parsed storyboard
 */
function checkLineViolations(parsed: any): string[] {
  const violations: string[] = [];

  const check = (lines: any, maxChars: number, label: string) => {
    if (Array.isArray(lines)) {
      lines.forEach((l, idx) => {
        if (typeof l === "string") {
          const res = validateLine(l, maxChars, 4);
          if (!res.valid) {
            violations.push(`${label} Line ${idx + 1} ("${l}"): ${res.reason}`);
          }
        }
      });
    }
  };

  if (parsed?.hook?.headlineLines) check(parsed.hook.headlineLines, 14, "Hook Headline");
  if (parsed?.hook?.captionLines) check(parsed.hook.captionLines, 18, "Hook Caption");

  if (Array.isArray(parsed?.scenes)) {
    parsed.scenes.forEach((s: any, idx: number) => {
      if (s.headlineLines) check(s.headlineLines, 14, `Scene ${idx + 1} Headline`);
      if (s.captionLines) check(s.captionLines, 18, `Scene ${idx + 1} Caption`);
    });
  }

  if (parsed?.cta?.headlineLines) check(parsed.cta.headlineLines, 14, "CTA Headline");
  if (parsed?.cta?.captionLines) check(parsed.cta.captionLines, 18, "CTA Caption");

  return violations;
}

interface BenefitItem {
  title: string;
  headlineLines: string[];
  desc: string;
  captionLines: string[];
  word: string;
  stickerText: string;
}

function deriveIntelligentBenefits(
  productName: string,
  highlights: string,
  index: number
): BenefitItem {
  const combined = `${productName} ${highlights}`.toLowerCase();

  // 1. หมวดแม่และเด็ก / ผลิตภัณฑ์สำหรับทารก (Baby & Mother)
  if (
    combined.includes("ลูก") ||
    combined.includes("เด็ก") ||
    combined.includes("ผ้าอ้อม") ||
    combined.includes("ทารก") ||
    combined.includes("baby") ||
    combined.includes("diaper") ||
    combined.includes("ผดผื่น") ||
    combined.includes("แม่") ||
    combined.includes("mama")
  ) {
    const list: BenefitItem[] = [
      {
        title: "สูตรอ่อนโยน ไม่แพ้ระคายเคือง",
        headlineLines: ["สูตรอ่อนโยน", "ไม่แพ้ระคายเคือง"],
        desc: "ผ่านการทดสอบ ปลอดภัยต่อผิวบอบบางของลูกน้อย",
        captionLines: ["ผ่านการทดสอบ", "ผิวบอบบางใช้ได้"],
        word: "อ่อนโยน",
        stickerText: "🌿 ออร์แกนิคบริสุทธิ์",
      },
      {
        title: "ลดผดผื่น สบายผิวลูกน้อย",
        headlineLines: ["ลดผดผื่นคัน", "สบายผิวลูกน้อย"],
        desc: "เนื้อซึมไว ไม่เหนียวเหนอะหนะ สบายตัวตลอดวัน",
        captionLines: ["เนื้อซึมไว", "ไม่เหนอะหนะลูก"],
        word: "สบายผิว",
        stickerText: "👶 ปลอบประโลมผิว",
      },
      {
        title: "เติมความชุ่มชื้น ปกป้องยาวนาน",
        headlineLines: ["เติมความชุ่มชื้น", "ปกป้องผิวยาวนาน"],
        desc: "สารสกัดธรรมชาติ เสริมเกราะป้องกันผิวบอบบาง",
        captionLines: ["สารสกัดธรรมชาติ", "คุณแม่ไว้วางใจ"],
        word: "ปกป้องผิว",
        stickerText: "🛡️ เสริมเกราะผิว",
      },
    ];
    return list[index % list.length];
  }

  // 2. หมวดน้ำหอมและความมั่นใจ (Perfume & Fragrance)
  if (
    combined.includes("หอม") ||
    combined.includes("น้ำหอม") ||
    combined.includes("perfume") ||
    combined.includes("เซ็กซี่")
  ) {
    const list: BenefitItem[] = [
      {
        title: "หอมติดทน เซ็กซี่ดึงดูด",
        headlineLines: ["หอมติดทน", "เซ็กซี่ดึงดูด"],
        desc: "กลิ่นหอมมีเสน่ห์ เพิ่มความมั่นใจตลอดวัน",
        captionLines: ["กลิ่นหอมมีเสน่ห์", "เพิ่มความมั่นใจ"],
        word: "หอมติดทน",
        stickerText: "🌸 หอมติดทนนาน",
      },
      {
        title: "กลิ่นเอกลักษณ์ ไม่ฉุน",
        headlineLines: ["กลิ่นเอกลักษณ์", "ไม่ฉุนเตะจมูก"],
        desc: "ละมุนมีระดับ ใครได้กลิ่นก็ต้องทัก",
        captionLines: ["ละมุนมีระดับ", "ใครได้กลิ่นก็ทัก"],
        word: "ไม่ฉุน",
        stickerText: "✨ กลิ่นมีระดับ",
      },
      {
        title: "ของแท้ การันตีตรงปก",
        headlineLines: ["ของแท้การันตี", "ตรงปกไม่จกตา"],
        desc: "กลิ่นฟุ้งกระจาย ฉีดได้ทุกวัน",
        captionLines: ["กลิ่นฟุ้งกระจาย", "ฉีดได้ทุกวัน"],
        word: "ตรงปก",
        stickerText: "💎 การันตีของแท้",
      },
    ];
    return list[index % list.length];
  }

  // 3. หมวดผิวและความงาม (Skincare & Beauty)
  if (
    combined.includes("ผิว") ||
    combined.includes("ครีม") ||
    combined.includes("เซรั่ม") ||
    combined.includes("หน้าใส") ||
    combined.includes("สิว") ||
    combined.includes("บำรุง") ||
    combined.includes("กันแดด")
  ) {
    const list: BenefitItem[] = [
      {
        title: "บำรุงล้ำลึก ผิวดูอิ่มฟู",
        headlineLines: ["บำรุงล้ำลึก", "ผิวดูอิ่มฟู"],
        desc: "ฟื้นฟูผิวเร่งด่วน ผิวสุขภาพดีอย่างเป็นธรรมชาติ",
        captionLines: ["ฟื้นฟูผิวเร่งด่วน", "ผิวสุขภาพดีจริง"],
        word: "ผิวอิ่มฟู",
        stickerText: "💧 บำรุงล้ำลึก",
      },
      {
        title: "อ่อนโยน ซึมไว ไม่เหนอะ",
        headlineLines: ["อ่อนโยนซึมไว", "ไม่เหนอะหนะ"],
        desc: "เนื้อบางเบา สบายผิว ไม่ระคายเคือง",
        captionLines: ["เนื้อบางเบา", "สบายผิวไม่แพ้"],
        word: "ซึมไว",
        stickerText: "✨ สัมผัสบางเบา",
      },
      {
        title: "เห็นผลจริง ลูกค้าซื้อซ้ำ",
        headlineLines: ["เห็นผลจริง", "ลูกค้าซื้อซ้ำ"],
        desc: "รีวิวแน่น ใช้ต่อเนื่องผิวยิ่งกระจ่างใส",
        captionLines: ["รีวิวแน่นมาก", "ผิวยิ่งกระจ่างใส"],
        word: "เห็นผลจริง",
        stickerText: "🌿 สูตรอ่อนโยน",
      },
    ];
    return list[index % list.length];
  }

  // 4. หมวดแฟชั่นและเครื่องแต่งกาย (Fashion & Apparel)
  if (
    combined.includes("ผ้า") ||
    combined.includes("เสื้อ") ||
    combined.includes("กางเกง") ||
    combined.includes("รองเท้า") ||
    combined.includes("กระเป๋า") ||
    combined.includes("แฟชั่น")
  ) {
    const list: BenefitItem[] = [
      {
        title: "ผ้านุ่ม ใส่สบาย ระบายอากาศ",
        headlineLines: ["ผ้านุ่มใส่สบาย", "ระบายอากาศดี"],
        desc: "คัตติ้งเนี้ยบ ทรงสวย แมตช์ง่ายทุกลุค",
        captionLines: ["คัตติ้งเนี้ยบ", "ทรงสวยแมตช์ง่าย"],
        word: "นุ่มสบาย",
        stickerText: "☁️ ผ้านุ่มใส่สบาย",
      },
      {
        title: "ดีไซน์ทันสมัย ดูดีมีสไตล์",
        headlineLines: ["ดีไซน์ทันสมัย", "ดูดีมีสไตล์"],
        desc: "ใส่ได้ทุกโอกาส มั่นใจทุกการเคลื่อนไหว",
        captionLines: ["ใส่ได้ทุกโอกาส", "มั่นใจทุกการขยับ"],
        word: "ทรงสวย",
        stickerText: "✂️ คัตติ้งเนี้ยบเป๊ะ",
      },
      {
        title: "งานเย็บประณีต ทนทาน",
        headlineLines: ["งานเย็บประณีต", "ทนทานตรงปก"],
        desc: "ของจริงตรงปก คุณภาพเกินราคา",
        captionLines: ["ของจริงตรงปก", "คุณภาพเกินราคา"],
        word: "ตรงปก",
        stickerText: "✨ ทรงสวยแมตช์ง่าย",
      },
    ];
    return list[index % list.length];
  }

  // 5. หมวดอุปกรณ์ไอทีและหูฟัง (Gadgets & Electronics)
  if (
    combined.includes("หูฟัง") ||
    combined.includes("บลูทูธ") ||
    combined.includes("แบต") ||
    combined.includes("เสียง") ||
    combined.includes("สายชาร์จ") ||
    combined.includes("gadget") ||
    combined.includes("ไอที")
  ) {
    const list: BenefitItem[] = [
      {
        title: "เสียงคมชัด เบสแน่นสะใจ",
        headlineLines: ["เสียงคมชัด", "เบสแน่นสะใจ"],
        desc: "ตัดเสียงรบกวนรอบข้าง ฟังเพลงเพลินไม่มีสะดุด",
        captionLines: ["ตัดเสียงรบกวน", "ฟังเพลินไม่สะดุด"],
        word: "เสียงคมชัด",
        stickerText: "🎧 เบสแน่นทรงพลัง",
      },
      {
        title: "แบตเตอรี่อึด ใช้งานได้ยาวนาน",
        headlineLines: ["แบตเตอรี่อึด", "ใช้ได้ยาวนาน"],
        desc: "ชาร์จเร็ว พกพาสะดวก พร้อมลุยทุกที่",
        captionLines: ["ชาร์จเร็วทันใจ", "พร้อมลุยทุกที่"],
        word: "แบตอึด",
        stickerText: "⚡ แบตอึด 40 ชม.",
      },
      {
        title: "เชื่อมต่อง่าย เสถียร ไม่ดีเลย์",
        headlineLines: ["เชื่อมต่อง่าย", "เสถียรไม่ดีเลย์"],
        desc: "รองรับทุกอุปกรณ์ ตอบโจทย์ทุกไลฟ์สไตล์",
        captionLines: ["รองรับทุกเครื่อง", "ตอบโจทย์ทุกวัน"],
        word: "เชื่อมต่อง่าย",
        stickerText: "📶 บลูทูธ 5.3",
      },
    ];
    return list[index % list.length];
  }

  // 6. หมวดแก้วเก็บความเย็นและของใช้ในบ้าน (Tumbler & Kitchenware)
  if (
    combined.includes("แก้ว") ||
    combined.includes("กระติก") ||
    combined.includes("น้ำแข็ง") ||
    combined.includes("สแตนเลส") ||
    combined.includes("tyeso")
  ) {
    const list: BenefitItem[] = [
      {
        title: "เก็บอุณหภูมิยาวนาน 24 ชม.",
        headlineLines: ["เก็บอุณหภูมิ", "ยาวนาน 24 ชม."],
        desc: "สแตนเลสคุณภาพสูง ไอน้ำไม่เกาะโต๊ะ",
        captionLines: ["สแตนเลสคุณภาพดี", "ไอน้ำไม่เกาะโต๊ะ"],
        word: "เก็บอุณหภูมิ",
        stickerText: "❄️ เก็บเย็น 24 ชม.",
      },
      {
        title: "พกพาสะดวก ฝาปิดแน่น",
        headlineLines: ["พกพาสะดวก", "ฝาปิดแน่นสนิท"],
        desc: "ไม่หกเลอะเทอะ ใช้งานง่ายได้ทุกวัน",
        captionLines: ["ไม่หกเลอะเทอะ", "ใช้งานได้ทุกวัน"],
        word: "ไม่หกเลอะ",
        stickerText: "🔒 ฝาล็อกแน่นสนิท",
      },
      {
        title: "ดีไซน์มินิมอล แข็งแรงทนทาน",
        headlineLines: ["สแตนเลสแท้", "แข็งแรงทนทาน"],
        desc: "ทำความสะอาดง่าย ปลอดภัย Food Grade",
        captionLines: ["ทำความสะอาดง่าย", "ปลอดภัย Food Grade"],
        word: "แข็งแรง",
        stickerText: "🛡️ สแตนเลส 316",
      },
    ];
    return list[index % list.length];
  }

  // 7. หมวดอาหาร ขนม และเครื่องดื่ม (Food & Beverage)
  if (
    combined.includes("อาหาร") ||
    combined.includes("ขนม") ||
    combined.includes("อร่อย") ||
    combined.includes("ชา") ||
    combined.includes("กาแฟ") ||
    combined.includes("กิน")
  ) {
    const list: BenefitItem[] = [
      {
        title: "รสชาติเข้มข้น อร่อยกลมกล่อม",
        headlineLines: ["รสชาติเข้มข้น", "อร่อยกลมกล่อม"],
        desc: "คัดสรรวัตถุดิบชั้นดี สะอาด สดใหม่ทุกคำ",
        captionLines: ["คัดสรรวัตถุดิบดี", "สะอาดสดใหม่"],
        word: "รสชาติเข้มข้น",
        stickerText: "😋 รสชาติเข้มข้น",
      },
      {
        title: "ทานเพลิน หยุดไม่อยู่",
        headlineLines: ["ทานเพลิน", "หยุดไม่อยู่"],
        desc: "พกพาสะดวก อิ่มอร่อยได้ทุกที่ทุกเวลา",
        captionLines: ["พกพาสะดวก", "อร่อยได้ทุกที่"],
        word: "อร่อยเพลิน",
        stickerText: "✨ กรอบอร่อยเพลิน",
      },
      {
        title: "สูตรเด็ด ยอดขายการันตี",
        headlineLines: ["สูตรเด็ด", "ยอดขายการันตี"],
        desc: "ของแท้ส่งตรง คุณภาพมาตรฐาน",
        captionLines: ["ของแท้ส่งตรง", "คุณภาพมาตรฐาน"],
        word: "สูตรเด็ด",
        stickerText: "🏅 สะอาดได้มาตรฐาน",
      },
    ];
    return list[index % list.length];
  }

  // 8. หมวดสัตว์เลี้ยง (Pet Supplies)
  if (
    combined.includes("แมว") ||
    combined.includes("หมา") ||
    combined.includes("สัตว์เลี้ยง") ||
    combined.includes("pet") ||
    combined.includes("ทรายแมว")
  ) {
    const list: BenefitItem[] = [
      {
        title: "ปลอดภัยต่อน้อง เกรดพรีเมียม",
        headlineLines: ["ปลอดภัยต่อน้อง", "เกรดพรีเมียม"],
        desc: "ผลิตจากวัสดุธรรมชาติ ไร้สารเคมีอันตราย",
        captionLines: ["วัตถุดิบธรรมชาติ", "ไร้สารเคมีอันตราย"],
        word: "ปลอดภัย",
        stickerText: "🐾 ปลอดภัยต่อน้อง",
      },
      {
        title: "น้องชอบมาก ใช้งานสะดวก",
        headlineLines: ["น้องชอบมาก", "ใช้งานสะดวกจริง"],
        desc: "ออกแบบเพื่อสัตว์เลี้ยง ดูแลง่ายไม่ยุ่งยาก",
        captionLines: ["ออกแบบมาดี", "ดูแลง่ายไม่ยุ่งยาก"],
        word: "ใช้ง่าย",
        stickerText: "🐱 น้องแมวเลิฟมาก",
      },
      {
        title: "คุ้มค่าทนทาน ยอดขายอันดับหนึ่ง",
        headlineLines: ["คุ้มค่าทนทาน", "ทาสรักสิ่งนี้"],
        desc: "รีวิวแน่น คุณภาพคุ้มเกินราคา",
        captionLines: ["รีวิวแน่นมาก", "คุณภาพคุ้มราคา"],
        word: "คุ้มค่า",
        stickerText: "✨ ทาสรักสิ่งนี้",
      },
    ];
    return list[index % list.length];
  }

  // 9. หมวดของใช้ในบ้านและทำความสะอาด (Home & Living)
  if (
    combined.includes("บ้าน") ||
    combined.includes("ทำความสะอาด") ||
    combined.includes("ซักผ้า") ||
    combined.includes("ถูพื้น") ||
    combined.includes("ที่นอน") ||
    combined.includes("หมอน")
  ) {
    const list: BenefitItem[] = [
      {
        title: "สะอาดหมดจด ประหยัดเวลา",
        headlineLines: ["สะอาดหมดจด", "ประหยัดแรง"],
        desc: "ตัวช่วยงานบ้านสุดล้ำ ให้ชีวิตง่ายขึ้นเยอะ",
        captionLines: ["ตัวช่วยงานบ้าน", "ให้ชีวิตง่ายขึ้น"],
        word: "สะอาดหมดจด",
        stickerText: "✨ สะอาดหมดจด",
      },
      {
        title: "วัสดุเกรดพรีเมียม ทนทานยาวนาน",
        headlineLines: ["วัสดุเกรดดี", "ทนทานยาวนาน"],
        desc: "มาตรฐานสากล แข็งแรงคุ้มค่าคุ้มราคา",
        captionLines: ["มาตรฐานสากล", "แข็งแรงทนทาน"],
        word: "ทนทาน",
        stickerText: "🏡 ตอบโจทย์งานบ้าน",
      },
      {
        title: "ดีไซน์คุมโทน สวยเข้ากับบ้าน",
        headlineLines: ["ดีไซน์คุมโทน", "มินิมอลลงตัว"],
        desc: "ใช้งานง่าย วางมุมไหนก็ดูดี",
        captionLines: ["ใช้งานง่าย", "วางมุมไหนก็สวย"],
        word: "มินิมอล",
        stickerText: "🌿 คุมโทนมินิมอล",
      },
    ];
    return list[index % list.length];
  }

  // 10. หมวดวิตามินและอาหารเสริม (Supplements & Health)
  if (
    combined.includes("วิตามิน") ||
    combined.includes("อาหารเสริม") ||
    combined.includes("คอลลาเจน") ||
    combined.includes("โปรตีน") ||
    combined.includes("supplement")
  ) {
    const list: BenefitItem[] = [
      {
        title: "สารสกัดคัดสรร บำรุงตรงจุด",
        headlineLines: ["สารสกัดคัดสรร", "บำรุงตรงจุด"],
        desc: "เข้มข้นคุณภาพสูง ทานง่ายได้ทุกวัน",
        captionLines: ["เข้มข้นคุณภาพดี", "ทานง่ายทุกวัน"],
        word: "บำรุงตรงจุด",
        stickerText: "🌿 สารสกัดคัดพิเศษ",
      },
      {
        title: "ปลอดภัย ได้มาตรฐานรับรอง",
        headlineLines: ["ปลอดภัยมั่นใจ", "มีมาตรฐานรับรอง"],
        desc: "ตรวจสอบได้ คุณภาพระดับพรีเมียม",
        captionLines: ["ตรวจสอบได้", "คุณภาพพรีเมียม"],
        word: "ได้มาตรฐาน",
        stickerText: "🛡️ ปลอดภัยได้มาตรฐาน",
      },
      {
        title: "รีวิวแน่น ผู้ใช้บอกต่อ",
        headlineLines: ["รีวิวแน่นมาก", "ทานต่อเนื่องดีจริง"],
        desc: "สัมผัสความเปลี่ยนแปลงอย่างมั่นใจ",
        captionLines: ["มั่นใจคุณภาพ", "ทานต่อเนื่องดีจริง"],
        word: "รีวิวแน่น",
        stickerText: "✨ รีวิวแน่น 5 ดาว",
      },
    ];
    return list[index % list.length];
  }

  // ค่าตั้งต้นสำหรับสินค้าทั่วไป (Default High-Trust Benefits)
  const defaultList: BenefitItem[] = [
    {
      title: "ฟังก์ชันครบ คุ้มค่าตอบโจทย์",
      headlineLines: ["ฟังก์ชันครบ", "ตอบโจทย์จริง"],
      desc: "ออกแบบมาเพื่อความสะดวกสบายในชีวิตประจำวัน",
      captionLines: ["ออกแบบมาดี", "ใช้งานสะดวกจริง"],
      word: "ตอบโจทย์",
      stickerText: "🏆 ของแท้การันตี",
    },
    {
      title: "วัสดุคุณภาพดี แข็งแรงทนทาน",
      headlineLines: ["วัสดุคุณภาพดี", "แข็งแรงทนทาน"],
      desc: "มาตรฐานการผลิตระดับพรีเมียม ใช้งานได้ยาวนาน",
      captionLines: ["ผลิตได้มาตรฐาน", "ใช้งานได้ยาวนาน"],
      word: "ทนทาน",
      stickerText: "🌟 รีวิวแน่น 5 ดาว",
    },
    {
      title: "ของแท้ส่งตรง การันตีความประทับใจ",
      headlineLines: ["ของแท้ส่งตรง", "ช้อปได้มั่นใจ"],
      desc: "รีวิวแน่น ผู้ใช้จริงบอกต่อ ช้อปได้มั่นใจ",
      captionLines: ["รีวิวแน่นมาก", "ผู้ใช้จริงบอกต่อ"],
      word: "ของแท้",
      stickerText: "⚡ คัดสรรเกรดพรีเมียม",
    },
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

  const rawHookHeadline = (data.hook?.headline || `${params.productName} ไอเทมที่ต้องมี!`)
    .replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "")
    .trim()
    .slice(0, 32);
  const rawHookSubheadline = (data.hook?.subheadline || `ป้ายยาวันนี้ ราคาดีเกินต้าน`)
    .replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "")
    .trim();

  // Normalize hook lines
  let hookHeadlineLines: string[] = Array.isArray(data.hook?.headlineLines) && data.hook.headlineLines.length > 0
    ? data.hook.headlineLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
    : splitSafeThaiLines(rawHookHeadline, 14, 4);

  let hookCaptionLines: string[] = Array.isArray(data.hook?.captionLines) && data.hook.captionLines.length > 0
    ? data.hook.captionLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
    : splitSafeThaiLines(rawHookSubheadline, 18, 4);

  // Validate hook lines
  if (!hookHeadlineLines.every((l) => validateLine(l, 16, 3).valid)) {
    hookHeadlineLines = splitSafeThaiLines(rawHookHeadline, 14, 4);
  }
  if (!hookCaptionLines.every((l) => validateLine(l, 20, 3).valid)) {
    hookCaptionLines = splitSafeThaiLines(rawHookSubheadline, 18, 4);
  }

  const genericBadges = [
    "ไฮไลท์เด็ด",
    "สวยตรงปก",
    "คุ้มค่าที่สุด",
    "คุณภาพพรีเมียม",
    "ของดีตรงปก",
    "ดีงามมาก",
    "เด็ดจริง",
  ];

  const hook: HookData = {
    headline: rawHookHeadline,
    headlineLines: hookHeadlineLines.slice(0, 2),
    subheadline: rawHookSubheadline,
    captionLines: hookCaptionLines.slice(0, 2),
    badgeText: data.hook?.badgeText || "🔥 ป้ายยาไอเทมเด็ด",
    highlightWord: data.hook?.highlightWord,
    paperTheme: data.hook?.paperTheme || "kraft",
    durationSec: Number(data.hook?.durationSec) || 3,
  };

  const rawScenes = Array.isArray(data.scenes) && data.scenes.length > 0 ? data.scenes : [];
  let prevLayout: SceneLayout = "callout-circle";

  const scenes: SceneData[] = rawScenes.map((s: any, idx: number) => {
    const smart = deriveIntelligentBenefits(params.productName, params.highlights, idx);
    let title = (s.highlightTitle || smart.title)
      .replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "")
      .trim()
      .slice(0, 30);
    let desc = (s.highlightDesc || "").replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim();
    if (!desc || desc.includes(params.price)) {
      desc = smart.desc;
    }

    let headlineLines: string[] = Array.isArray(s.headlineLines) && s.headlineLines.length > 0
      ? s.headlineLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
      : splitSafeThaiLines(title, 14, 4);

    let captionLines: string[] = Array.isArray(s.captionLines) && s.captionLines.length > 0
      ? s.captionLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
      : splitSafeThaiLines(desc, 18, 4);

    if (!headlineLines.every((l) => validateLine(l, 16, 3).valid)) {
      headlineLines = splitSafeThaiLines(title, 14, 4);
    }
    if (!captionLines.every((l) => validateLine(l, 20, 3).valid)) {
      captionLines = splitSafeThaiLines(desc, 18, 4);
    }

    let layout: SceneLayout = s.layout || layouts[idx % layouts.length];
    if (layout === prevLayout) {
      layout = layouts[(layouts.indexOf(layout) + 1) % layouts.length];
    }
    prevLayout = layout;

    const paperTheme: PaperTheme = s.paperTheme || themes[idx % themes.length];

    let stickerText = s.stickerText ? String(s.stickerText).trim() : "";
    const cleanSticker = stickerText.replace(/^[^\p{L}\p{N}]+/u, "").trim();
    if (!stickerText || genericBadges.some((b) => cleanSticker.includes(b) || cleanSticker === b)) {
      stickerText = smart.stickerText;
    }

    return {
      highlightTitle: title,
      headlineLines: headlineLines.slice(0, 2),
      highlightDesc: desc.slice(0, 35),
      captionLines: captionLines.slice(0, 2),
      stickerText,
      highlightWord: s.highlightWord || smart.word,
      layout,
      paperTheme,
      imageIndex: typeof s.imageIndex === "number" ? s.imageIndex : idx,
      durationSec: Number(s.durationSec) || (rawScenes.length === 2 ? 4.5 : 3),
    };
  });

  if (scenes.length === 0) {
    const s0 = deriveIntelligentBenefits(params.productName, params.highlights, 0);
    const s1 = deriveIntelligentBenefits(params.productName, params.highlights, 1);
    scenes.push(
      {
        highlightTitle: s0.title,
        headlineLines: s0.headlineLines,
        highlightDesc: s0.desc,
        captionLines: s0.captionLines,
        stickerText: s0.stickerText,
        layout: "hero-center",
        paperTheme: "cream-grid",
        imageIndex: 0,
        durationSec: 4.5,
      },
      {
        highlightTitle: s1.title,
        headlineLines: s1.headlineLines,
        highlightDesc: s1.desc,
        captionLines: s1.captionLines,
        stickerText: s1.stickerText,
        layout: "polaroid-stack",
        paperTheme: "pastel-mint",
        imageIndex: 1,
        durationSec: 4.5,
      }
    );
  }

  const rawCtaTitle = (data.cta?.ctaTitle || "จิ้มตะกร้าส้มซ้ายล่างด่วน!")
    .replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "")
    .trim();
  const rawCtaSubtitle = (data.cta?.ctaSubtitle || "เก็บโค้ดส่งฟรี + คูปองลดเพิ่มทันที")
    .replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "")
    .trim();

  let ctaHeadlineLines: string[] = Array.isArray(data.cta?.headlineLines) && data.cta.headlineLines.length > 0
    ? data.cta.headlineLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
    : splitSafeThaiLines(rawCtaTitle, 14, 4);

  let ctaCaptionLines: string[] = Array.isArray(data.cta?.captionLines) && data.cta.captionLines.length > 0
    ? data.cta.captionLines.map((l: any) => String(l).replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim()).filter(Boolean)
    : splitSafeThaiLines(rawCtaSubtitle, 18, 4);

  const cta: CTAData = {
    ctaTitle: rawCtaTitle,
    headlineLines: ctaHeadlineLines.slice(0, 2),
    ctaSubtitle: rawCtaSubtitle,
    captionLines: ctaCaptionLines.slice(0, 2),
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

interface HookPhraseItem {
  title: string;
  headlineLines: string[];
}

function generateFallbackStoryboard(
  params: ScriptGenerationParams,
  styleDNA: StyleDNA
): StoryboardPlan {
  const combined = `${params.productName} ${params.highlights}`.toLowerCase();
  const isBaby =
    combined.includes("ลูก") ||
    combined.includes("เด็ก") ||
    combined.includes("ผ้าอ้อม") ||
    combined.includes("ทารก") ||
    combined.includes("baby") ||
    combined.includes("diaper") ||
    combined.includes("ผดผื่น") ||
    combined.includes("แม่") ||
    combined.includes("mama");

  const isBeauty =
    !isBaby &&
    (combined.includes("ผิว") ||
      combined.includes("ครีม") ||
      combined.includes("เซรั่ม") ||
      combined.includes("หน้าใส") ||
      combined.includes("สิว") ||
      combined.includes("กันแดด") ||
      combined.includes("บำรุง"));

  const isTumbler =
    combined.includes("แก้ว") ||
    combined.includes("กระติก") ||
    combined.includes("สแตนเลส") ||
    combined.includes("tumbler") ||
    combined.includes("เก็บเย็น");

  const isGadget =
    combined.includes("หูฟัง") ||
    combined.includes("บลูทูธ") ||
    combined.includes("แบต") ||
    combined.includes("เสียง") ||
    combined.includes("สายชาร์จ") ||
    combined.includes("gadget") ||
    combined.includes("ไอที");

  // Rich pack & hook formula phrase bank with pre-split semantic lines (Part E)
  const hookPhrases: Record<string, HookPhraseItem[]> = {
    question: [
      { title: `ใครยังใช้แบบเดิมอยู่? ต้องลอง`, headlineLines: ["ใครยังใช้", "แบบเดิมอยู่?"] },
      { title: `ทำไมเพิ่งมาเจอสิ่งนี้? ดีมาก`, headlineLines: ["ทำไมเพิ่งมาเจอ", "ไอเทมนี้?!"] },
      { title: `กำลังหาตัวช่วยอยู่มั้ย? ชิ้นนี้จบ`, headlineLines: ["กำลังหาตัวช่วย?", "ชิ้นนี้ตอบโจทย์"] },
      { title: `คุ้มจริงมั้ย? มาดูตัวนี้กัน`, headlineLines: ["คุ้มจริงมั้ย?", "มาดูตัวนี้กัน!"] },
      { title: `มีใครเคยเห็นสิ่งนี้ยัง? ดีสุดๆ`, headlineLines: ["มีใครเคยเห็นยัง?", "ดีงามสุดๆ"] },
    ],
    pov: [
      { title: `POV: เมื่อได้ลองใช้ครั้งแรก`, headlineLines: ["POV: เมื่อได้ลอง", "ใช้ครั้งแรก"] },
      { title: `POV: ชีวิตง่ายขึ้นเยอะตั้งแต่มี`, headlineLines: ["POV: ชีวิตง่ายขึ้น", "ตั้งแต่มีชิ้นนี้"] },
      { title: `POV: ของดีบอกต่อ ชิ้นเดียวจบ`, headlineLines: ["POV: ของดีบอกต่อ", "ชิ้นเดียวจบ"] },
      { title: `POV: ป้ายยาตามรีวิว ไม่ผิดหวัง`, headlineLines: ["POV: ป้ายยาตามรีวิว", "ไม่ผิดหวัง"] },
      { title: `POV: สั่งมาใช้เองแล้วชอบมาก`, headlineLines: ["POV: สั่งใช้เอง", "แล้วชอบมากก"] },
    ],
    "price-shock": [
      { title: `ราคาแค่นี้จริงดิ?! ลดแรงมาก`, headlineLines: ["ราคาแค่นี้จริงดิ?!", "ลดแรงเกินต้าน"] },
      { title: `ตกใจราคาวันนี้ ลดแรงแซงทุกดีล`, headlineLines: ["ตกใจราคาวันนี้", "ลดแรงแซงทุกดีล"] },
      { title: `กำแบงก์ร้อยมีทอน คุ้มเกินคาด`, headlineLines: ["กำแบงก์ร้อยมีทอน", "คุ้มเกินคาด"] },
      { title: `ราคาหลักร้อย คุณภาพหลักพัน`, headlineLines: ["ราคาหลักร้อย", "คุณภาพหลักพัน"] },
      { title: `โปรช็อกโลกวันเดียวเท่านั้น!`, headlineLines: ["โปรช็อกโลก", "วันเดียวเท่านั้น!"] },
    ],
    "listicle-number": [
      { title: `3 เหตุผลที่ต้องมีชิ้นนี้ติดบ้าน`, headlineLines: ["3 เหตุผล", "ที่ต้องมีติดบ้าน"] },
      { title: `รวมจุดเด่น ทำไมใครๆ ก็ใช้ตัวนี้`, headlineLines: ["รวมจุดเด่น", "ทำไมใครๆ ก็ใช้"] },
      { title: `3 ข้อดีที่ทำให้ต้องรีบกดสั่ง`, headlineLines: ["3 ข้อดีเด็ด", "ที่ต้องรีบกดสั่ง"] },
      { title: `เปิดกรุ 3 ฟังก์ชันเด็ดห้ามพลาด`, headlineLines: ["เปิดกรุ 3 ฟังก์ชัน", "เด็ดห้ามพลาด"] },
      { title: `3 เหตุผลที่รีวิวแน่นตลอดกาล`, headlineLines: ["3 เหตุผลเด็ด", "ที่รีวิวแน่นมาก"] },
    ],
    secret: [
      { title: `เปิดวาร์ปไอเทมเด็ดช้อปปี้`, headlineLines: ["เปิดวาร์ป", "ไอเทมเด็ดช้อปปี้"] },
      { title: `ของดีที่ไม่มีใครยอมบอก!`, headlineLines: ["ของดีตรงปก", "ที่ไม่มีใครบอก!"] },
      { title: `ไอเทมลับที่คนถามเยอะมาก!`, headlineLines: ["ไอเทมลับ", "คนถามเยอะมาก!"] },
      { title: `ความลับของคนชอบความคุ้มค่า`, headlineLines: ["ความลับ", "ของคนชอบความคุ้ม"] },
      { title: `เจอของดีในช้อปปี้ ต้องรีบเซฟ!`, headlineLines: ["เจอของดีช้อปปี้", "ต้องรีบเซฟไว้!"] },
    ],
    "relatable-pain": [
      { title: `หยุดปัญหาเดิมๆ ชิ้นนี้ช่วยได้`, headlineLines: ["หยุดปัญหาเดิมๆ", "ชิ้นนี้ช่วยได้"] },
      { title: `หมดปัญหาซ้ำซาก ชิ้นนี้ช่วยได้จริง`, headlineLines: ["หมดปัญหาซ้ำซาก", "ช่วยได้จริง"] },
      { title: `เบื่อมั้ยกับของเดิมๆ? ต้องลอง`, headlineLines: ["เบื่อของเดิมๆ?", "ลองตัวนี้เลย"] },
      { title: `ตัวช่วยกู้ชีวิต ใช้งานง่ายสุดๆ`, headlineLines: ["ตัวช่วยกู้ชีวิต", "ใช้งานง่ายสุดๆ"] },
      { title: `ปัญหาหมดไป แค่มีชิ้นนี้ติดไว้`, headlineLines: ["ปัญหาหมดไป", "แค่มีชิ้นนี้"] },
    ],
    seasonal: [
      { title: `ไอเทมประจำซีซั่นนี้ที่ต้องมี!`, headlineLines: ["ไอเทมประจำซีซั่น", "ที่ต้องมี!"] },
      { title: `เปิดเทอมนี้ต้องจัด ดีลดีสุดๆ`, headlineLines: ["เปิดเทอมนี้ต้องจัด", "ดีลดีสุดๆ"] },
      { title: `ของมันต้องมีในฤดูนี้ ดีงามมาก`, headlineLines: ["ของมันต้องมี", "ดีงามมาก"] },
      { title: `รับลมร้อนด้วยไอเทมสุดฮิต`, headlineLines: ["รับลมร้อน", "ด้วยไอเทมสุดฮิต"] },
      { title: `เทรนด์ฮิตตอนนี้ ตัวนี้มาแรงสุด`, headlineLines: ["เทรนด์ฮิตตอนนี้", "ตัวนี้มาแรงสุด"] },
    ],
    reaction: [
      { title: `ของดีตรงปก บอกเลยว่าห้ามพลาด`, headlineLines: ["ของดีตรงปก", "บอกเลยว่าห้ามพลาด"] },
      { title: `ไม่คิดว่าจะดีขนาดนี้! ว้าวมาก`, headlineLines: ["ไม่คิดว่า", "จะดีขนาดนี้!"] },
      { title: `เกินคาดมากกก ตรงปกสุดๆ`, headlineLines: ["เกินคาดมากกก", "ตรงปกสุดๆ"] },
      { title: `กรี๊ดมาก ได้มาแล้วชอบเลย`, headlineLines: ["กรี๊ดมาก", "ได้มาแล้วชอบเลย"] },
      { title: `สมคำร่ำลือ ตัวดังในตำนาน!`, headlineLines: ["สมคำร่ำลือ", "ตัวดังในตำนาน!"] },
    ],
  };

  const babyHooks: HookPhraseItem[] = [
    { title: "คุณแม่ต้องมี! ไอเทมคู่ใจลูกน้อย", headlineLines: ["คุณแม่ต้องมี!", "ไอเทมลูกน้อย"] },
    { title: "ลูกน้อยสบายตัว คุณแม่หมดกังวล", headlineLines: ["ลูกน้อยสบายตัว", "คุณแม่หมดห่วง"] },
    { title: "ตัวช่วยดูแลลูก อ่อนโยนขั้นสุด", headlineLines: ["ตัวช่วยดูแลลูก", "อ่อนโยนขั้นสุด"] },
    { title: "ป้ายยาไอเทมเด็ก ปลอดภัยตรงปก", headlineLines: ["ป้ายยาไอเทมเด็ก", "ปลอดภัยตรงปก"] },
  ];

  const babySubheadlines = [
    { subheadline: "สูตรอ่อนโยน ผ่านการทดสอบจากแพทย์", captionLines: ["สูตรอ่อนโยน", "ผ่านการทดสอบ"] },
    { subheadline: "ดูแลผิวบอบบาง ปลอดภัยไร้กังวล", captionLines: ["ดูแลผิวบอบบาง", "ปลอดภัยไร้กังวล"] },
    { subheadline: "รีวิวคุณแม่แน่น ใช้ดีบอกต่อจริง", captionLines: ["รีวิวคุณแม่แน่น", "ใช้ดีบอกต่อจริง"] },
  ];

  const beautyHooks: HookPhraseItem[] = [
    { title: "กู้ผิวโทรมเร่งด่วน ผิวใสสุขภาพดี", headlineLines: ["กู้ผิวโทรมด่วน", "ผิวใสสุขภาพดี"] },
    { title: "เคล็ดลับผิวใส ตัวนี้คือที่สุด!", headlineLines: ["เคล็ดลับผิวใส", "ตัวนี้คือที่สุด!"] },
    { title: "ป้ายยาสกินแคร์ตัวดัง ใช้แล้วรักเลย", headlineLines: ["สกินแคร์ตัวดัง", "ใช้แล้วรักเลย"] },
  ];

  const beautySubheadlines = [
    { subheadline: "บำรุงล้ำลึก ฟื้นฟูผิวขั้นสุด", captionLines: ["บำรุงล้ำลึก", "ฟื้นฟูผิวขั้นสุด"] },
    { subheadline: "รีวิวแน่นมาก ใช้ต่อเนื่องผิวปัง", captionLines: ["รีวิวแน่นมาก", "ใช้ต่อเนื่องผิวปัง"] },
  ];

  const fallbackSubheadlines = [
    { subheadline: "ของดีตรงปก บอกเลยว่าห้ามพลาด", captionLines: ["ของดีตรงปก", "บอกเลยว่าห้ามพลาด"] },
    { subheadline: "พิกัดของแท้ตรงปก รีบสั่งด่วน", captionLines: ["พิกัดของแท้", "ตรงปกสั่งด่วน"] },
    { subheadline: "ไอเทมเด็ดช้อปปี้ ต้องมีติดบ้าน", captionLines: ["ไอเทมเด็ดช้อปปี้", "ต้องมีติดบ้าน"] },
    { subheadline: "รีวิวแน่น ผู้ใช้จริงบอกต่อ", captionLines: ["รีวิวแน่น", "ผู้ใช้จริงบอกต่อ"] },
    { subheadline: "ราคาดีเกินต้าน คุ้มค่าที่สุด", captionLines: ["ราคาดีเกินต้าน", "คุ้มค่าที่สุด"] },
  ];

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

  let hookList = hookPhrases[styleDNA.hookFormula] || hookPhrases.question;
  let subList = fallbackSubheadlines;

  if (isBaby) {
    hookList = babyHooks;
    subList = babySubheadlines;
  } else if (isBeauty) {
    hookList = beautyHooks;
    subList = beautySubheadlines;
  }

  const pickedHook = hookList[Math.floor(Math.random() * hookList.length)];
  const pickedSub = subList[Math.floor(Math.random() * subList.length)];

  let hookBadge = "🔥 ป้ายยาไอเทมเด็ด";
  if (isBaby) {
    hookBadge = "🌿 สำหรับลูกน้อย";
  } else if (isBeauty) {
    hookBadge = "💧 ดูแลผิวปัง";
  } else if (isTumbler) {
    hookBadge = "❄️ เก็บเย็นจัดเต็ม";
  } else if (isGadget) {
    hookBadge = "⚡ สเปกจัดเต็ม";
  } else if (packBadges[styleDNA.pack]) {
    hookBadge = packBadges[styleDNA.pack];
  }

  const count = Math.max(2, Math.min(params.imageCount || 3, 3));
  const scenes: SceneData[] = [];

  const splitHighlights = params.highlights
    .split(/(?:\r?\n|[,;]|\s*•\s*)/)
    .map((s) => s.replace(/^(?:\d+[\s.)\-]+|[•\-\*]\s*)/, "").trim())
    .filter(Boolean);

  const layouts = styleDNA.layouts || ["hero-center", "polaroid-stack", "callout-circle"];
  const themes: PaperTheme[] = ["cream-grid", "pastel-mint", "kraft"];

  for (let i = 0; i < count; i++) {
    const smart = deriveIntelligentBenefits(params.productName, params.highlights, i);
    let cleanTitle = smart.title;
    let headlineLines = smart.headlineLines;

    if (splitHighlights[i]) {
      const hText = splitHighlights[i];
      const lines = splitSafeThaiLines(hText, 14, 4);
      if (lines.length > 0 && lines.every((l) => validateLine(l, 16, 3).valid)) {
        headlineLines = lines.slice(0, 2);
        cleanTitle = headlineLines.join(" ");
      }
    }

    const cleanDesc = smart.desc;
    const captionLines = smart.captionLines;

    scenes.push({
      highlightTitle: cleanTitle,
      headlineLines,
      highlightDesc: cleanDesc,
      captionLines,
      stickerText: smart.stickerText,
      highlightWord: smart.word,
      layout: layouts[i % layouts.length],
      paperTheme: themes[i % themes.length],
      imageIndex: i,
      durationSec: count === 2 ? 4.5 : 3,
    });
  }

  const cta: CTAData = {
    ctaTitle: params.ctaText || "จิ้มตะกร้าส้มซ้ายล่างด่วน!",
    headlineLines: ["จิ้มตะกร้าส้ม", "ซ้ายล่างด่วน!"],
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่มเฉพาะคลิปนี้",
    captionLines: ["แจกโค้ดส่งฟรี", "คูปองลดเพิ่มทันที"],
    buttonText: "ช้อปเลยที่ Shopee",
    badgeText: isBaby ? "🌿 เพื่อลูกน้อยที่คุณรัก" : "⚡ โค้ดมีจำนวนจำกัด",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    paperTheme: "halftone-orange",
    durationSec: 3,
  };

  const narrationScript = buildNaturalNarrationText(params.productName, params.price, scenes, cta);

  return {
    hook: {
      headline: pickedHook.title,
      headlineLines: pickedHook.headlineLines,
      subheadline: pickedSub.subheadline,
      captionLines: pickedSub.captionLines,
      badgeText: hookBadge,
      highlightWord: isBaby ? "ลูกน้อย" : "ตัวดัง",
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
      mood: isBaby ? "อบอุ่น สดใส ฟังสบาย (Acoustic Warm Playful)" : "จังหวะสนุกสนาน กระตุ้นการตัดสินใจ (Upbeat TikTok Dance)",
      musicGenre: isBaby ? "Soft Acoustic Ukulele" : "Viral Shopee Beat",
      soundEffectTips: "เสียง Paper Slap ตอนเปิดตัว และ Cash Ding ตอนโชว์ราคาพิเศษ",
    },
    narrationScript,
    styleDNA,
  };
}
