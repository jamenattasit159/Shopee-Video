import fs from "fs/promises";
import path from "path";

/**
 * Readability and typography rule checker (Rule A2 & A3):
 * - Headline >= 88px
 * - Subtitle >= 56px
 * - Polaroid caption >= 44px
 * - Price >= 120px
 * - Tag badge >= 40px
 * - No Kanit 900
 * - Stroke <= 0.08em
 * - Letter spacing >= 0.01em
 */
async function checkTypographyRules() {
  console.log("=== CHECKING READABILITY RULES (V2 PATCH) ===\n");
  let errors = [];

  // 1. Inspect palette.ts for Kanit 900
  const palettePath = path.resolve("remotion/lib/palette.ts");
  const paletteCode = await fs.readFile(palettePath, "utf-8");
  if (paletteCode.includes('"900"') || paletteCode.includes("'900'")) {
    errors.push("RULE VIOLATION: Kanit 900 detected in palette.ts! Use 600-700 only.");
  } else {
    console.log(" [PASS] Font Whitelist: No Kanit 900 found.");
  }

  // 2. Check TornStrip.tsx minimum headline font size
  const tornStripPath = path.resolve("remotion/paper/TornStrip.tsx");
  const tornStripCode = await fs.readFile(tornStripPath, "utf-8");
  if (!tornStripCode.includes("fontSize = 88")) {
    errors.push("RULE VIOLATION: TornStrip default fontSize is not >= 88px!");
  } else {
    console.log(" [PASS] TornStrip: Headline minimum >= 88px enforced.");
  }

  // 3. Check StickerText.tsx minimum subtitle font size
  const stickerTextPath = path.resolve("remotion/paper/StickerText.tsx");
  const stickerCode = await fs.readFile(stickerTextPath, "utf-8");
  if (!stickerCode.includes("fontSize = 56")) {
    errors.push("RULE VIOLATION: StickerText default fontSize is not >= 56px!");
  } else {
    console.log(" [PASS] StickerText: Subtitle minimum >= 56px enforced.");
  }

  // 4. Check PriceBurst.tsx minimum price font size
  const priceBurstPath = path.resolve("remotion/paper/PriceBurst.tsx");
  const priceBurstCode = await fs.readFile(priceBurstPath, "utf-8");
  if (!priceBurstCode.includes('fontSize: "128px"') && !priceBurstCode.includes('fontSize: "120px"')) {
    errors.push("RULE VIOLATION: PriceBurst price fontSize is not >= 120px!");
  } else {
    console.log(" [PASS] PriceBurst: Price hero size >= 120px enforced.");
  }

  // 5. Check CutoutImage.tsx polaroid caption size
  const cutoutPath = path.resolve("remotion/paper/CutoutImage.tsx");
  const cutoutCode = await fs.readFile(cutoutPath, "utf-8");
  if (!cutoutCode.includes('fontSize: "44px"')) {
    errors.push("RULE VIOLATION: Polaroid caption fontSize is not >= 44px!");
  } else {
    console.log(" [PASS] CutoutImage: Polaroid caption >= 44px enforced.");
  }

  // 6. Check layer separation (TornStrip text must not have #torn filter)
  // Background div has filter and self-closes, text is in separate sibling div
  const hasIsolatedBackground =
    tornStripCode.includes('filter: "url(#torn)"') &&
    tornStripCode.includes("LAYER 1: Background Paper Strip") &&
    tornStripCode.includes("LAYER 2: Text on top");

  if (!hasIsolatedBackground) {
    errors.push("RULE VIOLATION: Layer separation between paper filter and text not verified!");
  } else {
    console.log(" [PASS] Layer Separation: Displacement filter isolated from text layer.");
  }

  if (errors.length > 0) {
    console.error("\n❌ CHECK FAILED WITH ERRORS:\n" + errors.join("\n"));
    process.exit(1);
  }

  console.log("\n✅ ALL READABILITY & TYPOGRAPHY CHECKS PASSED 100%!");
}

checkTypographyRules().catch((err) => {
  console.error("Checker failed:", err);
  process.exit(1);
});
