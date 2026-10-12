import { NextRequest, NextResponse } from "next/server";
import { generateShopeeScript } from "@/lib/gemini";
import { generateShopeeScriptWithClaude } from "@/lib/claude";
import { withErrorHandling } from "@/lib/serverError";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const {
    productName,
    price,
    highlights,
    tone,
    imageCount,
    ctaText,
    modelProvider = "claude",
  } = body;

  if (!productName || !productName.trim()) {
    const err: any = new Error("จำเป็นต้องระบุชื่อสินค้า");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const params = {
    productName,
    price: price || "฿199",
    highlights: highlights || "สินค้าคุณภาพ ดีไซน์สวย ใช้งานง่าย",
    tone: tone || "exciting",
    imageCount: Number(imageCount) || 3,
    ctaText: ctaText || "พิกัดในตะกร้าส้มซ้ายล่าง",
  };

  let plan;
  let providerUsed = "gemini";
  let modelUsed = "gemini-2.5-flash";
  let fallbackNotice: string | undefined;

  if (modelProvider === "gemini") {
    plan = await generateShopeeScript(params);
    providerUsed = "gemini";
    modelUsed = "gemini-2.5-flash";
  } else {
    // Default to Claude (Fable 5.1) with automatic resilient Gemini fallback
    const result = await generateShopeeScriptWithClaude(params);
    plan = result.storyboard;
    providerUsed = result.provider;
    modelUsed = result.model;
    fallbackNotice = result.fallbackNotice;
  }

  return NextResponse.json({
    ok: true,
    success: true,
    storyboard: plan,
    provider: providerUsed,
    model: modelUsed,
    fallbackNotice,
  });
});
