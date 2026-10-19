import Anthropic from "@anthropic-ai/sdk";
import { StoryboardPlan } from "../../remotion/types";
import { pickStyleDNA, loadStyleHistory } from "./styleDirector";
import {
  ScriptGenerationParams,
  generateShopeeScript,
  validateAndNormalizeStoryboard,
  generateFallbackStoryboard,
  checkLineViolations,
} from "./gemini";

export interface ScriptGenerationResult {
  storyboard: StoryboardPlan;
  provider: "claude" | "gemini";
  model: string;
  fallbackNotice?: string;
}

/**
 * Supported Claude models in priority order
 */
const CLAUDE_MODELS = [
  process.env.CLAUDE_MODEL || "claude-fable-5-1",
  "claude-3-7-sonnet",
  "claude-3-5-sonnet-20241022",
  "claude-3-haiku-20240307",
];

/**
 * Generate viral Shopee affiliate script using Claude (Fable 5.1 / Anthropic).
 * Seamlessly falls back to Gemini if Claude API key is missing or encounters auth/quota errors.
 */
export async function generateShopeeScriptWithClaude(
  params: ScriptGenerationParams
): Promise<ScriptGenerationResult> {
  const apiKey =
    process.env.CLAUDE_API_KEY ||
    process.env.CLUADE_API_KEY ||
    process.env.ANTHROPIC_API_KEY;
  const baseURL =
    process.env.CLAUDE_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL;

  // Prepare style DNA
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

  // If no Claude key is configured, fallback directly to Gemini
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_claude_api_key")) {
    console.info("[claude] No valid Claude API key found. Delegating to Gemini...");
    const geminiStoryboard = await generateShopeeScript(params);
    return {
      storyboard: geminiStoryboard,
      provider: "gemini",
      model: "gemini-2.5-flash",
      fallbackNotice: "ไม่พบคีย์ Claude API จึงสลับมาใช้ Gemini 2.5 Flash อัตโนมัติ",
    };
  }

  const toneDescriptions: Record<string, { desc: string; vibe: string }> = {
    exciting: {
      desc: "สายป้ายยา ตื่นเต้น เร้าใจ ภาษาวัยรุ่น มีเอเนอร์จี้ ชวนว้าว ป้ายยาตรงจุด",
      vibe: "High Energy & FOMO",
    },
    minimal: {
      desc: "มินิมอล คลีนๆ อบอุ่น ฟังสบาย น่าเชื่อถือ เรียบหรู ดูแพง",
      vibe: "Aesthetic & High Trust",
    },
    problem_solving: {
      desc: "เน้นชี้ Pain Point แก้ปัญหาในชีวิตประจำวัน รีวิวแบบจริงใจ ชี้ทางสว่าง",
      vibe: "Relatable Problem-Solver",
    },
    promo: {
      desc: "เน้นโปรโมชั่น Flash Sale เร่งด่วน คุ้มสุดๆ ด่วนก่อนหมดเวลา ช้าคือหมด",
      vibe: "Urgency & Flash Sale",
    },
  };

  const selectedTone = toneDescriptions[params.tone] || {
    desc: params.tone,
    vibe: "Engaging Shopee Creator",
  };

  const systemPrompt = `Use Thai speaker language: ${params.languageStyle || 'neutral'}. female-polite uses ค่ะ for statements and คะ for questions; male-polite uses ครับ; neutral avoids gendered pronouns. Preserve supplied product facts.
You are a Creative Director, Video Copywriter, and Motion Designer specializing in Thai short-form product videos.
Your objective is to craft an irresistibly engaging 15-second video storyboard formatted for a dynamic "Paper Collage & Stop-Motion" aesthetic in THAI.

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

CRITICAL ANTI-REPETITION & READABILITY RULES:
1. HEADLINES TO AVOID:
${recentHeadlines.map((h, i) => `   - [${i + 1}] "${h}"`).join("\n")}
   DO NOT reuse phrases or sentence structures from these recent headlines!
2. MANDATORY PRE-SPLIT SEMANTIC LINES:
   - "headlineLines": array of 1 to 2 strings. STRICT MAX 14 Thai characters per line. Min 4 characters!
   - "captionLines": array of 1 to 2 strings. STRICT MAX 18 Thai characters per line. Min 4 characters!
   - RULES FOR LINE SPLITTING:
     * Cut ONLY at natural semantic phrase boundaries (ขอบของวลีตามความหมาย)
     * NEVER cut in the middle of a word!
     * NEVER split contiguous phrases (e.g., "บอกเลย", "ตรงปก", "ห้ามพลาด", "ไอเทมเด็ด", "ส่งฟรี", "ตะกร้าส้ม", "ของแท้", "คุ้มมาก", "ลดแรง", "ตัวดัง", "พิกัด")
     * NEVER start or end a line with orphan letters, tone marks, or dependent vowels.
   - Price placement: Mention the price ONLY in the CTA scene. Do NOT repeat price in previous scenes!
3. COMPLIANCE & BESPOKE STICKER BADGES:
   - NEVER use generic filler cliches like "ไฮไลท์เด็ด", "สวยตรงปก", "คุ้มค่าที่สุด", "ดีงามมาก", "คุณภาพพรีเมียม", "เด็ดจริง"
   - NO ENUMERATIONS: NEVER copy list numbers like "1)", "2.", "จุดเด่นที่ 1" into titles or stickers!
   - "stickerText" MUST be a bespoke, high-trust tag with 1 relevant emoji tailored to the actual product (e.g. "🌿 อ่อนโยนต่อลูก", "❄️ เก็บเย็น 24 ชม.", "🎧 เบสแน่นทรงพลัง").

Return ONLY a valid JSON object matching this schema (no markdown fences or commentary outside the JSON):
{
  "hook": {
    "headline": "Full punchy Thai hook headline (max 24 chars)",
    "headlineLines": ["Line 1 (<= 14 chars)", "Line 2 (<= 14 chars)"],
    "subheadline": "Catchy intrigue subtitle (max 28 chars)",
    "captionLines": ["Line 1 (<= 18 chars)", "Line 2 (<= 18 chars)"],
    "badgeText": "Badge tag with emoji",
    "popPoints": ["2-3 ultra-short checklist items, <= 10 chars each, no emoji (e.g. \"ผม\", \"หน้า\", \"ผิวกาย\")"],
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
      "popPoints": ["2-3 ultra-short checklist items grounded in facts, <= 10 chars each, no emoji"],
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
  "narrationScript": "Full spoken voiceover in continuous natural Thai (STRICT LENGTH: 160-220 Thai characters for optimal 14-16s tempo. Fast-paced, punchy, ending with basket CTA)"
}`;

  const userPrompt = `Product Name: ${params.productName}
Price / Promotion: ${params.price}
Highlights / Key Selling Points: ${params.highlights}
Desired Tone: ${selectedTone.desc} (${selectedTone.vibe})
User CTA preference: ${params.ctaText || "พิกัดในตะกร้าส้มซ้ายล่าง"}
Number of uploaded images: ${params.imageCount}
${params.category ? `Product Category: ${params.category}\n` : ""}${params.promoTag ? `Promo Tag: ${params.promoTag}\n` : ""}${params.facts ? `Verified Facts: ${JSON.stringify(params.facts)}\n` : ""}
`;

  try {
    const anthropic = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    let selectedModel = CLAUDE_MODELS[0];
    let parsedStoryboard: any = null;

    for (const modelToTry of CLAUDE_MODELS) {
      try {
        console.info(`[claude] Attempting script generation with model: ${modelToTry}...`);
        const message = await anthropic.messages.create({
          model: modelToTry,
          max_tokens: 2000,
          temperature: 0.85,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });

        const rawContent = message.content
          .map((c) => (c.type === "text" ? c.text : ""))
          .join("")
          .trim();

        if (!rawContent) continue;

        const cleanedJson = rawContent
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleanedJson);
        const violations = checkLineViolations(parsed);
        if (violations.length > 0) {
          console.warn("[claude] Line violations detected, normalizing automatically:", violations);
        }

        parsedStoryboard = parsed;
        selectedModel = modelToTry;
        break; // Successfully generated and parsed
      } catch (err: any) {
        console.warn(`[claude] Attempt with model ${modelToTry} failed:`, err?.message || err);
        // If authentication error (e.g. 401), trying other models with same key will also fail
        if (err?.status === 401 || err?.message?.includes("authentication") || err?.message?.includes("x-api-key")) {
          throw err;
        }
      }
    }

    if (parsedStoryboard) {
      const normalized = validateAndNormalizeStoryboard(parsedStoryboard, params, styleDNA);
      return {
        storyboard: normalized,
        provider: "claude",
        model: selectedModel,
      };
    }

    throw new Error("Claude did not return a valid storyboard JSON.");
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn(`[claude] Error generating script with Claude (${errorMsg}). Gracefully falling back to Gemini...`);

    let userFriendlyNotice = "Claude เกิดข้อผิดพลาด จึงสลับมาใช้ Gemini 2.5 Flash ให้โดยอัตโนมัติ";
    if (error?.status === 401 || errorMsg.includes("authentication") || errorMsg.includes("invalid x-api-key")) {
      userFriendlyNotice = "Claude API Key ไม่ถูกต้องหรือหมดอายุ ระบบจึงใช้ Google Gemini 2.5 Flash ให้แทนอย่างราบรื่น";
    } else if (error?.status === 429 || errorMsg.includes("rate_limit")) {
      userFriendlyNotice = "โควต้า Claude เต็มชั่วคราว ระบบจึงใช้ Google Gemini 2.5 Flash ให้แทน";
    }

    // Call Gemini as bulletproof fallback
    try {
      const geminiStoryboard = await generateShopeeScript(params);
      return {
        storyboard: geminiStoryboard,
        provider: "gemini",
        model: "gemini-2.5-flash",
        fallbackNotice: userFriendlyNotice,
      };
    } catch (geminiErr) {
      console.error("[claude-fallback] Gemini also encountered an issue, using intelligent template:", geminiErr);
      const fallbackStoryboard = generateFallbackStoryboard(params, styleDNA);
      return {
        storyboard: fallbackStoryboard,
        provider: "gemini",
        model: "intelligent-template",
        fallbackNotice: userFriendlyNotice,
      };
    }
  }
}
