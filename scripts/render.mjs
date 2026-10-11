import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

/**
 * Usage:
 * node scripts/render.mjs --props-file <path_to_json> --output <path_to_mp4>
 */
async function main() {
  const args = process.argv.slice(2);
  let propsFile = null;
  let outputFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--props-file" && args[i + 1]) {
      propsFile = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }

  let inputProps = {};
  if (propsFile) {
    const raw = await fs.readFile(propsFile, "utf-8");
    inputProps = JSON.parse(raw);
    delete inputProps.showSafeZone;
  }

  // Ensure voiceover duration is accurately calculated if voiceoverUrl exists
  if (inputProps.voiceoverUrl && !inputProps.voiceoverDurationSec) {
    try {
      const audioPath = path.resolve("public", inputProps.voiceoverUrl.replace(/^\//, ""));
      const ffprobeCandidates = [
        path.resolve("node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"),
        "ffprobe",
      ];
      for (const bin of ffprobeCandidates) {
        try {
          const out = execSync(
            `"${bin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
            { stdio: ["ignore", "pipe", "ignore"] }
          );
          const sec = parseFloat(out.toString().trim());
          if (!isNaN(sec) && sec > 0) {
            inputProps.voiceoverDurationSec = sec;
            console.log(`[Remotion Engine] Detected voiceover duration: ${sec}s`);
            break;
          }
        } catch (candidateErr) {
          console.debug(`[Remotion Engine] ffprobe candidate '${bin}' failed:`, candidateErr?.message);
        }
      }
    } catch (probeErr) {
      console.warn("[Remotion Engine] Audio duration probe warning:", probeErr);
    }
  }

  const outputPath = outputFile
    ? path.resolve(outputFile)
    : path.resolve(`public/renders/shopee_video_${Date.now()}.mp4`);

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`[Remotion Engine] Starting bundle...`);
  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");

  const bundleLocation = await bundle({
    entryPoint,
    publicDir,
  });

  console.log(`[Remotion Engine] Bundle ready. Fetching compositions...`);
  const compositions = await getCompositions(bundleLocation, {
    inputProps,
  });

  const composition = compositions.find((c) => c.id === "ShopeeProductVideo");
  if (!composition) {
    throw new Error("Composition 'ShopeeProductVideo' not found in Remotion Root");
  }

  console.log(
    `[Remotion Engine] Rendering ${composition.durationInFrames} frames (${(
      composition.durationInFrames / composition.fps
    ).toFixed(1)}s @ ${composition.fps}fps) to ${outputPath}...`
  );

  const startTime = Date.now();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    concurrency: 4,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    onProgress: ({ progress, renderedFrames, totalFrames }) => {
      const percent = Math.floor(progress * 100);
      console.log(`PROGRESS:${percent}:${renderedFrames}:${totalFrames}`);
    },
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Remotion Engine] Render completed in ${durationSec}s! Output: ${outputPath}`);

  // Also copy to root ./renders if rendered inside public/renders
  try {
    const rootRendersDir = path.resolve("renders");
    await fs.mkdir(rootRendersDir, { recursive: true });
    const rootCopyPath = path.join(rootRendersDir, path.basename(outputPath));
    await fs.copyFile(outputPath, rootCopyPath);
    console.log(`[Remotion Engine] Also copied output to root renders: ${rootCopyPath}`);
  } catch (copyErr) {
    console.warn("Could not copy to root renders folder:", copyErr);
  }
}

main().catch((err) => {
  console.error("[Remotion Engine Error]:", err);
  process.exit(1);
});
