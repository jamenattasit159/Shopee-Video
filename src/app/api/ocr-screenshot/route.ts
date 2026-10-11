// src/app/api/ocr-screenshot/route.ts
import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/serverError';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_gemini_api_key')) {
    const err: any = new Error('กรุณาตั้งค่า GEMINI_API_KEY ใน .env.local เพื่อใช้งานฟังก์ชันอ่านภาพหน้าจอ');
    err.code = 'GEMINI_NO_KEY';
    err.status = 400;
    throw err;
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    const err: any = new Error('กรุณาเลือกไฟล์ภาพหน้าจอที่ถูกต้อง');
    err.code = 'UPLOAD_INVALID';
    err.status = 400;
    throw err;
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an OCR and e-commerce product detail extraction specialist.
Examine this screenshot of a Shopee product page and extract the visible product information.

RULES:
1. Extract ONLY facts clearly visible in the screenshot. Do not guess or hallucinate.
2. Return strictly valid JSON with this format:
{
  "productName": string or null,
  "price": number or null,
  "originalPrice": number or null,
  "promo": string or null,
  "shopName": string or null
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const rawText = response.text?.trim() || '';
  if (!rawText) {
    const err: any = new Error('ไม่สามารถอ่านข้อความจากภาพหน้าจอได้');
    err.code = 'GEMINI_BAD_JSON';
    err.status = 500;
    throw err;
  }

  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned);

  return NextResponse.json({
    ok: true,
    success: true,
    data: {
      productName: parsed.productName || null,
      price: typeof parsed.price === 'number' ? parsed.price : null,
      originalPrice: typeof parsed.originalPrice === 'number' ? parsed.originalPrice : null,
      promo: parsed.promo || null,
      shopName: parsed.shopName || null,
    },
  });
});
