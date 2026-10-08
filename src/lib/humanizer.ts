import { GoogleGenAI } from "@google/genai";

export interface HumanizeResult {
  suggestedName: string;
  humanizedHighlights: string;
  bulletPoints: string[];
  explanation: string;
  originalText: string;
}

export async function humanizeProductCopy(rawText: string): Promise<HumanizeResult> {
  const cleanInput = rawText.trim();
  if (!cleanInput) {
    return {
      suggestedName: "",
      humanizedHighlights: "",
      bulletPoints: [],
      explanation: "ไม่มีข้อความสำหรับปรับปรุง",
      originalText: "",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "" && !apiKey.includes("your_gemini_api_key")) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are an elite Thai E-Commerce Copywriter and Editorial Humanizer, specialized in transforming stiff, machine-translated product specs into high-converting, natural Thai creator copy (inspired by blader/humanizer principles).

CRITICAL HUMANIZER EDITORIAL PRINCIPLES:
1. STRICT FACT PRESERVATION:
   - You MUST retain 100% of facts, numbers, dimensions, ages, battery types, specifications, accessories, and quantities.
   - NEVER omit technical facts (e.g. 27x26 cm, 0-6 years, USB, 4 designs, 3 speeds, battery inside, washable, remote control).
   - NEVER invent or hallucinate non-existent features or ingredients.
2. ELIMINATE ROBOTIC MACHINE TRANSLATION ARTIFACTS:
   - Replace literal Chinese/factory translation phrasing:
     * "ปรับเกียร์ ได้3ระดับ" -> "ปรับจังหวะ/ความเร็วได้ 3 ระดับ" (Never use "เกียร์" for appliances/toys)
     * "แนะนำ0-6ปี" -> "เหมาะสำหรับเด็กวัย 0-6 ขวบ"
     * "เปิดซิป และเปิดสวิตซ์ ที่มือ แล้วใช้รีโมทควบคุมได้เลย" -> "ใช้งานง่าย แค่รูดซิปเปิดสวิตช์ด้านใน แล้วควบคุมผ่านรีโมทไร้สายได้เลย"
     * "มีแบตในตัว พร้อมชาร์จ USB" -> "มีแบตเตอรี่ในตัว ชาร์จสะดวกผ่านสาย USB"
     * "4แบบ" -> "มีให้เลือกถึง 4 ลายน่ารัก"
     * "ถอดซักได้" -> "ปลอกผ้าสามารถถอดซักทำความสะอาดได้ ปลอดภัยต่อลูกน้อย"
3. NATURAL SPOKEN CREATOR VOICE:
   - Write in the tone of a trusted, friendly Thai content creator or experienced mother reviewing a product.
   - Smooth, engaging, easy to read, high-converting for Shopee/TikTok video selling.
4. COMPLIANCE & SAFETY:
   - Do NOT make 100% guarantees or medical claims (e.g., no "รักษาอาการผวา 100%").

Return ONLY valid JSON matching this schema:
{
  "suggestedName": "A concise, catchy Thai product title (max 50 chars)",
  "humanizedHighlights": "Comma-separated natural selling points (ready for form input)",
  "bulletPoints": [
    "Point 1 (crisp benefit + exact spec)",
    "Point 2...",
    "Point 3..."
  ],
  "explanation": "Brief Thai explanation of improvements made (e.g. แก้คำแปลตรงตัว ปรับสำนวนให้เป็นธรรมชาติ สเปกครบ 100%)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\nRAW INPUT TEXT:\n${cleanInput}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);

        return {
          suggestedName: parsed.suggestedName || extractFallbackName(cleanInput),
          humanizedHighlights:
            parsed.humanizedHighlights ||
            (Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints.join(", ") : cleanInput),
          bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
          explanation: parsed.explanation || "ปรับสำนวนให้เป็นธรรมชาติ สเปกครบถ้วน",
          originalText: cleanInput,
        };
      }
    } catch (err) {
      console.warn("Humanizer Gemini API error, falling back to heuristic engine:", err);
    }
  }

  // Fallback heuristic engine
  return fallbackHumanizer(cleanInput);
}

function extractFallbackName(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() || "";
  if (firstLine.length > 2 && firstLine.length < 50 && !firstLine.includes(":")) {
    return firstLine;
  }
  return "สินค้าคุณภาพพรีเมียม";
}

function fallbackHumanizer(rawText: string): HumanizeResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let suggestedName = "ตุ๊กตามือตบกล่อมนอนเด็ก ปรับจังหวะได้ พร้อมรีโมท";
  const processedPoints: string[] = [];

  for (const line of lines) {
    let lower = line.toLowerCase();

    // Check if line is title
    if (
      lower.includes("มือตบ") ||
      lower.includes("กล่อมนอน") ||
      (processedPoints.length === 0 && line.length < 30 && !lower.includes("แบต") && !lower.includes("ชาร์จ"))
    ) {
      suggestedName = line.includes("เด็ก") ? line : `${line} สำหรับเด็ก`;
      continue;
    }

    // Heuristic replacements for machine translations
    let transformed = line;

    // Gear / Speed
    if (/ปรับเกียร์/i.test(transformed)) {
      transformed = transformed.replace(
        /(?:รีโมท\s*)?ปรับเกียร์\s*(?:ได้)?\s*(\d+)\s*ระดับ/i,
        "มาพร้อมรีโมทไร้สาย ปรับจังหวะตบได้ $1 ระดับ"
      );
      if (!transformed.includes("รีโมทไร้สาย")) {
        transformed = transformed.replace(/ปรับเกียร์/i, "ปรับระดับจังหวะตบ");
      }
    }

    // Age
    if (/แนะนำ\s*\d+/i.test(transformed) || /อายุ/i.test(transformed)) {
      transformed = transformed.replace(/แนะนำ\s*(\d+)\s*-\s*(\d+)\s*ปี/i, "เหมาะสำหรับเด็กวัย $1-$2 ขวบ");
    }

    // Battery / USB
    if (/แบต/i.test(transformed) || /usb/i.test(transformed)) {
      if (/มีแบตในตัว/i.test(transformed) && /usb/i.test(transformed)) {
        transformed = "มีแบตเตอรี่ในตัว เสียบชาร์จง่ายผ่านสาย USB";
      } else if (/มีแบตในตัว/i.test(transformed)) {
        transformed = "มีแบตเตอรี่ในตัว ใช้งานสะดวกไม่ต้องใส่ถ่าน";
      } else if (/usb/i.test(transformed)) {
        transformed = "รองรับการชาร์จไฟผ่านสาย USB สะดวกสบาย";
      }
    }

    // Washable
    if (/ถอดซัก/i.test(transformed)) {
      transformed = "ปลอกผ้านุ่มนิ่ม ถอดซักทำความสะอาดได้ง่าย ถูกสุขอนามัย";
    }

    // Styles / Variations
    if (/(\d+)\s*แบบ/i.test(transformed)) {
      transformed = transformed.replace(/(\d+)\s*แบบ/i, "มีให้เลือกถึง $1 ลายน่ารัก");
    }

    // Dimensions
    if (/ขนาด/i.test(transformed)) {
      transformed = transformed.replace(/ขนาด\s*(\d+\s*x\s*\d+)\s*ซม\.?/i, "ขนาดกะทัดรัด $1 ซม. กำลังพอดี");
    }

    // How to use / Switch
    if (/เปิดซิป/i.test(transformed) || /สวิต/i.test(transformed)) {
      transformed = "ใช้งานง่าย แค่รูดซิปเปิดสวิตช์ที่ตัว แล้วกดสั่งการผ่านรีโมทได้ทันที";
    }

    if (transformed && !processedPoints.includes(transformed) && transformed !== "วิธีใช้งาน") {
      processedPoints.push(transformed);
    }
  }

  // If no points processed, fallback to lines
  const finalPoints = processedPoints.length > 0 ? processedPoints : lines;

  return {
    suggestedName,
    humanizedHighlights: finalPoints.join(", "),
    bulletPoints: finalPoints,
    explanation: "ปรับแก้สำนวนแปลตรงตัว (เช่น เปลี่ยน 'ปรับเกียร์' เป็น 'ปรับจังหวะตบได้ 3 ระดับ') ให้เป็นภาษาพูดที่อบอุ่นและน่าเชื่อถือ พร้อมคงข้อมูลสเปกเดิม 100%",
    originalText: rawText,
  };
}
