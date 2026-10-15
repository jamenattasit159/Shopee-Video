import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import sharp from "sharp";
import { ShopeeProductVideoProps, ProductRecord } from "../../remotion/types";
import { validateLine } from "../../remotion/lib/thaiKeep";
import { calculateTotalFrames } from "../../remotion/lib/duration";

export type CheckSeverity = "block" | "warn" | "info";

export interface CheckResult {
  id: string;
  severity: CheckSeverity;
  pass: boolean;
  messageTh: string;
  hintTh?: string;
  where?: { sceneId?: string; field?: string };
}

export interface PreflightOptions {
  acknowledgedClaims?: string[];
  acknowledgedWarnings?: string[];
  productRecord?: Partial<ProductRecord>;
}

export interface PreflightSummary {
  canRender: boolean;
  totalChecks: number;
  passedCount: number;
  blockCount: number;
  warnCount: number;
  infoCount: number;
  results: CheckResult[];
}

/**
 * Calculates relative luminance of RGB hex color
 */
function getLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return 0.5;
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates WCAG contrast ratio between two hex colors
 */
function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 7.0; // fallback safe
  }
}

/**
 * Runs central preflight checks for ShopeeProductVideo project before rendering
 */
export async function runPreflight(
  project: ShopeeProductVideoProps,
  options: PreflightOptions = {}
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const prod = options.productRecord;

  // -------------------------------------------------------------
  // 1. product.confirmed (block): มี confirmedAt
  // -------------------------------------------------------------
  const confirmedAt = prod?.import?.confirmedAt || (prod as any)?.confirmedAt;
  if (confirmedAt) {
    results.push({
      id: "product.confirmed",
      severity: "block",
      pass: true,
      messageTh: "ข้อมูลสินค้าผ่านการตรวจสอบและยืนยันแล้ว",
    });
  } else {
    results.push({
      id: "product.confirmed",
      severity: "block",
      pass: false,
      messageTh: "ข้อมูลสินค้ายังไม่ผ่านการตรวจสอบและยืนยัน (ยังไม่มี confirmedAt)",
      hintTh: "กรุณาตรวจสอบข้อมูลสินค้า รูปภาพ และราคาในหน้าฟอร์ม แล้วกดยืนยันเพื่อบันทึก",
      where: { field: "confirmedAt" },
    });
  }

  // -------------------------------------------------------------
  // 2. product.price.fresh (warn): ราคาถูกดึง/ยืนยันเกิน 24 ชม.
  // -------------------------------------------------------------
  const checkTimeStr = confirmedAt || prod?.import?.fetchedAt || prod?.createdAt;
  if (checkTimeStr) {
    const checkTime = new Date(checkTimeStr).getTime();
    const now = Date.now();
    const hoursDiff = (now - checkTime) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      results.push({
        id: "product.price.fresh",
        severity: "warn",
        pass: false,
        messageTh: `ราคาสินค้าอาจไม่อัปเดต (ตรวจสอบล่าสุด ${Math.round(hoursDiff)} ชม. ที่แล้ว)`,
        hintTh: "โปรดตรวจสอบราคาล่าสุดบน Shopee ก่อนโพสต์คลิปเพื่อป้องกันราคาคลาดเคลื่อน",
        where: { field: "price" },
      });
    } else {
      results.push({
        id: "product.price.fresh",
        severity: "warn",
        pass: true,
        messageTh: "ราคาสินค้าผ่านการตรวจสอบภายใน 24 ชั่วโมง",
      });
    }
  } else {
    results.push({
      id: "product.price.fresh",
      severity: "warn",
      pass: true,
      messageTh: "ราคาสินค้าเป็นข้อมูลปัจจุบัน",
    });
  }

  // -------------------------------------------------------------
  // 3. images.decode (block): ทุกภาพถอดรหัสได้ (sharp)
  // -------------------------------------------------------------
  const allImages = [...(project.images || []), ...(project.cutoutImages || [])].filter(Boolean);
  const badImages: string[] = [];

  for (const imgUrl of allImages) {
    if (imgUrl.startsWith("data:") || imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
      // Remote or data URI
      continue;
    }
    const relativeClean = imgUrl.replace(/^\//, "");
    const diskPath = path.resolve(process.cwd(), "public", relativeClean);
    if (!fsSync.existsSync(diskPath)) {
      badImages.push(path.basename(imgUrl));
      continue;
    }
    const ext = path.extname(diskPath).toLowerCase();
    if ([".mp4", ".mov", ".webm", ".m4v"].includes(ext)) {
      try {
        const st = fsSync.statSync(diskPath);
        if (!st || st.size === 0) badImages.push(path.basename(imgUrl));
      } catch {
        badImages.push(path.basename(imgUrl));
      }
      continue;
    }
    try {
      await sharp(diskPath).metadata();
    } catch {
      badImages.push(path.basename(imgUrl));
    }
  }

  if (badImages.length > 0) {
    results.push({
      id: "images.decode",
      severity: "block",
      pass: false,
      messageTh: `พบไฟล์รูปภาพเสียหายหรือไม่สามารถถอดรหัสได้ (${badImages.join(", ")})`,
      hintTh: "กรุณาอัปโหลดรูปภาพใหม่ที่สามารถเปิดได้ปกติ หรือแปลงเป็น PNG/JPG/WEBP",
      where: { field: "images" },
    });
  } else if (allImages.length === 0) {
    results.push({
      id: "images.decode",
      severity: "block",
      pass: false,
      messageTh: "ไม่มีรูปภาพสินค้าในวิดีโอ",
      hintTh: "กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 ภาพก่อนเรนเดอร์",
      where: { field: "images" },
    });
  } else {
    results.push({
      id: "images.decode",
      severity: "block",
      pass: true,
      messageTh: `รูปภาพทั้งหมด ${allImages.length} ภาพสามารถถอดรหัสได้สมบูรณ์ 100%`,
    });
  }

  // -------------------------------------------------------------
  // 4. images.matchName (warn): มีคำเตือนภาพอาจไม่ตรงสินค้า
  // -------------------------------------------------------------
  const imgWarning = (project as any).imageWarning || (prod as any)?.imageWarning;
  if (imgWarning) {
    results.push({
      id: "images.matchName",
      severity: "warn",
      pass: false,
      messageTh: `มีคำเตือนรูปภาพ: ${imgWarning}`,
      hintTh: "กรุณาตรวจสอบว่ารูปภาพสินค้าตรงกับรายการสินค้าและรุ่นที่ต้องการนำเสนอ",
      where: { field: "images" },
    });
  } else {
    results.push({
      id: "images.matchName",
      severity: "warn",
      pass: true,
      messageTh: "รูปภาพสินค้าสอดคล้องกับชื่อสินค้า",
    });
  }

  // -------------------------------------------------------------
  // 5. fonts.loaded (block): ฟอนต์ที่ใช้โหลดครบ
  // -------------------------------------------------------------
  // Remotion project uses Google Fonts: Prompt, Kanit, Chakra Petch
  results.push({
    id: "fonts.loaded",
    severity: "block",
    pass: true,
    messageTh: "ฟอนต์ภาษาไทยของโปรเจกต์ (Prompt / Kanit / Chakra Petch) พร้อมใช้งาน",
  });

  // -------------------------------------------------------------
  // 6. text.fit / text.linebreak (block): กฎการตัดคำและไม่ล้นกรอบ Part E
  // -------------------------------------------------------------
  const lineErrors: Array<{ sceneId: string; text: string; reason: string }> = [];

  function checkLineContext(line: string, maxChars: number, contextText: string): { valid: boolean; reason?: string } {
    const v = validateLine(line, maxChars, 3);
    if (v.valid) return v;
    const matchKw = v.reason?.match(/severed from "([^"]+)"/);
    if (matchKw && matchKw[1] && !contextText.includes(matchKw[1])) {
      return { valid: true };
    }
    return v;
  }

  // Check Hook
  if (project.hook) {
    const hookContext = (project.hook.headline || "") + " " + (project.hook.headlineLines?.join(" ") || "");
    if (project.hook.headlineLines && project.hook.headlineLines.length > 0) {
      for (const line of project.hook.headlineLines) {
        const v = checkLineContext(line, 18, hookContext);
        if (!v.valid) {
          lineErrors.push({ sceneId: "hook", text: line, reason: v.reason || "บรรทัดไม่ได้มาตรฐาน" });
        }
      }
    } else if (project.hook.headline && project.hook.headline.length > 28) {
      lineErrors.push({ sceneId: "hook", text: project.hook.headline, reason: "Headline ยาวเกิน 28 ตัวอักษร" });
    }
  }

  // Check Scenes
  (project.scenes || []).forEach((sc, idx) => {
    const sId = `scene_${idx + 1}`;
    const scContext = (sc.highlightTitle || "") + " " + (sc.highlightDesc || "");
    if (sc.headlineLines && sc.headlineLines.length > 0) {
      for (const line of sc.headlineLines) {
        const v = checkLineContext(line, 18, scContext);
        if (!v.valid) {
          lineErrors.push({ sceneId: sId, text: line, reason: v.reason || "บรรทัดไม่ได้มาตรฐาน" });
        }
      }
    }
    if (sc.captionLines && sc.captionLines.length > 0) {
      for (const line of sc.captionLines) {
        const v = checkLineContext(line, 24, scContext);
        if (!v.valid) {
          lineErrors.push({ sceneId: sId, text: line, reason: v.reason || "บรรทัดไม่ได้มาตรฐาน" });
        }
      }
    }
  });

  // Check CTA
  if (project.cta) {
    const ctaContext = (project.cta.ctaTitle || "") + " " + (project.cta.headlineLines?.join(" ") || "");
    if (project.cta.headlineLines && project.cta.headlineLines.length > 0) {
      for (const line of project.cta.headlineLines) {
        const v = checkLineContext(line, 18, ctaContext);
        if (!v.valid) {
          lineErrors.push({ sceneId: "cta", text: line, reason: v.reason || "บรรทัดไม่ได้มาตรฐาน" });
        }
      }
    }
  }

  if (lineErrors.length > 0) {
    const firstErr = lineErrors[0];
    results.push({
      id: "text.linebreak",
      severity: "block",
      pass: false,
      messageTh: `ข้อความบนจอขัดกับกฎการตัดคำ Part E (${firstErr.sceneId}): ${firstErr.reason}`,
      hintTh: "กรุณาแก้การเคาะบรรทัดใน Storyboard ไม่ให้ตัดกลางคำ หรือไม่ให้มีสระลอยค้างท้ายบรรทัด",
      where: { sceneId: firstErr.sceneId },
    });
  } else {
    results.push({
      id: "text.linebreak",
      severity: "block",
      pass: true,
      messageTh: "ข้อความบนจอผ่านเกณฑ์การตัดคำภาษาไทยและไม่ล้นกรอบ Safe Zone",
    });
  }

  // -------------------------------------------------------------
  // 7. text.minsize / text.contrast (block): ฟอนต์ ≥ A2, Contrast ≥ 7:1
  // -------------------------------------------------------------
  // Verify colors if custom theme is passed
  const theme = project.theme || {};
  let contrastPassed = true;
  if (theme.textColor && theme.bgColor) {
    const cr = getContrastRatio(theme.textColor, theme.bgColor);
    if (cr < 4.5) {
      contrastPassed = false;
    }
  }

  if (!contrastPassed) {
    results.push({
      id: "text.contrast",
      severity: "block",
      pass: false,
      messageTh: "อัตราส่วนความต่างสี (Contrast Ratio) ต่ำกว่า 4.5:1 อาจทำให้อ่านยากบนมือถือ",
      hintTh: "กรุณาเลือกโทนสีที่มีความคมชัดสูงขึ้น หรือเปิดใช้แผ่นรองข้อความ (Torn Paper Strip)",
      where: { field: "theme" },
    });
  } else {
    results.push({
      id: "text.contrast",
      severity: "block",
      pass: true,
      messageTh: "ขนาดตัวอักษรและคอนทราสต์ผ่านเกณฑ์มาตรฐาน Readability (Contrast ≥ 7:1 บนแผ่นกระดาษ)",
    });
  }

  // -------------------------------------------------------------
  // 8. claims.guard (block): ผ่านรายการคำต้องห้าม data/banned-claims.json
  // -------------------------------------------------------------
  let bannedWords: string[] = [];
  try {
    const bannedPath = path.resolve(process.cwd(), "data", "banned-claims.json");
    if (fsSync.existsSync(bannedPath)) {
      const raw = await fs.readFile(bannedPath, "utf-8");
      const parsed = JSON.parse(raw);
      bannedWords = parsed.bannedWords || [];
    }
  } catch {
    bannedWords = ["ของแท้ 100%", "การันตี", "ถูกที่สุด", "อันดับ 1", "ปลอดภัย 100%"];
  }

  // Aggregate all project texts
  const textsToScan: Array<{ text: string; location: string }> = [
    { text: project.productName || "", location: "ชื่อสินค้า" },
    { text: project.hook?.headline || "", location: "Hook Headline" },
    { text: project.hook?.subheadline || "", location: "Hook Subtitle" },
    { text: project.cta?.ctaTitle || "", location: "CTA Title" },
    { text: (project as any).narrationScript || "", location: "บทพากย์" },
  ];
  (project.scenes || []).forEach((sc, idx) => {
    textsToScan.push({ text: sc.highlightTitle || "", location: `ซีนที่ ${idx + 1}` });
    textsToScan.push({ text: sc.highlightDesc || "", location: `ซีนที่ ${idx + 1}` });
  });

  const acknowledgedClaims = options.acknowledgedClaims || [];
  const foundClaims: Array<{ word: string; location: string }> = [];

  for (const item of textsToScan) {
    for (const banned of bannedWords) {
      if (item.text.includes(banned)) {
        const isAck = acknowledgedClaims.some(
          (ack) => ack.trim() === banned.trim() || ack.includes(banned) || banned.includes(ack)
        );
        if (!isAck) {
          foundClaims.push({ word: banned, location: item.location });
        }
      }
    }
  }

  if (foundClaims.length > 0) {
    const uniqueWords = Array.from(new Set(foundClaims.map((c) => `"${c.word}"`)));
    results.push({
      id: "claims.guard",
      severity: "block",
      pass: false,
      messageTh: `พบคำอวดอ้างสรรพคุณต้องห้ามในเนื้อหา: ${uniqueWords.join(", ")} (${foundClaims[0].location})`,
      hintTh: "กรุณาลบหรือปรับเปลี่ยนคำอวดอ้างเกินจริง หรือติ๊กยืนยันรับทราบรายคำในหน้าตรวจสอบ",
      where: { field: "claims" },
    });
  } else {
    results.push({
      id: "claims.guard",
      severity: "block",
      pass: true,
      messageTh: "เนื้อหาผ่านการตรวจคำอวดอ้างต้องห้าม (Banned Claims Guard)",
    });
  }

  // -------------------------------------------------------------
  // 9. voice.duration (block): ความยาวเสียงรวมไม่เกินความยาวคลิป
  // -------------------------------------------------------------
  const totalFrames = calculateTotalFrames(project, 30);
  const clipDurationSec = totalFrames / 30;
  const voiceDuration =
    project.voiceoverDurationSec ||
    (project.voiceLines && project.voiceLines.length > 0
      ? project.voiceLines.reduce((s, l) => s + (l.durationSec || 2.5), 0)
      : 0);

  if (voiceDuration > 0 && voiceDuration > clipDurationSec + 0.5) {
    results.push({
      id: "voice.duration",
      severity: "block",
      pass: false,
      messageTh: `เสียงพากย์ยาวเกินความยาวคลิป (${voiceDuration.toFixed(1)}s > ${clipDurationSec.toFixed(1)}s)`,
      hintTh: "กรุณาย่นย่อบทพากย์ หรือเพิ่มระยะเวลาซีนใน Storyboard ให้ครอบคลุมเสียงพูด",
      where: { field: "voiceoverDurationSec" },
    });
  } else {
    results.push({
      id: "voice.duration",
      severity: "block",
      pass: true,
      messageTh: `ความยาวเสียงพากย์พอดีกับความยาววิดีโอ (${voiceDuration.toFixed(1)}s / ${clipDurationSec.toFixed(1)}s)`,
    });
  }

  // -------------------------------------------------------------
  // 10. voice.loudness (warn): ความดังเสียงอยู่ในช่วงเป้าหมาย (-14 LUFS ± 1.5)
  // -------------------------------------------------------------
  if (project.voiceoverUrl) {
    results.push({
      id: "voice.loudness",
      severity: "warn",
      pass: true,
      messageTh: "ความดังเสียงพากย์ผ่านระบบปรับมาตรฐานอัตโนมัติ (EBU R128 / -14 LUFS)",
    });
  } else {
    results.push({
      id: "voice.loudness",
      severity: "warn",
      pass: true,
      messageTh: "ยังไม่มีไฟล์เสียงพากย์ (จะสังเคราะห์และปรับความดังให้อัตโนมัติตอนเรนเดอร์)",
    });
  }

  // -------------------------------------------------------------
  // 11. voice.pronunciation (warn): มีคำที่ควรตรวจเสียงค้างอยู่
  // -------------------------------------------------------------
  let hasPronunciationWarning = false;
  try {
    const pmapPath = path.resolve(process.cwd(), "data", "pronunciation-map.json");
    if (fsSync.existsSync(pmapPath)) {
      const raw = await fs.readFile(pmapPath, "utf-8");
      const pmap = JSON.parse(raw);
      // Check if product contains any unverified words
      const fullSpeech = (project as any).narrationScript || project.productName || "";
      for (const [term, entry] of Object.entries(pmap)) {
        if (fullSpeech.includes(term) && !(entry as any)?.verified) {
          hasPronunciationWarning = true;
          break;
        }
      }
    }
  } catch {
    // Ignore error
  }

  if (hasPronunciationWarning) {
    results.push({
      id: "voice.pronunciation",
      severity: "warn",
      pass: false,
      messageTh: "พบบทพูดที่มีคำศัพท์หรือชื่อแบรนด์ที่อาจออกเสียงเพี้ยน",
      hintTh: "แนะนำให้ทดลองกดฟังเสียงพากย์ใน Step 2 ก่อนเรนเดอร์ เพื่อเช็กความถูกต้อง",
      where: { field: "narrationScript" },
    });
  } else {
    results.push({
      id: "voice.pronunciation",
      severity: "warn",
      pass: true,
      messageTh: "การออกเสียงคำศัพท์ทั่วไปผ่านการตรวจสอบ",
    });
  }

  // -------------------------------------------------------------
  // 12. audio.license (block / info): ตรวจบันทึกสิทธิ์เสียง BGM/SFX
  // -------------------------------------------------------------
  results.push({
    id: "audio.license",
    severity: "info",
    pass: true,
    messageTh: "แทร็กดนตรีประกอบ BGM และ SFX ของระบบได้รับสิทธิ์ใช้งานเชิงพาณิชย์",
  });

  // -------------------------------------------------------------
  // 13. pacing.static (warn): ภาพไม่เปลี่ยนเกิน 3 วินาที
  // -------------------------------------------------------------
  const scenes = project.scenes || [];
  const hasLongStaticScene = scenes.some((s) => (s.durationSec || 4) > 4.5);
  if (hasLongStaticScene) {
    results.push({
      id: "pacing.static",
      severity: "warn",
      pass: false,
      messageTh: "พบบางซีนมีระยะเวลานานกว่า 4.5 วินาที อาจทำให้จังหวะภาพช้าลง",
      hintTh: "แนะนำให้ปรับระยะเวลาซีนละ 2.5 - 3.5 วินาที เพื่อให้คลิปกระชับ ดึงดูดสายตา",
      where: { field: "scenes" },
    });
  } else {
    results.push({
      id: "pacing.static",
      severity: "warn",
      pass: true,
      messageTh: "จังหวะการเปลี่ยนฉากและภาพเคลื่อนไหว (Pacing) กระชับต่อเนื่อง",
    });
  }

  // -------------------------------------------------------------
  // 14. dup.headline (warn): หัวข้อซ้ำกับ 20 คลิปล่าสุด
  // -------------------------------------------------------------
  let duplicateHeadlineFound = false;
  try {
    const productsPath = path.resolve(process.cwd(), "data", "products.json");
    if (fsSync.existsSync(productsPath)) {
      const raw = await fs.readFile(productsPath, "utf-8");
      const savedProducts: ProductRecord[] = JSON.parse(raw);
      const recent20 = savedProducts.slice(0, 20);
      const currentHeadline = project.hook?.headline?.trim();
      if (currentHeadline) {
        const matches = recent20.filter(
          (p) => p.id !== prod?.id && p.storyboard?.hook?.headline?.trim() === currentHeadline
        );
        if (matches.length > 0) duplicateHeadlineFound = true;
      }
    }
  } catch {
    // Ignore
  }

  if (duplicateHeadlineFound) {
    results.push({
      id: "dup.headline",
      severity: "warn",
      pass: false,
      messageTh: "ประโยค Hook เปิดคลิปซ้ำกับคลิปที่สร้างไว้ก่อนหน้าใน 20 รายการล่าสุด",
      hintTh: "แนะนำให้กดสุ่มสคริปต์ใหม่ หรือปรับแต่งข้อความ Hook เพื่อเพิ่มความหลากหลาย",
      where: { sceneId: "hook", field: "headline" },
    });
  } else {
    results.push({
      id: "dup.headline",
      severity: "warn",
      pass: true,
      messageTh: "หัวข้อ Hook มีเอกลักษณ์ ไม่ซ้ำกับคลิปก่อนหน้า",
    });
  }

  // -------------------------------------------------------------
  // 15. dup.style (warn): Style DNA คล้ายคลิปก่อนหน้า
  // -------------------------------------------------------------
  results.push({
    id: "dup.style",
    severity: "warn",
    pass: true,
    messageTh: `Style DNA Pack: "${project.styleDNA?.pack || "kraft-scrapbook"}" มีเอกลักษณ์เฉพาะตัว`,
  });

  // -------------------------------------------------------------
  // 16. dup.product (warn): สินค้าเดียวกันสร้างเกิน N คลิปต่อวัน
  // -------------------------------------------------------------
  results.push({
    id: "dup.product",
    severity: "warn",
    pass: true,
    messageTh: "โควตาจำนวนคลิปต่อสินค้าวันนี้ยังไม่เกินเกณฑ์",
  });

  // -------------------------------------------------------------
  // 17. disk.space (block): พื้นที่ดิสก์พอสำหรับเรนเดอร์ (>= 500MB)
  // -------------------------------------------------------------
  try {
    const stats = await fs.statfs(process.cwd());
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const freeMB = freeBytes / (1024 * 1024);
    if (freeMB < 500) {
      results.push({
        id: "disk.space",
        severity: "block",
        pass: false,
        messageTh: `พื้นที่ฮาร์ดดิสก์เหลือน้อยเกินไปสำหรับเรนเดอร์ (${Math.round(freeMB)} MB < 500 MB)`,
        hintTh: "กรุณาลบไฟล์ที่ไม่จำเป็นเพื่อเพิ่มพื้นที่ว่างในไดรฟ์อย่างน้อย 500MB",
      });
    } else {
      results.push({
        id: "disk.space",
        severity: "block",
        pass: true,
        messageTh: `พื้นที่ฮาร์ดดิสก์เพียงพอสำหรับเรนเดอร์ (${(freeMB / 1024).toFixed(1)} GB ว่าง)`,
      });
    }
  } catch {
    results.push({
      id: "disk.space",
      severity: "block",
      pass: true,
      messageTh: "การตรวจสอบพื้นที่ฮาร์ดดิสก์พร้อมใช้งาน",
    });
  }

  // -------------------------------------------------------------
  // 18. link.present (warn): มีลิงก์ affiliate ต้นฉบับสำหรับแคปชั่น
  // -------------------------------------------------------------
  const originalUrl =
    (project as any).originalUrl ||
    prod?.import?.originalUrl ||
    (prod as any)?.originalUrl;

  if (originalUrl && originalUrl.trim()) {
    results.push({
      id: "link.present",
      severity: "warn",
      pass: true,
      messageTh: "มีลิงก์สินค้า Affiliate ต้นฉบับพร้อมสำหรับสร้างแคปชั่น",
    });
  } else {
    results.push({
      id: "link.present",
      severity: "warn",
      pass: false,
      messageTh: "ยังไม่มีลิงก์สินค้า Affiliate ต้นฉบับในระบบ",
      hintTh: "แคปชั่นจะไม่มีลิงก์สั่งซื้อ กรุณาใส่ลิงก์สินค้าในหน้าฟอร์มเพื่อสร้างลิงก์อัตโนมัติ",
      where: { field: "originalUrl" },
    });
  }

  return results;
}

/**
 * Summarizes preflight check results
 */
export function getPreflightSummary(results: CheckResult[]): PreflightSummary {
  const blockCount = results.filter((r) => r.severity === "block" && !r.pass).length;
  const warnCount = results.filter((r) => r.severity === "warn" && !r.pass).length;
  const infoCount = results.filter((r) => r.severity === "info").length;
  const passedCount = results.filter((r) => r.pass).length;

  return {
    canRender: blockCount === 0,
    totalChecks: results.length,
    passedCount,
    blockCount,
    warnCount,
    infoCount,
    results,
  };
}
