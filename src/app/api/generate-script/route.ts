import { NextRequest, NextResponse } from "next/server";
import { generateShopeeScript } from "../../../lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, price, highlights, tone, imageCount, ctaText } = body;

    if (!productName) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
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
      success: true,
      storyboard: plan,
    });
  } catch (error: any) {
    console.error("Error generating script:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate script" },
      { status: 500 }
    );
  }
}
