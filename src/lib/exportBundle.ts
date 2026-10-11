import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import * as archiverModule from "archiver";
import sharp from "sharp";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import { ShopeeProductVideoProps, ProductRecord } from "../../remotion/types";
import { CheckResult } from "./preflight";
import { splitSafeThaiLines } from "../../remotion/lib/thaiKeep";

export interface BundleMeta {
  appVersion: string;
  createdAt: string;
  productId?: string;
  slug: string;
  styleDNA?: any;
  voicePresetId?: string;
  price?: string;
  fetchedAt?: string;
  confirmedAt?: string;
  preflightResults?: CheckResult[];
  acknowledgedWarnings?: string[];
  assetsUsed: {
    videoFile: string;
    coverFile: string;
    voiceoverUrl?: string;
    images: string[];
  };
}

export interface ExportBundleResult {
  success: boolean;
  dateStr: string;
  slug: string;
  bundleDir: string;
  files: {
    video: string;
    cover: string;
    srt: string;
    caption: string;
    meta: string;
    zip: string;
  };
  relativeDownloadPaths: {
    video: string;
    cover: string;
    srt: string;
    caption: string;
    meta: string;
    zip: string;
  };
}

/**
 * Formats seconds into SRT subtitle timestamp (00:00:01,200)
 */
function formatSrtTime(totalSec: number): string {
  const safeSec = Math.max(0, totalSec);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = Math.floor(safeSec % 60);
  const millis = Math.floor((safeSec % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

/**
 * Generates captions.srt content based on voice lines or storyboard timing
 */
export function generateSrtContent(project: ShopeeProductVideoProps): string {
  const entries: Array<{ start: number; end: number; text: string }> = [];

  if (project.voiceLines && project.voiceLines.length > 0) {
    let currentSec = 0.2;
    for (const vl of project.voiceLines) {
      const dur = vl.durationSec && vl.durationSec > 0 ? vl.durationSec : 3.0;
      const start = currentSec;
      const end = currentSec + dur;
      currentSec = end + 0.15;

      // Split lines according to Part E rules (max 18 chars/line)
      const lines = splitSafeThaiLines(vl.text, 18, 3);
      entries.push({
        start,
        end,
        text: lines.join("\n"),
      });
    }
  } else {
    // Fallback using scenes
    let currentSec = 0.2;
    if (project.hook?.headline) {
      const hookDur = project.hook.durationSec || 3;
      entries.push({
        start: currentSec,
        end: currentSec + hookDur,
        text: project.hook.headline,
      });
      currentSec += hookDur + 0.2;
    }
    (project.scenes || []).forEach((sc) => {
      const sceneDur = sc.durationSec || 3.5;
      const text = sc.highlightTitle + (sc.highlightDesc ? `\n${sc.highlightDesc}` : "");
      entries.push({
        start: currentSec,
        end: currentSec + sceneDur,
        text,
      });
      currentSec += sceneDur + 0.2;
    });
    if (project.cta?.ctaTitle) {
      const ctaDur = project.cta.durationSec || 3;
      entries.push({
        start: currentSec,
        end: currentSec + ctaDur,
        text: `${project.cta.ctaTitle}\n${project.cta.buttonText || ""}`,
      });
    }
  }

  // Format into standard SRT string
  return entries
    .map((item, index) => {
      return `${index + 1}\n${formatSrtTime(item.start)} --> ${formatSrtTime(item.end)}\n${item.text}\n`;
    })
    .join("\n");
}

/**
 * Generates caption.txt with hook, facts, hashtags, full affiliate link, and disclosure
 */
export async function generateCaptionText(
  project: ShopeeProductVideoProps,
  productRecord?: Partial<ProductRecord>
): Promise<string> {
  const prod = productRecord;
  const productName = project.productName || prod?.name || "สินค้าคุณภาพ";
  const price = project.price || prod?.price || "฿199";

  // 1. Hook Line
  const hookHeadline = project.hook?.headline || "ใครกำลังมองหาตัวนี้อยู่บอกเลยว่าห้ามพลาด!";

  // 2. Short Facts
  const factsList: string[] = [];
  if (prod?.facts) {
    if (prod.facts.brand) factsList.push(`แบรนด์: ${prod.facts.brand}`);
    if (prod.facts.productType) factsList.push(`ประเภท: ${prod.facts.productType}`);
    if (prod.facts.pack) factsList.push(`ขนาด/แพ็ก: ${prod.facts.pack}`);
  }
  if (factsList.length === 0 && prod?.highlights) {
    const splitHl = prod.highlights
      .split(/[,.\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    factsList.push(...splitHl);
  }
  const factsFormatted = factsList.map((f) => `• ${f}`).join("\n");

  // 3. Full intact affiliate URL (never trimmed)
  const affiliateUrl =
    prod?.import?.originalUrl ||
    (prod as any)?.originalUrl ||
    (project as any)?.originalUrl ||
    "";

  const linkLine = affiliateUrl
    ? `🔗 พิกัดสั่งซื้อ (Shopee): ${affiliateUrl}`
    : "🛒 พิกัด: จิ้มที่ตะกร้าส้มมุมซ้ายล่างในคลิปได้เลยจ้า";

  // 4. Hashtags
  const cleanTag = productName.replace(/[^a-zA-Z0-9ก-๙]/g, "").slice(0, 15);
  const hashtags = [
    "#ShopeeTH",
    "#Shopeeป้ายยา",
    "#รีวิวช้อปปี้",
    "#ของดีบอกต่อ",
    "#พิกัดตะกร้าส้ม",
    cleanTag ? `#${cleanTag}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // 5. Disclosure (AI voice & ad disclosure from data/disclosure.json)
  let aiVoiceDisclaimer = "🎙️ คลิปวิดีโอนี้ใช้เสียงสังเคราะห์ด้วย AI";
  let adDisclosure = "";
  try {
    const discPath = path.resolve(process.cwd(), "data", "disclosure.json");
    if (fsSync.existsSync(discPath)) {
      const raw = await fs.readFile(discPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.aiVoiceDisclaimer) aiVoiceDisclaimer = parsed.aiVoiceDisclaimer;
      if (parsed.advertisingDisclosure && parsed.advertisingDisclosure.trim()) {
        adDisclosure = parsed.advertisingDisclosure.trim();
      } else {
        adDisclosure = "[TODO: ระบุข้อความเปิดเผยโฆษณา/สปอนเซอร์ตามข้อกำหนดกฎหมาย]";
      }
    }
  } catch {
    adDisclosure = "[TODO: ระบุข้อความเปิดเผยโฆษณา/สปอนเซอร์ตามข้อกำหนดกฎหมาย]";
  }

  return `${hookHeadline}
${productName} ราคาเพียง ${price} เท่านั้น!

${factsFormatted ? `รายละเอียดเด่น:\n${factsFormatted}\n\n` : ""}${linkLine}

🎟️ โค้ดส่วนลดและส่งฟรีมีจำนวนจำกัด รีบกดสั่งซื้อก่อนหมดน้า

${hashtags}

${aiVoiceDisclaimer}
${adDisclosure}
`.trim();
}

/**
 * Creates bundle.zip from specific bundle files
 */
function createZipArchive(filesToZip: Array<{ source: string; name: string }>, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(zipPath);
    let archive: any;
    if (archiverModule && typeof (archiverModule as any).ZipArchive === "function") {
      archive = new (archiverModule as any).ZipArchive({ zlib: { level: 9 } });
    } else if (typeof (archiverModule as any).default === "function") {
      archive = (archiverModule as any).default("zip", { zlib: { level: 9 } });
    } else if (typeof archiverModule === "function") {
      archive = (archiverModule as any)("zip", { zlib: { level: 9 } });
    } else {
      reject(new Error("Archiver zip instance could not be constructed"));
      return;
    }

    output.on("close", () => resolve());
    archive.on("error", (err: any) => reject(err));

    archive.pipe(output);
    for (const f of filesToZip) {
      if (fsSync.existsSync(f.source)) {
        archive.file(f.source, { name: f.name });
      }
    }
    archive.finalize();
  });
}

/**
 * Renders cover image using Remotion CoverStill composition or Sharp fallback
 */
async function renderCoverImage(
  project: ShopeeProductVideoProps,
  outputPath: string
): Promise<void> {
  try {
    const entryPoint = path.resolve(process.cwd(), "remotion", "index.ts");
    const publicDir = path.resolve(process.cwd(), "public");

    const bundleLocation = await bundle({ entryPoint, publicDir });
    const compositions = await getCompositions(bundleLocation, { inputProps: project });
    const comp = compositions.find((c) => c.id === "CoverStill") || compositions.find((c) => c.id === "ShopeeProductVideo");

    if (comp) {
      await renderStill({
        composition: comp,
        serveUrl: bundleLocation,
        output: outputPath,
        inputProps: project,
        imageFormat: "jpeg",
        jpegQuality: 92,
      });
      return;
    }
  } catch (err: any) {
    console.warn("[exportBundle] Remotion renderStill cover failed, using Sharp high-res fallback:", err?.message);
  }

  // Sharp fallback
  const firstImage = (project.images && project.images[0]) || "/samples/tumbler-1.svg";
  const firstImagePath = path.resolve(process.cwd(), "public", firstImage.replace(/^\//, ""));

  if (fsSync.existsSync(firstImagePath)) {
    try {
      await sharp(firstImagePath)
        .resize(1080, 1920, { fit: "cover", position: "center" })
        .jpeg({ quality: 90 })
        .toFile(outputPath);
      return;
    } catch (sharpErr) {
      console.warn("[exportBundle] Sharp cover creation failed:", sharpErr);
    }
  }

  // Blank canvas fallback if no image
  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 3,
      background: { r: 245, g: 245, b: 244 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

/**
 * Creates full Export Bundle in exports/<YYYY-MM-DD>/<slug>/
 */
export async function createExportBundle(params: {
  renderedVideoPath: string;
  project: ShopeeProductVideoProps;
  productRecord?: Partial<ProductRecord>;
  preflightResults?: CheckResult[];
  acknowledgedWarnings?: string[];
}): Promise<ExportBundleResult> {
  const { renderedVideoPath, project, productRecord, preflightResults, acknowledgedWarnings } = params;

  // 1. Generate date & slug folder
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const rawTitle = project.productName || productRecord?.name || "clip";
  const sanitizedSlug = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30)
    .replace(/^-|-$/g, "");
  const slug = `${sanitizedSlug || "video"}-${Date.now().toString().slice(-4)}`;

  const bundleDir = path.resolve(process.cwd(), "exports", dateStr, slug);
  await fs.mkdir(bundleDir, { recursive: true });

  // File paths
  const videoDest = path.join(bundleDir, "video.mp4");
  const coverDest = path.join(bundleDir, "cover.jpg");
  const srtDest = path.join(bundleDir, "captions.srt");
  const captionDest = path.join(bundleDir, "caption.txt");
  const metaDest = path.join(bundleDir, "meta.json");
  const zipDest = path.join(bundleDir, "bundle.zip");

  // 2. Copy rendered video.mp4
  const sourceVideoPath = path.isAbsolute(renderedVideoPath)
    ? renderedVideoPath
    : path.resolve(process.cwd(), renderedVideoPath.replace(/^\//, ""));

  if (fsSync.existsSync(sourceVideoPath)) {
    await fs.copyFile(sourceVideoPath, videoDest);
  } else {
    throw new Error(`Rendered video file not found at: ${sourceVideoPath}`);
  }

  // 3. Render cover.jpg
  await renderCoverImage(project, coverDest);

  // 4. Generate captions.srt
  const srtContent = generateSrtContent(project);
  await fs.writeFile(srtDest, srtContent, "utf-8");

  // 5. Generate caption.txt
  const captionContent = await generateCaptionText(project, productRecord);
  await fs.writeFile(captionDest, captionContent, "utf-8");

  // 6. Generate meta.json
  let appVersion = "1.0.0";
  try {
    const pkgRaw = await fs.readFile(path.resolve(process.cwd(), "package.json"), "utf-8");
    appVersion = JSON.parse(pkgRaw).version || "1.0.0";
  } catch {
    // ignore
  }

  const metaData: BundleMeta = {
    appVersion,
    createdAt: now.toISOString(),
    productId: productRecord?.id,
    slug,
    styleDNA: project.styleDNA,
    voicePresetId: project.voicePresetId || productRecord?.voicePresetId,
    price: project.price || productRecord?.price,
    fetchedAt: productRecord?.import?.fetchedAt,
    confirmedAt: productRecord?.import?.confirmedAt || (productRecord as any)?.confirmedAt,
    preflightResults,
    acknowledgedWarnings,
    assetsUsed: {
      videoFile: "video.mp4",
      coverFile: "cover.jpg",
      voiceoverUrl: project.voiceoverUrl,
      images: project.images || [],
    },
  };
  await fs.writeFile(metaDest, JSON.stringify(metaData, null, 2), "utf-8");

  // 7. Generate bundle.zip
  await createZipArchive(
    [
      { source: videoDest, name: "video.mp4" },
      { source: coverDest, name: "cover.jpg" },
      { source: srtDest, name: "captions.srt" },
      { source: captionDest, name: "caption.txt" },
      { source: metaDest, name: "meta.json" },
    ],
    zipDest
  );

  return {
    success: true,
    dateStr,
    slug,
    bundleDir,
    files: {
      video: videoDest,
      cover: coverDest,
      srt: srtDest,
      caption: captionDest,
      meta: metaDest,
      zip: zipDest,
    },
    relativeDownloadPaths: {
      video: `/api/exports?date=${dateStr}&slug=${slug}&file=video.mp4`,
      cover: `/api/exports?date=${dateStr}&slug=${slug}&file=cover.jpg`,
      srt: `/api/exports?date=${dateStr}&slug=${slug}&file=captions.srt`,
      caption: `/api/exports?date=${dateStr}&slug=${slug}&file=caption.txt`,
      meta: `/api/exports?date=${dateStr}&slug=${slug}&file=meta.json`,
      zip: `/api/exports?date=${dateStr}&slug=${slug}&file=bundle.zip`,
    },
  };
}
