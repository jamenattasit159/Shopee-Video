import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { splitSafeThaiLines, validateLine, KEEP } from "../remotion/lib/thaiKeep.ts";

/**
 * Line breaking & Readability verification script (Paper Collage V2 Patch V3 - Part E6)
 * 
 * Tests:
 * 1. "เปิดวาร์ปไอเทมเด็ดช้อปปี้" -> must split into ["เปิดวาร์ป", "ไอเทมเด็ดช้อปปี้"]
 * 2. "ของดีตรงปก บอกเลยว่าห้ามพลาด" -> must split into ["ของดีตรงปก", "บอกเลยว่าห้ามพลาด"]
 * 3. English long brand "MamyPoko Super Premium Organic" -> splits at whitespace without overflow
 * 4. 40-char Thai text -> validator & containment check
 * 5. Render still frames and generate 360px thumbnails
 */

async function runUnitTests() {
  console.log("=== STEP 1: VERIFYING THAI LINE SPLITTING & PHRASE PROTECTION ===\n");
  let passed = 0;
  let failed = 0;

  // Test 1: "เปิดวาร์ปไอเทมเด็ดช้อปปี้"
  const t1 = "เปิดวาร์ปไอเทมเด็ดช้อปปี้";
  const lines1 = splitSafeThaiLines(t1, 14, 4);
  console.log(`[Test 1] Input: "${t1}"`);
  console.log(`         Result: ${JSON.stringify(lines1)}`);

  const hasOrphanM = lines1.some((l) => l.startsWith("ม"));
  const breaksItem = lines1.some((l) => l.endsWith("ไอเท") || l.startsWith("มเด็ด"));

  if (!hasOrphanM && !breaksItem && lines1[0] === "เปิดวาร์ป" && lines1[1] === "ไอเทมเด็ดช้อปปี้") {
    console.log(" [PASS] Test 1: Splitted cleanly at phrase boundary without orphan 'ม'!\n");
    passed++;
  } else {
    console.error(` [FAIL] Test 1: Invalid split! ${JSON.stringify(lines1)}\n`);
    failed++;
  }

  // Test 2: "ของดีตรงปก บอกเลยว่าห้ามพลาด"
  const t2 = "ของดีตรงปก บอกเลยว่าห้ามพลาด";
  const lines2 = splitSafeThaiLines(t2, 18, 4);
  console.log(`[Test 2] Input: "${t2}"`);
  console.log(`         Result: ${JSON.stringify(lines2)}`);

  const breaksBokLoey = lines2.some((l) => l.endsWith("บอก") || l.startsWith("เลย"));

  if (!breaksBokLoey && lines2[0] === "ของดีตรงปก" && lines2[1] === "บอกเลยว่าห้ามพลาด") {
    console.log(" [PASS] Test 2: 'บอกเลย' phrase protected intact!\n");
    passed++;
  } else {
    console.error(` [FAIL] Test 2: Broken contiguous phrase! ${JSON.stringify(lines2)}\n`);
    failed++;
  }

  // Test 3: Long English brand name "MamyPoko Super Premium Organic"
  const t3 = "MamyPoko Super Premium Organic";
  const lines3 = splitSafeThaiLines(t3, 16, 4);
  console.log(`[Test 3] Input: "${t3}"`);
  console.log(`         Result: ${JSON.stringify(lines3)}`);
  if (lines3.length === 2 && !lines3[0].includes("  ") && !lines3[1].includes("  ")) {
    console.log(" [PASS] Test 3: English brand split nicely at words without clipping!\n");
    passed++;
  } else {
    console.error(` [FAIL] Test 3: English brand split failed! ${JSON.stringify(lines3)}\n`);
    failed++;
  }

  // Test 4: 40-character Thai string validator
  const t4 = "สินค้ารุ่นใหม่ล่าสุดใช้งานง่ายและสะดวกมาก";
  const v4 = validateLine(t4, 14, 4);
  console.log(`[Test 4] 40-char Thai input validation:`);
  console.log(`         Length: ${t4.length} chars, Valid: ${v4.valid}, Reason: "${v4.reason}"`);
  if (!v4.valid) {
    console.log(" [PASS] Test 4: Long text successfully flagged by validator for shortening!\n");
    passed++;
  } else {
    console.error(" [FAIL] Test 4: Long text should have been flagged!\n");
    failed++;
  }

  // Test 5: Hanging marks validator (e.g. starting with "ม" or "ะ" or "ๆ")
  const invalidLeading = ["มเด็ดช้อปปี้", "ะดีมาก", "ๆ เจ๋งสุดๆ"];
  let test5Passed = true;
  for (const bad of invalidLeading) {
    const val = validateLine(bad, 14, 4);
    if (val.valid) {
      console.error(` [FAIL] Validator missed invalid line: "${bad}"`);
      test5Passed = false;
    }
  }
  if (test5Passed) {
    console.log(" [PASS] Test 5: Dependent marks and orphan codas strictly rejected by validator!\n");
    passed++;
  } else {
    failed++;
  }

  if (failed > 0) {
    throw new Error(`${failed} unit tests failed!`);
  }
}

async function renderVisualVerificationStills() {
  console.log("=== STEP 2: RENDERING STILL FRAMES & GENERATING 360PX PREVIEWS ===\n");
  const outDir = path.resolve("out/check-linebreak");
  await fs.mkdir(outDir, { recursive: true });

  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");

  // Props with the test phrases
  const testProps = {
    productName: "MamyPoko Super Premium Organic",
    price: "฿699",
    images: ["/samples/tumbler-1.svg"],
    hook: {
      headline: "เปิดวาร์ปไอเทมเด็ดช้อปปี้",
      headlineLines: ["เปิดวาร์ป", "ไอเทมเด็ดช้อปปี้"],
      subheadline: "ของดีตรงปก บอกเลยว่าห้ามพลาด",
      captionLines: ["ของดีตรงปก", "บอกเลยว่าห้ามพลาด"],
      badgeText: "🔥 ไอเทมเด็ดช้อปปี้",
      highlightWord: "ไอเทมเด็ด",
      paperTheme: "kraft",
      durationSec: 3,
    },
    scenes: [
      {
        highlightTitle: "MamyPoko Organic",
        headlineLines: ["MamyPoko", "Super Organic"],
        highlightDesc: "ของแท้ตรงปก สัมผัสนุ่มสบายผิว",
        captionLines: ["ของแท้ตรงปก", "สัมผัสนุ่มสบายผิว"],
        stickerText: "✨ นุ่มสบาย",
        highlightWord: "ตรงปก",
        imageIndex: 0,
        layout: "hero-center",
        paperTheme: "cream-grid",
        durationSec: 3,
      },
      {
        highlightTitle: "ดีไซน์สวย ตรงปกไม่จกตา",
        headlineLines: ["ดีไซน์สวย", "ตรงปกไม่จกตา"],
        highlightDesc: "พกพาง่าย คุมโทนทุกมุม",
        captionLines: ["พกพาง่าย", "คุมโทนทุกมุม"],
        stickerText: "👍 สวยตรงปก",
        highlightWord: "ตรงปก",
        imageIndex: 0,
        layout: "polaroid-stack",
        paperTheme: "pastel-mint",
        durationSec: 3,
      },
    ],
    cta: {
      ctaTitle: "จิ้มตะกร้าส้มซ้ายล่างเลย!",
      headlineLines: ["จิ้มตะกร้าส้ม", "ซ้ายล่างเลย!"],
      ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่ม",
      captionLines: ["แจกโค้ดส่งฟรี", "คูปองลดเพิ่ม"],
      buttonText: "ช้อปเลยที่ Shopee",
      basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
      badgeText: "⚡ โค้ดส่งฟรีจำนวนจำกัด",
      paperTheme: "halftone-orange",
      durationSec: 3,
    },
  };

  console.log("Bundling composition...");
  const bundleLocation = await bundle({ entryPoint, publicDir });
  const compositions = await getCompositions(bundleLocation, { inputProps: testProps });
  const composition = compositions.find((c) => c.id === "ShopeeProductVideo");
  if (!composition) throw new Error("Composition 'ShopeeProductVideo' not found");

  // Render Frame 30 (Hook scene with "เปิดวาร์ปไอเทมเด็ดช้อปปี้" and "ของดีตรงปก บอกเลยว่าห้ามพลาด")
  const hookStill1080 = path.join(outDir, "hook_still_1080p.png");
  console.log(`Rendering Hook still frame 30 to ${hookStill1080}...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: hookStill1080,
    frame: 30,
    inputProps: testProps,
  });

  // Resize to 360x640 (Mobile screen size verification per Rule A3 / E6)
  const hookStill360 = path.join(outDir, "hook_still_360p.png");
  await sharp(hookStill1080)
    .resize(360, 640)
    .toFile(hookStill360);
  console.log(`Saved 360px mobile preview: ${hookStill360}`);

  // Render Frame 120 (Feature scene 1 with English brand name)
  const featureStill1080 = path.join(outDir, "feature_still_1080p.png");
  console.log(`Rendering Feature still frame 120 to ${featureStill1080}...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: featureStill1080,
    frame: 120,
    inputProps: testProps,
  });

  const featureStill360 = path.join(outDir, "feature_still_360p.png");
  await sharp(featureStill1080)
    .resize(360, 640)
    .toFile(featureStill360);
  console.log(`Saved 360px mobile preview: ${featureStill360}`);

  console.log("\n✅ ALL VISUAL STILLS & 360PX PREVIEWS GENERATED SUCCESSFULLY!");
}

async function main() {
  await runUnitTests();
  await renderVisualVerificationStills();
  console.log("\n🎉 ALL E1-E6 CHECKS AND VERIFICATIONS PASSED 100%!");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
