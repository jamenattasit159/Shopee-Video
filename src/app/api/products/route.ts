import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { ProductRecord } from "../../../../remotion/types";
import { generateShopeeScript } from "@/lib/gemini";
import { generateShopeeScriptWithClaude } from "@/lib/claude";
import { ensureStorageDirectories, getProducts, saveProduct } from "@/lib/storage";
import { withErrorHandling } from "@/lib/serverError";

export const GET = withErrorHandling(async () => {
  const products = await getProducts();
  return NextResponse.json({ ok: true, success: true, products });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await ensureStorageDirectories();
  const formData = await req.formData();

  const id = (formData.get("id") as string) || `prod_${Date.now()}`;
  const name = (formData.get("name") as string) || "สินค้า Shopee";
  const price = (formData.get("price") as string) || "฿199";
  const highlights = (formData.get("highlights") as string) || "";
  const tone = (formData.get("tone") as string) || "exciting";
  const cta = (formData.get("cta") as string) || "พิกัดในตะกร้าส้มซ้ายล่าง";
  const category = (formData.get("category") as string) || undefined;
  const promoTag = (formData.get("promoTag") as string) || undefined;

  let facts;
  const rawFacts = formData.get("facts") as string;
  if (rawFacts) {
    try {
      facts = JSON.parse(rawFacts);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse facts JSON:", parseErr);
    }
  }

  let importMeta;
  const rawImport = formData.get("importMeta") as string;
  if (rawImport) {
    try {
      importMeta = JSON.parse(rawImport);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse importMeta JSON:", parseErr);
    }
  }

  const savedImagePaths: string[] = [];

  // Check for existing images passed in as JSON or repeated fields
  const existingImagesRaw = formData.get("existingImages");
  if (existingImagesRaw) {
    try {
      const parsed = JSON.parse(existingImagesRaw as string);
      if (Array.isArray(parsed)) {
        savedImagePaths.push(...parsed);
      }
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse existingImages JSON:", parseErr);
    }
  }

  // Process uploaded file(s)
  const files = formData.getAll("files") as File[];
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Sanitize extension
      const originalName = file.name || `image_${i}.jpg`;
      const ext = path.extname(originalName) || ".jpg";
      const sanitizedBase = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${Date.now()}_${i}_${sanitizedBase}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      await fs.writeFile(filePath, buffer);
      savedImagePaths.push(`/uploads/${filename}`);
    }
  }

  // Fallback to sample images if no images were provided
  if (savedImagePaths.length === 0) {
    savedImagePaths.push(
      "/samples/tumbler-1.svg",
      "/samples/tumbler-2.svg",
      "/samples/tumbler-3.svg"
    );
  }

  // Check if a custom storyboard was passed
  const storyboardRaw = formData.get("storyboard") as string;
  let storyboard;
  if (storyboardRaw) {
    try {
      storyboard = JSON.parse(storyboardRaw);
    } catch (parseErr) {
      console.warn("[Products API] Failed to parse storyboard JSON, generating fresh:", parseErr);
    }
  }

  if (!storyboard) {
    const aiProvider = (formData.get("aiProvider") as string) || "claude";
    const scriptParams = {
      productName: name,
      price,
      highlights,
      tone,
      imageCount: savedImagePaths.length,
      ctaText: cta,
      category,
      promoTag,
      facts,
    };

    if (aiProvider === "gemini") {
      storyboard = await generateShopeeScript(scriptParams);
    } else {
      const claudeRes = await generateShopeeScriptWithClaude(scriptParams);
      storyboard = claudeRes.storyboard;
    }
  }

  const productRecord: ProductRecord = {
    id,
    name,
    price,
    highlights,
    tone,
    cta,
    images: savedImagePaths,
    storyboard,
    createdAt: new Date().toISOString(),
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
