import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PackId, ProductRecord } from "../../../../remotion/types";
import { generateShopeeScript } from "@/lib/gemini";
import { generateShopeeScriptWithClaude } from "@/lib/claude";
import { pickStyleDNA } from "@/lib/styleDirector";
import {
  clearAllProducts,
  deduplicateProducts,
  deleteProduct,
  ensureStorageDirectories,
  getProductById,
  getProducts,
  saveProduct,
} from "@/lib/storage";
import { withErrorHandling } from "@/lib/serverError";

export const GET = withErrorHandling(async () => {
  const products = await getProducts();
  return NextResponse.json({ ok: true, success: true, products });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const mode = url.searchParams.get("mode");

  if (mode === "deduplicate") {
    const { products, removedCount } = await deduplicateProducts();
    return NextResponse.json({
      ok: true,
      success: true,
      products,
      removedCount,
      message: `ลบรายการซ้ำออก ${removedCount} รายการเรียบร้อยแล้ว`,
    });
  }

  if (mode === "clear-all") {
    const products = await clearAllProducts();
    return NextResponse.json({
      ok: true,
      success: true,
      products,
      message: "ล้างรายการสินค้าทั้งหมดเรียบร้อยแล้ว",
    });
  }

  if (!id) {
    const err: any = new Error("กรุณาระบุรหัสสินค้า (id) ที่ต้องการลบ");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const products = await deleteProduct(id);
  return NextResponse.json({
    ok: true,
    success: true,
    products,
    message: "ลบรายการสินค้าเรียบร้อยแล้ว",
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await ensureStorageDirectories();
  const formData = await req.formData();

  const id = (formData.get("id") as string) || `prod_${Date.now()}`;
  const existingRecord = await getProductById(id);

  const name = (formData.get("name") as string) || existingRecord?.name || "สินค้า Shopee";
  const price = (formData.get("price") as string) || existingRecord?.price || "฿199";
  const highlights = (formData.get("highlights") as string) ?? existingRecord?.highlights ?? "";
  const tone = (formData.get("tone") as string) || existingRecord?.tone || "exciting";
  const cta = (formData.get("cta") as string) || existingRecord?.cta || "พิกัดในตะกร้าส้มซ้ายล่าง";
  const category = (formData.get("category") as string) || existingRecord?.category || undefined;
  const promoTag = (formData.get("promoTag") as string) || existingRecord?.promoTag || undefined;
  const styleMode = (formData.get("styleMode") as string) || "auto";
  const chosenPack = (formData.get("chosenPack") as PackId) || undefined;
  const keepStoryboard = formData.get("keepStoryboard") === "true";

  let facts = existingRecord?.facts;
  const rawFacts = formData.get("facts") as string;
  if (rawFacts) {
    try {
      facts = JSON.parse(rawFacts);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse facts JSON:", parseErr);
    }
  }

  let importMeta = existingRecord?.import;
  const rawImport = formData.get("importMeta") as string;
  if (rawImport) {
    try {
      importMeta = JSON.parse(rawImport);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse importMeta JSON:", parseErr);
    }
  }

  const savedMediaPaths: string[] = [];

  // 1. Preserve existing server images/videos passed in as JSON
  const existingImagesRaw = formData.get("existingImages");
  if (existingImagesRaw) {
    try {
      const parsed = JSON.parse(existingImagesRaw as string);
      if (Array.isArray(parsed)) {
        savedMediaPaths.push(...parsed.filter((u) => typeof u === "string" && !u.startsWith("blob:")));
      }
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse existingImages JSON:", parseErr);
    }
  }

  // 2. Process newly uploaded file(s) — supports both images (JPG, PNG, WebP) and video clips (MP4, MOV, WebM, M4V)
  const files = formData.getAll("files") as File[];
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const originalName = file.name || `media_${i}.jpg`;
      const ext = (path.extname(originalName) || ".jpg").toLowerCase();
      const sanitizedBase = path
        .basename(originalName, path.extname(originalName))
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${Date.now()}_${i}_${sanitizedBase || "media"}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      await fs.writeFile(filePath, buffer);
      savedMediaPaths.push(`/uploads/${filename}`);
    }
  }

  // Fallback to sample images if no media was provided
  if (savedMediaPaths.length === 0) {
    savedMediaPaths.push(
      "/samples/tumbler-1.svg",
      "/samples/tumbler-2.svg",
      "/samples/tumbler-3.svg"
    );
  }

  // Check if a custom storyboard was passed or if we should keep existingRecord.storyboard
  const storyboardRaw = formData.get("storyboard") as string;
  let storyboard = keepStoryboard && existingRecord?.storyboard ? existingRecord.storyboard : undefined;
  if (storyboardRaw) {
    try {
      storyboard = JSON.parse(storyboardRaw);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse storyboard JSON, generating fresh:", parseErr);
    }
  }

  // Prepare StyleDNA
  const initialStyleDNA =
    (styleMode === "custom" && chosenPack
      ? pickStyleDNA({ productId: name, lockedPack: chosenPack })
      : existingRecord?.styleDNA) ||
    pickStyleDNA({
      productId: name,
      lockedPack: styleMode === "custom" && chosenPack ? chosenPack : undefined,
    });

  if (!storyboard) {
    const aiProvider = (formData.get("aiProvider") as string) || "claude";
    const scriptParams = {
      productName: name,
      price,
      highlights,
      tone,
      imageCount: savedMediaPaths.length,
      ctaText: cta,
      category,
      promoTag,
      facts,
      styleDNA: initialStyleDNA,
    };

    if (aiProvider === "gemini") {
      storyboard = await generateShopeeScript(scriptParams);
    } else {
      const claudeRes = await generateShopeeScriptWithClaude(scriptParams);
      storyboard = claudeRes.storyboard;
    }
  } else if (styleMode === "custom" && chosenPack) {
    storyboard = {
      ...storyboard,
      styleDNA: initialStyleDNA,
    };
  }

  if (storyboard && !storyboard.styleDNA) {
    storyboard.styleDNA = initialStyleDNA;
  }
  if (storyboard && !storyboard.captionSettings) {
    storyboard.captionSettings = {
      enabled: true,
      style: "tiktok-pop",
      position: "bottom",
      language: "th",
      highlightColor: "#FACC15",
    };
  }

  const productRecord: ProductRecord = {
    id,
    name,
    price,
    highlights,
    tone,
    cta,
    images: savedMediaPaths,
    storyboard,
    styleDNA: storyboard?.styleDNA || initialStyleDNA,
    voiceoverUrl: keepStoryboard ? existingRecord?.voiceoverUrl : undefined,
    voiceoverDurationSec: keepStoryboard ? existingRecord?.voiceoverDurationSec : undefined,
    renderedVideoUrl: keepStoryboard ? existingRecord?.renderedVideoUrl : undefined,
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    import: importMeta,
    category,
    promoTag,
    facts,
  };

  await saveProduct(productRecord);

  return NextResponse.json({
    ok: true,
    success: true,
    product: productRecord,
  });
});
