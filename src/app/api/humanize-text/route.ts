import { NextRequest, NextResponse } from "next/server";
import { humanizeProductCopy } from "@/lib/humanizer";
import { withErrorHandling } from "@/lib/serverError";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { rawText } = body;

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    const err: any = new Error("กรุณาระบุข้อความสินค้าที่ต้องการปรับปรุง");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const result = await humanizeProductCopy(rawText);

  return NextResponse.json({
    ok: true,
    success: true,
    data: result,
  });
});
