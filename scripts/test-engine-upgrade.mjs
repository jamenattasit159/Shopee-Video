import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";
import {
  measureAudioDuration,
  synchronizeTimelineToAudio,
  validateRenderedVideo,
} from "../src/lib/audioTimeline.js";
import { orchestrateFullStoryboardMotion } from "../remotion/motion/orchestrator.js";

const execAsync = util.promisify(exec);

console.log("================================================================================");
console.log("   SHOPEE VIDEO GENERATOR — ENGINEERING UPGRADE VERIFICATION TEST SUITE");
console.log("================================================================================\n");

async function runTests() {
  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: AUDIO-FIRST TIMELINE MEASUREMENT & SYNCHRONIZATION MATH
  // --------------------------------------------------------------------------
  console.log("📌 [SUITE 1] Testing Audio Measurement & Synchronized Timeline Math...");

  // Test 1.1: Short Audio File (gemini_1791512915105.wav ~9.76s)
  const shortAudioMeta = await measureAudioDuration("public/uploads/gemini_1791512915105.wav");
  assert(shortAudioMeta.isValid, "Short audio file is valid");
  assert(shortAudioMeta.durationSec > 9.0 && shortAudioMeta.durationSec < 10.5, `Short audio measured accurately: ${shortAudioMeta.durationSec}s`);

  const shortTimeline = synchronizeTimelineToAudio({
    audioDurationSec: shortAudioMeta.durationSec,
    numScenes: 3,
    fps: 30,
  });
  assert(
    shortTimeline.totalDurationSec >= shortAudioMeta.durationSec,
    `Short timeline total (${shortTimeline.totalDurationSec}s) >= audio (${shortAudioMeta.durationSec}s)`
  );
  assert(
    shortTimeline.totalDurationSec >= 16.5,
    `Short timeline respects visual minimum floor (${shortTimeline.totalDurationSec}s >= 16.5s)`
  );

  // Test 1.2: Long Audio File (gemini_1791513489643.wav ~39.68s)
  const longAudioMeta = await measureAudioDuration("public/uploads/gemini_1791513489643.wav");
  assert(longAudioMeta.isValid, "Long audio file is valid");
  assert(longAudioMeta.durationSec > 38.0 && longAudioMeta.durationSec < 41.0, `Long audio measured accurately: ${longAudioMeta.durationSec}s`);

  const longTimeline = synchronizeTimelineToAudio({
    audioDurationSec: longAudioMeta.durationSec,
    numScenes: 3,
    fps: 30,
  });
  assert(
    longTimeline.totalDurationSec >= longAudioMeta.durationSec + 0.5,
    `Long timeline total (${longTimeline.totalDurationSec}s) covers audio (${longAudioMeta.durationSec}s) + buffer`
  );
  assert(
    longTimeline.scenesDurationSec.every((d) => d >= 7.0),
    `Long timeline scales scenes appropriately (each scene >= 7s): [${longTimeline.scenesDurationSec.join(", ")}]s`
  );

  // Test 1.3: Graceful fallback for non-existent / empty audio
  const nonExistentMeta = await measureAudioDuration("public/uploads/non_existent_file.mp3");
  assert(!nonExistentMeta.isValid && nonExistentMeta.durationSec === 0, "Non-existent audio returns isValid: false without crashing");

  const fallbackTimeline = synchronizeTimelineToAudio({
    audioDurationSec: 0,
    numScenes: 3,
  });
  assert(fallbackTimeline.totalDurationSec > 0, `Fallback timeline has valid default duration (${fallbackTimeline.totalDurationSec}s)`);

  console.log("");

  // --------------------------------------------------------------------------
  // TEST SUITE 2: DIVERSE MOTION ENGINE & ANTI-REPETITION ORCHESTRATOR
  // --------------------------------------------------------------------------
  console.log("📌 [SUITE 2] Testing Diverse Motion Engine & Style Pack Differentiation...");

  const testPacks = ["comic-popart", "soft-kawaii", "kraft-scrapbook", "supermarket-flyer"];
  const generatedPlans = {};

  for (const pack of testPacks) {
    const plan = orchestrateFullStoryboardMotion({
      packId: pack,
      scenesCount: 3,
      hookFrames: 120,
      scenesFrames: [150, 150, 150],
      ctaFrames: 120,
    });
    generatedPlans[pack] = plan;

    // Check anti-repetition: adjacent feature scenes must not share entryPreset
    const feat0 = plan.featurePlans[0].motionConfig;
    const feat1 = plan.featurePlans[1].motionConfig;
    const feat2 = plan.featurePlans[2].motionConfig;

    assert(
      feat0.entryPreset !== feat1.entryPreset,
      `[${pack}] Feature 0 entry (${feat0.entryPreset}) != Feature 1 entry (${feat1.entryPreset})`
    );
    assert(
      feat1.entryPreset !== feat2.entryPreset,
      `[${pack}] Feature 1 entry (${feat1.entryPreset}) != Feature 2 entry (${feat2.entryPreset})`
    );
    assert(
      feat0.transitionOut !== feat1.transitionOut,
      `[${pack}] Feature 0 transition (${feat0.transitionOut}) != Feature 1 transition (${feat1.transitionOut})`
    );

    // Check ambient drift is active for long scenes (>= 120 frames)
    assert(feat0.ambientDrift === true, `[${pack}] Ambient drift enabled for long scenes (duration >= 120 frames)`);
  }

  // Cross-style differentiation check: Comic vs Kawaii should NOT produce identical motion profiles
  const comicHookMotion = generatedPlans["comic-popart"].hookPlan.motionConfig.entryPreset;
  const kawaiiHookMotion = generatedPlans["soft-kawaii"].hookPlan.motionConfig.entryPreset;
  assert(
    comicHookMotion !== kawaiiHookMotion,
    `Cross-style differentiation: Comic hook (${comicHookMotion}) != Kawaii hook (${kawaiiHookMotion})`
  );

  console.log("");

  // --------------------------------------------------------------------------
  // TEST SUITE 3: REAL REMOTION RENDERING & DURATION VALIDATION (PHASE C & D)
  // --------------------------------------------------------------------------
  console.log("📌 [SUITE 3] Testing Real Remotion Video Renders with FFprobe Validation...");

  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");
  console.log("  📦 Bundling Remotion project once for rendering tests...");
  const bundleLocation = await bundle({ entryPoint, publicDir });

  // Test Case A: Render with Long Narration (~39.68s Gemini 3.8 Flash Audio)
  console.log("\n  🎬 [Render Test A] Long Gemini 3.8 Narration (~39.7s) with Soft-Kawaii Style...");
  const testAOutput = path.resolve("public/renders/test_long_gemini_kawaii.mp4");
  await fs.mkdir(path.dirname(testAOutput), { recursive: true });

  const testAProps = {
    productName: "แก้วเก็บความเย็น Tyeso สแตนเลส 304",
    price: "฿259",
    voiceoverUrl: "/uploads/gemini_1791513489643.wav",
    audioDurationSec: longAudioMeta.durationSec,
    tailBufferSec: 0.8,
    actualDurationFrames: longTimeline.totalDurationFrames,
    hook: {
      headline: "แก้วเก็บความเย็นสุดคิ้วท์!",
      durationSec: longTimeline.hookDurationSec,
    },
    scenes: [
      {
        highlightTitle: "เก็บความเย็นได้ยาวนาน",
        durationSec: longTimeline.scenesDurationSec[0],
        layout: "hero-center",
      },
      {
        highlightTitle: "พกพาสะดวก ลายน่ารัก",
        durationSec: longTimeline.scenesDurationSec[1],
        layout: "polaroid-stack",
      },
      {
        highlightTitle: "โปรโมชั่นพิเศษราคาโดนใจ",
        durationSec: longTimeline.scenesDurationSec[2],
        layout: "callout-circle",
      },
    ],
    cta: {
      ctaTitle: "รีบกดสั่งซื้อในตะกร้าส้ม!",
      durationSec: longTimeline.ctaDurationSec,
    },
    styleDNA: {
      pack: "soft-kawaii",
      primaryColor: "#FF8BA7",
      accentColor: "#FFD6BA",
      bgColor: "#FFF5F7",
    },
  };

  const compsA = await getCompositions(bundleLocation, { inputProps: testAProps });
  const compA = compsA.find((c) => c.id === "ShopeeProductVideo");
  console.log(
    `    Composition duration: ${compA.durationInFrames} frames (${(
      compA.durationInFrames / compA.fps
    ).toFixed(2)}s @ ${compA.fps}fps)`
  );

  const renderStartA = Date.now();
  await renderMedia({
    composition: compA,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: testAOutput,
    inputProps: testAProps,
    concurrency: 4,
  });
  console.log(`    Rendered in ${((Date.now() - renderStartA) / 1000).toFixed(1)}s`);

  // Validate Test A with FFprobe
  const validationA = await validateRenderedVideo(testAOutput, path.resolve("public/uploads/gemini_1791513489643.wav"));
  assert(validationA.isValid, `Test A Video duration (${validationA.videoDurationSec}s) >= Audio (${validationA.audioDurationSec}s)`);
  assert(
    validationA.videoDurationSec >= longAudioMeta.durationSec,
    `Test A NO TRUNCATION: Video (${validationA.videoDurationSec}s) fully covers voiceover (${longAudioMeta.durationSec}s)`
  );

  // Test Case B: Render with Short Narration (~9.76s Audio) and Comic-Popart Style
  console.log("\n  🎬 [Render Test B] Short Narration (~9.8s) with Comic-PopArt Style...");
  const testBOutput = path.resolve("public/renders/test_short_comic.mp4");

  const testBProps = {
    productName: "แก้วเก็บความเย็น Tyeso สแตนเลส 304",
    price: "฿259",
    voiceoverUrl: "/uploads/gemini_1791512915105.wav",
    audioDurationSec: shortAudioMeta.durationSec,
    tailBufferSec: 0.8,
    actualDurationFrames: shortTimeline.totalDurationFrames,
    hook: {
      headline: "แก้วในตำนาน ดีจริงมั้ย?!",
      durationSec: shortTimeline.hookDurationSec,
    },
    scenes: [
      {
        highlightTitle: "สแตนเลส 304 ไอน้ำไม่เกาะ",
        durationSec: shortTimeline.scenesDurationSec[0],
        layout: "hero-center",
      },
      {
        highlightTitle: "พกไปทำงาน คุมโทนสุดๆ",
        durationSec: shortTimeline.scenesDurationSec[1],
        layout: "polaroid-stack",
      },
      {
        highlightTitle: "ลดเหลือ 259 บาทเท่านั้น",
        durationSec: shortTimeline.scenesDurationSec[2],
        layout: "callout-circle",
      },
    ],
    cta: {
      ctaTitle: "จิ้มตะกร้าส้มมุมซ้ายล่าง!",
      durationSec: shortTimeline.ctaDurationSec,
    },
    styleDNA: {
      pack: "comic-popart",
      primaryColor: "#FF2A55",
      accentColor: "#FFE500",
      bgColor: "#FFFCEB",
    },
  };

  const compsB = await getCompositions(bundleLocation, { inputProps: testBProps });
  const compB = compsB.find((c) => c.id === "ShopeeProductVideo");
  console.log(
    `    Composition duration: ${compB.durationInFrames} frames (${(
      compB.durationInFrames / compB.fps
    ).toFixed(2)}s @ ${compB.fps}fps)`
  );

  const renderStartB = Date.now();
  await renderMedia({
    composition: compB,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: testBOutput,
    inputProps: testBProps,
    concurrency: 4,
  });
  console.log(`    Rendered in ${((Date.now() - renderStartB) / 1000).toFixed(1)}s`);

  // Validate Test B with FFprobe
  const validationB = await validateRenderedVideo(testBOutput, path.resolve("public/uploads/gemini_1791512915105.wav"));
  assert(validationB.isValid, `Test B Video duration (${validationB.videoDurationSec}s) >= Audio (${validationB.audioDurationSec}s)`);
  assert(
    validationB.videoDurationSec >= shortAudioMeta.durationSec,
    `Test B NO TRUNCATION: Video (${validationB.videoDurationSec}s) fully covers voiceover (${shortAudioMeta.durationSec}s)`
  );

  console.log("\n================================================================================");
  console.log(`   🎉 ALL TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions passed)`);
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
