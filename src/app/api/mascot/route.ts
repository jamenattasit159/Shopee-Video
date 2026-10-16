import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { getProductById, saveProduct } from "@/lib/storage";
import { MAX_MASCOT_BYTES, storeMascot } from "@/lib/mascotUpload";
import { withErrorHandling } from "@/lib/serverError";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const form = await request.formData();
  const productId = String(form.get("productId") || "");
  const product = await getProductById(productId);
  if (!product) return NextResponse.json({ error: "ไม่พบสินค้า กรุณาบันทึกสินค้าก่อนเปลี่ยนมาสคอต" }, { status: 404 });
  let mascot: Awaited<ReturnType<typeof storeMascot>> | { mascotUrl: undefined; mascotAnimation: undefined };
  if (form.get("reset") === "true") {
    mascot = { mascotUrl: undefined, mascotAnimation: undefined };
  } else {
    const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_MASCOT_BYTES || !file.size) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์มาสคอตขนาดไม่เกิน 10 MB" }, { status: 400 });
    }
    try {
      mascot = await storeMascot(Buffer.from(await file.arrayBuffer()), path.resolve("public/uploads"), "/uploads");
    } catch {
      return NextResponse.json({ error: "อ่านภาพไม่ได้ รองรับ PNG, JPG, WebP หรือ GIF ไม่เกิน 10 MB และ 120 เฟรม" }, { status: 400 });
    }
  }
  const latest = await getProductById(productId);
  if (!latest) return NextResponse.json({ error: "ไม่พบสินค้าที่กำลังเปลี่ยนมาสคอต" }, { status: 404 });
  await saveProduct({ ...latest, storyboard: { ...latest.storyboard, mascotUrl: mascot.mascotUrl, mascotAnimation: mascot.mascotAnimation } });
  return NextResponse.json({ success: true, mascot });
});
