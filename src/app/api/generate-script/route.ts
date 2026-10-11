import { NextRequest, NextResponse } from "next/server";
import { generateShopeeScript } from "@/lib/gemini";
import { withErrorHandling } from "@/lib/serverError";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { productName, price, highlights, tone, imageCount, ctaText } = body;

  if (!productName || !productName.trim()) {
    const err: any = new Error("จำเป็นต้องระบุชื่อสินค้า");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const plan = await generateShopeeScript({
    productName,
    price: price || "฿199",
    highlights: highlights || "สินค้าคุณภาพ ดีไซน์สวย ใช้งานง่าย",
    tone: tone || "exciting",
    imageCount: Number(imageCount) || 3,
    ctaText: ctaText || "พิกัดในตะกร้าส้มซ้ายล่าง",
  });

  return NextResponse.json({
    ok: true,
    success: true,
    storyboard: plan,
  });
});
