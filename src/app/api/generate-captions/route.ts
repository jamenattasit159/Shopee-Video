import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { countWords, enforceWordLimit } from "../../../lib/captions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, price, highlights, category, tone = "exciting" } = body;

    if (!productName) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_gemini_api_key")) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `คุณคือผู้เชี่ยวชาญการเขียนแคปชั่นป้ายยาสินค้าบน Shopee Video และ TikTok Affiliate
จงเขียนแคปชั่นภาษาไทย 4 สไตล์ที่แตกต่างกันอย่างสิ้นเชิงสำหรับสินค้าต่อไปนี้:
- ชื่อสินค้า: "${productName}"
- ราคา: "${price}"
- จุดเด่น: "${highlights || "คุ้มค่า คุณภาพดี"}"
- หมวดหมู่: "${category || "สินค้าทั่วไป"}"

กฎเหล็กสำคัญที่สุด (Shopee Video Constraint):
1. Shopee Video จำกัดแคปชั่นไม่เกิน 100 คำ (Word Limit <= 100 words) ดังนั้นตัวแคปชั่นแต่ละอันต้องสั้น กระชับ มีพลัง ดึงดูดสายตาคนดูที่ไถฟีดเร็ว (ความยาวของเนื้อหาควรอยู่ที่ 35 - 60 คำ รวมแฮชแท็กแล้วห้ามเกิน 80 คำเด็ดขาด)
2. ห้ามเขียนประโยคซ้ำซาก ห้ามใช้แพตเทิร์นจำเจ
3. ทุกแคปชั่นต้องมี Call to Action ชวนกดที่ "ตะกร้าส้มมุมซ้ายล่าง" อย่างเป็นธรรมชาติ
4. ปิดท้ายด้วยแฮชแท็กยอดนิยม 3-4 อัน เช่น #Shopeeป้ายยา #ของดีบอกต่อ #รีวิวช้อปปี้ #พิกัดในตะกร้าส้ม
5. ให้ผลลัพธ์เป็น JSON Array เท่านั้น ตามโครงสร้างที่กำหนด

โครงสร้าง JSON ที่ต้องการ:
[
  {
    "id": "ai-punchy",
    "styleName": "⚡ สายฮุกไว จบสั้น (AI Punchy Hook)",
    "styleDescription": "สั้น กระชับ ดึงดูดสายตาคนไถฟีดใน 2 วินาทีแรก",
    "captionText": "เนื้อหาแคปชั่น...",
    "hashtags": ["#Shopeeป้ายยา", "#ของดีบอกต่อ", "#พิกัดในตะกร้าส้ม"],
    "fullPost": "เนื้อหาแคปชั่นพร้อมแฮชแท็ก..."
  },
  {
    "id": "ai-bestie",
    "styleName": "💬 สายเพื่อนสนิทป้ายยา (AI Real Talk)",
    "styleDescription": "ภาษาธรรมชาติ ฟีลรีวิวของจริงจากใจ",
    "captionText": "...",
    "hashtags": [...],
    "fullPost": "..."
  },
  {
    "id": "ai-deal",
    "styleName": "🏷️ สายล่าดีล ชี้พิกัดคุ้ม (AI Deal Hunter)",
    "styleDescription": "เน้นราคา โปรโมชั่น โค้ดส่งฟรี",
    "captionText": "...",
    "hashtags": [...],
    "fullPost": "..."
  },
  {
    "id": "ai-problem-solver",
    "styleName": "🎯 สายแก้ปัญหา ตอบโจทย์ (AI Problem Solver)",
    "styleDescription": "เริ่มจากปัญหาของคนดู แล้วนำเสนอสินค้าเป็นทางออก",
    "captionText": "...",
    "hashtags": [...],
    "fullPost": "..."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.85,
      },
    });

    const rawOutput = response.text || "[]";
    let captions = JSON.parse(rawOutput);

    if (!Array.isArray(captions) || captions.length === 0) {
      throw new Error("Invalid format from Gemini response");
    }

    // Enforce word limit safety (< 95 words) and attach counts
    captions = captions.map((c: any, idx: number) => {
      const full = enforceWordLimit(c.fullPost || `${c.captionText}\n\n${(c.hashtags || []).join(" ")}`, 90);
      return {
        id: c.id || `ai-gen-${idx}`,
        styleName: c.styleName || `สไตล์ AI #${idx + 1}`,
        styleDescription: c.styleDescription || "สร้างขึ้นใหม่ด้วย Gemini AI",
        captionText: c.captionText || full,
        hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
        fullPost: full,
        wordCount: countWords(full),
        charCount: full.length,
      };
    });

    return NextResponse.json({
      success: true,
      captions,
    });
  } catch (err: any) {
    console.error("Generate captions API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate captions" },
      { status: 500 }
    );
  }
}
