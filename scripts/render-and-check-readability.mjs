import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

async function main() {
  console.log("=== RENDERING STILLS & DOWNSCALING TO 360PX FOR READABILITY TEST ===\n");
  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");
  await fs.mkdir(path.resolve("out"), { recursive: true });

  console.log("1. Bundling Remotion...");
  const bundleLocation = await bundle({ entryPoint, publicDir });
  const compositions = await getCompositions(bundleLocation);
  const composition = compositions.find((c) => c.id === "ShopeeProductVideo");

  const framesToTest = [
    { frame: 30, name: "hook" },
    { frame: 140, name: "feat1" },
    { frame: 220, name: "feat2" },
    { frame: 400, name: "cta" },
  ];

  for (const item of framesToTest) {
    const rawPath = path.resolve(`out/v2_${item.name}.png`);
    const smallPath = path.resolve(`out/v2_${item.name}_360.png`);

    console.log(`Rendering frame ${item.frame} (${item.name})...`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: rawPath,
      frame: item.frame,
    });

    // Resize to 360x640 (Rule A3)
    await sharp(rawPath)
      .resize(360, 640, { fit: "cover" })
      .toFile(smallPath);

    console.log(` -> Saved 360px still: ${smallPath}`);
  }

  console.log("\n✅ All 360px stills generated successfully in out/!");
}

main().catch((err) => {
  console.error("Error generating stills:", err);
  process.exit(1);
});
