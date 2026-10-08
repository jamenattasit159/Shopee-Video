import { NextRequest, NextResponse } from "next/server";
import { humanizeProductCopy } from "../../../lib/humanizer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุข้อความสินค้าที่ต้องการปรับปรุง" },
        { status: 400 }
      );
    }

    const result = await humanizeProductCopy(rawText);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error humanizing text:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to humanize text" },
      { status: 500 }
    );
  }
}
