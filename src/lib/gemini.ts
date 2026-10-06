import { GoogleGenAI } from "@google/genai";
import { StoryboardPlan } from "../../remotion/types";

export interface ScriptGenerationParams {
  productName: string;
  price: string;
  highlights: string;
  tone: string;
  imageCount: number;
  ctaText?: string;
}

export async function generateShopeeScript(
  params: ScriptGenerationParams
): Promise<StoryboardPlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "" && !apiKey.includes("your_gemini_api_key")) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const toneDescriptions: Record<string, string> = {
        exciting: "สายป้ายยา ตื่นเต้น เร้าใจ ภาษาวัยรุ่น มีเอเนอร์จี้ ชวนว้าว",
        minimal: "มินิมอล คลีนๆ อบอุ่น ฟังสบาย น่าเชื่อถือ เรียบหรู",
        problem_solving: "เน้นชี้ Pain Point แก้ปัญหาในชีวิตประจำวัน รีวิวแบบจริงใจ",
        promo: "เน้นโปรโมชั่น Flash Sale เร่งด่วน คุ้มสุดๆ ด่วนก่อนหมดเวลา",
      };

      const selectedToneDesc = toneDescriptions[params.tone] || params.tone;

      const systemPrompt = `You are a top-tier viral Shopee & TikTok Affiliate Video Director and Creator.
Your task is to write a high-converting, professional short-form video storyboard and a natural, human-like voiceover narration in THAI.

CRITICAL VOICE & SCRIPTING RULES:
1. NO ROBOTIC REPETITIONS: DO NOT repeat the price or discount percentage in every single scene. Mention the price or discount naturally ONLY ONCE near the call-to-action or climax!
2. NO ROBOTIC ENUMERATIONS: NEVER say phrases like "จุดเด่นที่ 1", "จุดเด่นที่ 2", "จุดเด่นที่ 3" in spoken voiceover. Real human creators use conversational connectors like "ทุกคนนน เจอไอเทมเด็ด...", "ตัวนี้บอกเลยว่า...", "แถมยัง...", "ที่ชอบมากคือ...".
3. NARRATION SCRIPT: Must be fluent, engaging modern Thai that sounds like an authentic friendly creator talking directly to the camera (duration ~13-15 seconds when spoken at normal pace, around 35-50 words).

Return ONLY a valid JSON object strictly following this structure:
{
  "hook": {
    "headline": "Short punchy Thai headline (under 8 words)",
    "subheadline": "Catchy intrigue or subtext (under 10 words)",
    "badgeText": "Short badge with emoji (e.g. 🔥 ป้ายยาไอเทมเด็ด)",
    "durationSec": 3
  },
  "scenes": [
    {
      "highlightTitle": "Key feature title (Thai, max 6 words)",
      "highlightDesc": "Distinct benefit without repeating price (Thai, max 10 words)",
      "stickerText": "Fun sticker tag with emoji (e.g. ✨ สวยตรงปก)",
      "imageIndex": 0,
      "durationSec": 3
    }
  ],
  "cta": {
    "ctaTitle": "Call to action headline (e.g. จิ้มตะกร้าส้มซ้ายล่างเลย!)",
    "ctaSubtitle": "Incentive like free shipping or coupon",
    "buttonText": "ช้อปเลยที่ Shopee",
    "basketNote": "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    "durationSec": 3
  },
  "theme": {
    "primaryColor": "#EE4D2D",
    "accentColor": "#FFBA00",
    "bgColor": "#0F172A",
    "textColor": "#FFFFFF",
    "styleName": "Color theme name"
  },
  "audioSuggestion": {
    "mood": "Tone and emotional feel of the background music",
    "musicGenre": "Suggested audio genre (e.g. Upbeat TikTok Pop)",
    "soundEffectTips": "Specific sound effect cues (e.g. Whoosh, Cash Register Ding)"
  },
  "narrationScript": "Full spoken voiceover in continuous, natural Thai without robotic enumerations and without repeating the price over and over."
}

Requirements:
- Total duration is 15 seconds.
- Number of scenes: 2 to 3 scenes. Total images available: ${Math.max(1, Math.min(params.imageCount, 5))}.
`;

      const userContent = `Product Name: ${params.productName}
Price / Promotion: ${params.price}
Highlights / Key Selling Points: ${params.highlights}
Desired Tone: ${selectedToneDesc}
User CTA preference: ${params.ctaText || "พิกัดตะกร้าส้มซ้ายล่าง"}
Number of uploaded images: ${params.imageCount}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\n${userContent}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        return validateAndNormalizeStoryboard(parsed, params);
      }
    } catch (error) {
      console.warn("Gemini API call failed, falling back to intelligent template:", error);
    }
  }

  // Fallback template generator when API key is not yet set or API failed
  return generateFallbackStoryboard(params);
}

function validateAndNormalizeStoryboard(
  data: any,
  params: ScriptGenerationParams
): StoryboardPlan {
  const hook = {
    headline: data.hook?.headline || `${params.productName} ไอเทมที่ต้องมี!`,
    subheadline: data.hook?.subheadline || `ป้ายยาวันนี้ ราคาดีเกินต้าน`,
    badgeText: data.hook?.badgeText || "🔥 ของมันต้องมี",
    durationSec: Number(data.hook?.durationSec) || 3,
  };

  const rawScenes = Array.isArray(data.scenes) && data.scenes.length > 0 ? data.scenes : [];
  const scenes = rawScenes.map((s: any, idx: number) => {
    // Prevent price from being repeated in highlightDesc if it leaked
    let desc = s.highlightDesc || "";
    if (!desc || desc.includes(params.price)) {
      desc = idx === 0
        ? "วัสดุพรีเมียม ทนทาน ใช้งานได้ยาวนาน"
        : idx === 1
        ? "ดีไซน์สวย ตรงปก พกพาสะดวก"
        : "ตอบโจทย์การใช้งานจริง คุ้มค่าที่สุด";
    }

    return {
      highlightTitle: s.highlightTitle || `จุดเด่น #${idx + 1}`,
      highlightDesc: desc,
      stickerText: s.stickerText || (idx === 0 ? "✨ ไฮไลท์เด็ด" : idx === 1 ? "👍 คุณภาพพรีเมียม" : "🏷️ คุ้มค่าที่สุด"),
      imageIndex: typeof s.imageIndex === "number" ? s.imageIndex : idx,
      durationSec: Number(s.durationSec) || 3,
    };
  });

  if (scenes.length === 0) {
    scenes.push({
      highlightTitle: "คุณภาพพรีเมียมเกินราคา",
      highlightDesc: "วัสดุเกรดดี แข็งแรงทนทาน ใช้งานได้ยาวนาน",
      stickerText: "✨ คุ้มค่าที่สุด",
      imageIndex: 0,
      durationSec: 4,
    });
  }

  const cta = {
    ctaTitle: data.cta?.ctaTitle || "จิ้มตะกร้าส้มซ้ายล่างด่วน!",
    ctaSubtitle: data.cta?.ctaSubtitle || "เก็บโค้ดส่งฟรี + คูปองลดเพิ่มทันที",
    buttonText: data.cta?.buttonText || "ช้อปเลยที่ Shopee",
    basketNote: data.cta?.basketNote || "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    durationSec: Number(data.cta?.durationSec) || 3,
  };

  const theme = {
    primaryColor: data.theme?.primaryColor || "#EE4D2D",
    accentColor: data.theme?.accentColor || "#FFBA00",
    bgColor: data.theme?.bgColor || "#0F172A",
    textColor: data.theme?.textColor || "#FFFFFF",
    styleName: data.theme?.styleName || "Shopee Orange Energy",
  };

  const audioSuggestion = {
    mood: data.audioSuggestion?.mood || "ตื่นเต้น เร่งเร้า ชวนช้อป",
    musicGenre: data.audioSuggestion?.musicGenre || "TikTok Upbeat Affiliate Beat",
    soundEffectTips:
      data.audioSuggestion?.soundEffectTips ||
      "เสียง Whoosh ตอนเปลี่ยนรูป และเสียง Ding กระดิ่งตอนขึ้นราคา",
  };

  // Build or sanitize natural narration script
  let narrationScript = data.narrationScript?.trim();
  if (!narrationScript) {
    narrationScript = buildNaturalNarrationText(params.productName, params.price, scenes, cta);
  }

  return { hook, scenes, cta, theme, audioSuggestion, narrationScript };
}

export function buildNaturalNarrationText(
  productName: string,
  price: string,
  scenes: Array<{ highlightTitle: string; highlightDesc: string }>,
  cta: { ctaTitle: string; basketNote?: string }
): string {
  // Fluent, conversational Thai creator flow without repeating the price in every sentence
  const scene1 = scenes[0] ? `${scenes[0].highlightTitle} ${scenes[0].highlightDesc}` : "";
  const scene2 = scenes[1] ? `แถมยัง${scenes[1].highlightTitle} ${scenes[1].highlightDesc}` : "";
  const scene3 = scenes[2] ? `ที่สำคัญคือ${scenes[2].highlightTitle}` : "";

  const featuresText = [scene1, scene2, scene3].filter(Boolean).join(" ");

  return `ทุกคนนน เจอไอเทมเด็ดอีกแล้ว! ${productName} ตัวนี้คือดีงามมาก ${featuresText} ตอนนี้จัดโปรพิเศษเหลือแค่ ${price} เท่านั้น พิกัดจิ้มที่ตะกร้าส้มซ้ายล่างได้เลยจ้า รีบกดก่อนของหมดน้า!`;
}

function generateFallbackStoryboard(params: ScriptGenerationParams): StoryboardPlan {
  const isMinimal = params.tone === "minimal";
  const isPromo = params.tone === "promo";
  const isProblem = params.tone === "problem_solving";

  const primaryColor = isMinimal ? "#334155" : isPromo ? "#DC2626" : "#EE4D2D";
  const accentColor = isMinimal ? "#94A3B8" : isPromo ? "#F59E0B" : "#FFBA00";

  const hookBadge = isProblem
    ? "⚠️ ใครเจอปัญหานี้บ้าง?"
    : isPromo
    ? "⚡ FLASH SALE วันนี้วันเดียว!"
    : isMinimal
    ? "🌿 สไตล์มินิมอลคุมโทน"
    : "🔥 ป้ายยาไอเทมเด็ดช้อปปี้";

  const hookTitle = isProblem
    ? `หยุดปัญหาเดิมๆ ด้วย ${params.productName}!`
    : isPromo
    ? `ลดแรงแซงทุกดีล! ${params.productName}`
    : `เจอแล้ว! ${params.productName} ตัวดัง`;

  const hookSub = "ของดีตรงปก บอกเลยว่าห้ามพลาด";

  const count = Math.max(2, Math.min(params.imageCount || 3, 3));
  const scenes = [];

  const splitHighlights = params.highlights
    .split(/[,.\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const defaultBenefits = [
    "วัสดุพรีเมียม แข็งแรงทนทาน ใช้งานได้ยาวนาน",
    "ดีไซน์สวย ตรงปกไม่จกตา พกพาสะดวก",
    "ตอบโจทย์การใช้งานจริง ฟังก์ชันครบจบในตัวเดียว",
  ];

  for (let i = 0; i < count; i++) {
    const rawTitle = splitHighlights[i] || (i === 0 ? "ฟังก์ชันครบ จบในชิ้นเดียว" : i === 1 ? "ดีไซน์สวย ตรงปกไม่จกตา" : "การันตีความคุ้มค่า");
    const cleanTitle = rawTitle.length > 25 ? rawTitle.substring(0, 25) + "..." : rawTitle;

    // DO NOT repeat params.price in each scene description!
    const cleanDesc = defaultBenefits[i % defaultBenefits.length];

    scenes.push({
      highlightTitle: cleanTitle,
      highlightDesc: cleanDesc,
      stickerText: i === 0 ? "✨ ไฮไลท์เด็ด" : i === 1 ? "👍 คุณภาพพรีเมียม" : "🏷️ คุ้มค่าที่สุด",
      imageIndex: i,
      durationSec: 3,
    });
  }

  const cta = {
    ctaTitle: params.ctaText || "จิ้มตะกร้าส้มซ้ายล่างด่วน!",
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่มเฉพาะคลิปนี้",
    buttonText: "ช้อปเลยที่ Shopee",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    durationSec: 3,
  };

  // Generate continuous, natural creator narration script
  const narrationScript = buildNaturalNarrationText(params.productName, params.price, scenes, cta);

  return {
    hook: {
      headline: hookTitle,
      subheadline: hookSub,
      badgeText: hookBadge,
      durationSec: 3,
    },
    scenes,
    cta,
    theme: {
      primaryColor,
      accentColor,
      bgColor: "#0F172A",
      textColor: "#FFFFFF",
      styleName: isMinimal ? "Clean Minimalist" : "Shopee Vibrant Affiliate",
    },
    audioSuggestion: {
      mood: isMinimal
        ? "อบอุ่น ผ่อนคลาย เรียบง่าย (Lofi / Chill Pop)"
        : "จังหวะสนุกสนาน กระตุ้นการตัดสินใจ (Upbeat TikTok Dance)",
      musicGenre: isMinimal ? "Acoustic / Lo-fi" : "Viral Shopee Beat",
      soundEffectTips: "เสียง Pop ตอนเปิดตัว และ Ding ตอนโชว์ราคาพิเศษ",
    },
    narrationScript,
  };
}
