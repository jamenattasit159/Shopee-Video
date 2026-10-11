import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { runPreflight, getPreflightSummary } from "../src/lib/preflight.ts";
import { createExportBundle, generateCaptionText, generateSrtContent } from "../src/lib/exportBundle.ts";

async function runPhase1Tests() {
  console.log("====================================================");
  console.log("   🧪 RUNNING PRODUCTION HARDENING PHASE 1 TESTS    ");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  // -----------------------------------------------------------
  // TEST SUITE 1: Preflight Check Engine
  // -----------------------------------------------------------
  console.log("--- 1. Testing Preflight Check Engine ---");

  // Sample Product Mock
  const sampleProject = {
    productName: "กระบอกน้ำเก็บความเย็น สแตนเลส 304",
    price: "฿199",
    images: ["/samples/tumbler-1.svg", "/samples/tumbler-2.svg"],
    hook: {
      headline: "กระบอกน้ำเก็บเย็น",
      headlineLines: ["กระบอกน้ำเก็บเย็น", "พกพาสะดวก"],
      subheadline: "เย็นนาน 24 ชั่วโมง",
      durationSec: 3,
    },
    scenes: [
      {
        highlightTitle: "สแตนเลส 304",
        highlightDesc: "ไม่เป็นสนิม ปลอดภัย",
        durationSec: 3.5,
        imageIndex: 0,
      },
    ],
    cta: {
      ctaTitle: "พิกัดในตะกร้าส้ม",
      buttonText: "ช้อปเลย",
      durationSec: 3,
    },
    voiceoverUrl: "/samples/voice-sample.mp3",
    voiceoverDurationSec: 8.5,
    originalUrl: "https://shopee.co.th/product/12345/67890?spm=affiliate.custom.link&aff_sub=tracker123",
  };

  const sampleRecord = {
    id: "prod_test_001",
    name: "กระบอกน้ำเก็บความเย็น สแตนเลส 304",
    price: "฿199",
    createdAt: new Date().toISOString(),
    import: {
      originalUrl: "https://shopee.co.th/product/12345/67890?spm=affiliate.custom.link&aff_sub=tracker123",
      fetchedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    },
    facts: {
      brand: "Zojirushi",
      productType: "กระบอกน้ำเก็บอุณหภูมิ",
      pack: "1 ชิ้น",
    },
  };

  // 1.1 Run preflight on clean product
  const cleanResults = await runPreflight(sampleProject, {
    productRecord: sampleRecord,
  });
  const cleanSummary = getPreflightSummary(cleanResults);

  if (cleanSummary.canRender && cleanSummary.blockCount === 0) {
    console.log(" [PASS] Clean Project: All block checks passed successfully.");
    passed++;
  } else {
    console.error(` [FAIL] Clean Project expected canRender=true but got blockCount=${cleanSummary.blockCount}`);
    cleanResults.filter((r) => !r.pass).forEach((r) => console.error(`   - [${r.id}] ${r.messageTh}`));
    failed++;
  }

  // 1.2 Test Claims Guard with banned phrase
  const bannedProject = {
    ...sampleProject,
    hook: {
      ...sampleProject.hook,
      headline: "ของแท้ 100% ถูกที่สุดในไทย",
    },
  };
  const bannedResults = await runPreflight(bannedProject, {
    productRecord: sampleRecord,
  });
  const claimCheck = bannedResults.find((r) => r.id === "claims.guard");
  if (claimCheck && !claimCheck.pass && claimCheck.severity === "block") {
    console.log(" [PASS] Claims Guard: Blocked banned claim ('ของแท้ 100% / ถูกที่สุด') correctly.");
    passed++;
  } else {
    console.error(" [FAIL] Claims Guard failed to block banned claim.");
    failed++;
  }

  // 1.3 Test Claims Guard with user acknowledgment override
  const acknowledgedResults = await runPreflight(bannedProject, {
    productRecord: sampleRecord,
    acknowledgedClaims: ["ของแท้ 100%", "ถูกที่สุด"],
  });
  const ackCheck = acknowledgedResults.find((r) => r.id === "claims.guard");
  if (ackCheck && ackCheck.pass) {
    console.log(" [PASS] Claims Guard: Allowed claim when user explicitly acknowledged.");
    passed++;
  } else {
    console.error(" [FAIL] Claims Guard did not respect acknowledgedClaims override.");
    failed++;
  }

  // 1.4 Test Unconfirmed Product block
  const unconfirmedResults = await runPreflight(sampleProject, {
    productRecord: { ...sampleRecord, import: undefined, confirmedAt: undefined },
  });
  const confirmCheck = unconfirmedResults.find((r) => r.id === "product.confirmed");
  if (confirmCheck && !confirmCheck.pass && confirmCheck.severity === "block") {
    console.log(" [PASS] Product Confirmation: Blocked unconfirmed product missing confirmedAt.");
    passed++;
  } else {
    console.error(" [FAIL] Failed to block unconfirmed product.");
    failed++;
  }

  // 1.5 Test Disk Space check
  const diskCheck = cleanResults.find((r) => r.id === "disk.space");
  if (diskCheck && diskCheck.pass) {
    console.log(` [PASS] Disk Space Check: Verified sufficient disk space.`);
    passed++;
  } else {
    console.error(" [FAIL] Disk space check failed.");
    failed++;
  }

  // -----------------------------------------------------------
  // TEST SUITE 2: Export Bundle Generation
  // -----------------------------------------------------------
  console.log("\n--- 2. Testing Export Bundle Generation ---");

  // Create dummy video file for testing bundle packaging
  const dummyVideoDir = path.resolve("public/renders");
  await fs.mkdir(dummyVideoDir, { recursive: true });
  const dummyVideoPath = path.join(dummyVideoDir, `test_dummy_${Date.now()}.mp4`);
  await fs.writeFile(dummyVideoPath, "MOCK_MP4_VIDEO_BINARY_DATA", "utf-8");

  const bundleResult = await createExportBundle({
    renderedVideoPath: dummyVideoPath,
    project: sampleProject,
    productRecord: sampleRecord,
    preflightResults: cleanResults,
    acknowledgedWarnings: [],
  });

  // Verify all 6 files created on disk
  const files = [
    { name: "video.mp4", path: bundleResult.files.video },
    { name: "cover.jpg", path: bundleResult.files.cover },
    { name: "captions.srt", path: bundleResult.files.srt },
    { name: "caption.txt", path: bundleResult.files.caption },
    { name: "meta.json", path: bundleResult.files.meta },
    { name: "bundle.zip", path: bundleResult.files.zip },
  ];

  let allFilesExist = true;
  for (const f of files) {
    const exists = fsSync.existsSync(f.path);
    const size = exists ? fsSync.statSync(f.path).size : 0;
    if (exists && size > 0) {
      console.log(` [PASS] Bundle item '${f.name}': Created (${size} bytes)`);
    } else {
      console.error(` [FAIL] Bundle item '${f.name}' missing or 0 bytes!`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    passed++;
  } else {
    failed++;
  }

  // 2.2 Verify captions.srt format
  const srtContent = await fs.readFile(bundleResult.files.srt, "utf-8");
  const hasSrtTimestamps = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(srtContent);
  if (hasSrtTimestamps) {
    console.log(" [PASS] captions.srt: Contains valid SRT timecodes.");
    passed++;
  } else {
    console.error(" [FAIL] captions.srt: Invalid timestamp format:\n" + srtContent);
    failed++;
  }

  // 2.3 Verify caption.txt has intact affiliate URL with full query
  const captionContent = await fs.readFile(bundleResult.files.caption, "utf-8");
  const expectedUrl = sampleRecord.import.originalUrl;
  if (captionContent.includes(expectedUrl) && captionContent.includes("spm=affiliate.custom.link&aff_sub=tracker123")) {
    console.log(" [PASS] caption.txt: Preserves original affiliate link with full query intact.");
    passed++;
  } else {
    console.error(" [FAIL] caption.txt: Affiliate link missing or trimmed:\n" + captionContent);
    failed++;
  }

  // 2.4 Verify meta.json structure
  const metaContent = JSON.parse(await fs.readFile(bundleResult.files.meta, "utf-8"));
  if (metaContent.appVersion && metaContent.assetsUsed && metaContent.preflightResults) {
    console.log(" [PASS] meta.json: Contains complete metadata, assets used, and preflight log.");
    passed++;
  } else {
    console.error(" [FAIL] meta.json missing required metadata fields.");
    failed++;
  }

  // Cleanup dummy test video
  await fs.unlink(dummyVideoPath).catch(() => {});

  console.log("\n====================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
