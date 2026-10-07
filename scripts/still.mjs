import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";

/**
 * Usage:
 * node scripts/still.mjs --frame <frame_num> --output <path_to_png> [--props-file <path_to_json>]
 */
async function main() {
  const args = process.argv.slice(2);
  let frame = 30;
  let outputFile = "out/still.png";
  let propsFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--frame" && args[i + 1]) {
      frame = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === "--props-file" && args[i + 1]) {
      propsFile = args[i + 1];
      i++;
    }
  }

  let inputProps = {};
  if (propsFile) {
    const raw = await fs.readFile(propsFile, "utf-8");
    inputProps = JSON.parse(raw);
  }

  const outputPath = path.resolve(outputFile);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`[Remotion Still] Bundling composition...`);
  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");

  const bundleLocation = await bundle({
    entryPoint,
    publicDir,
  });

  const compositions = await getCompositions(bundleLocation, { inputProps });
  const composition = compositions.find((c) => c.id === "ShopeeProductVideo");
  if (!composition) {
    throw new Error("Composition 'ShopeeProductVideo' not found");
  }

  console.log(`[Remotion Still] Rendering frame ${frame} to ${outputPath}...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputPath,
    frame,
    inputProps,
  });

  console.log(`[Remotion Still] Successfully saved still: ${outputPath}`);
}

main().catch((err) => {
  console.error("[Remotion Still Error]:", err);
  process.exit(1);
});
