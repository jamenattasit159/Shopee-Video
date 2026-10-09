import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { exec } from "child_process";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import util from "util";

const execAsync = util.promisify(exec);

/**
 * Resolves a public URL or relative path into an absolute filesystem path.
 */
function resolveAudioPath(audioUrlOrPath) {
  if (!audioUrlOrPath) return null;
  let clean = audioUrlOrPath.trim();

  // If it's a URL (http:// or https://), extract pathname
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      clean = decodeURIComponent(parsed.pathname);
    } catch {
      // fallback
    }
  }

  // Strip query params or hash if present
  clean = clean.split("?")[0].split("#")[0];

  const isWindowsAbsolute = /^[a-zA-Z]:[/\\]/.test(clean);
  const isPosixAbsolute = process.platform !== "win32" && clean.startsWith("/");

  if ((isWindowsAbsolute || isPosixAbsolute) && fsSync.existsSync(clean)) {
    return clean;
  }

  // Otherwise, treat as path relative to public/
  clean = clean.replace(/^[/\\]+/, "");
  if (clean.startsWith("public/") || clean.startsWith("public\\")) {
    clean = clean.replace(/^public[/\\]+/, "");
  }
  return path.join(process.cwd(), "public", clean);
}

/**
 * Measures actual audio duration via ffprobe.
 */
async function probeAudioDuration(audioPath) {
  try {
    const stats = await fs.stat(audioPath);
    if (stats.size === 0) return 0;
    const cmd = `ffprobe -v error -show_entries format=duration -of json "${audioPath}"`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    const d = parseFloat(data.format?.duration);
    return isNaN(d) ? 0 : Math.round(d * 1000) / 1000;
  } catch (err) {
    console.warn(`[Audio-First Timeline] ffprobe warning: ${err.message}`);
    return 0;
  }
}

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

  // 1. Audio-First Timeline Measurement
  let audioDurationSec = 0;
  if (inputProps.voiceoverUrl) {
    const resolvedPath = resolveAudioPath(inputProps.voiceoverUrl);
    if (resolvedPath) {
      audioDurationSec = await probeAudioDuration(resolvedPath);
      if (audioDurationSec > 0) {
        inputProps.audioDurationSec = audioDurationSec;
        inputProps.tailBufferSec = inputProps.tailBufferSec || 0.8;

        const targetTotalSec = audioDurationSec + inputProps.tailBufferSec;
        const fps = 30;
        const numScenes = (inputProps.scenes && inputProps.scenes.length) || 3;

        // Synchronize scene durations if they are not already tuned
        const curHook = inputProps.hook?.durationSec || 3;
        const curScenes = (inputProps.scenes || []).reduce((s, sc) => s + (sc.durationSec || 4), 0);
        const curCta = inputProps.cta?.durationSec || 3;
        const curTotal = curHook + curScenes + curCta;

        if (targetTotalSec > curTotal) {
          const hookSec = Math.min(4.5, Math.max(3.0, targetTotalSec * 0.18));
          const ctaSec = Math.min(4.5, Math.max(3.0, targetTotalSec * 0.18));
          const remainingSec = Math.max(numScenes * 3.5, targetTotalSec - hookSec - ctaSec);
          const perSceneSec = Math.round((remainingSec / numScenes) * 10) / 10;

          if (inputProps.hook) inputProps.hook.durationSec = Math.round(hookSec * 10) / 10;
          if (inputProps.cta) inputProps.cta.durationSec = Math.round(ctaSec * 10) / 10;
          if (inputProps.scenes) {
            inputProps.scenes.forEach((sc) => {
              sc.durationSec = perSceneSec;
            });
          }

          const synchronizedTotalSec = Math.round((hookSec + perSceneSec * numScenes + ctaSec) * 10) / 10;
          inputProps.actualDurationFrames = Math.max(
            inputProps.actualDurationFrames || 0,
            Math.ceil(synchronizedTotalSec * fps)
          );

          console.log(
            `[Audio-First Timeline] Synchronized to narration (${audioDurationSec.toFixed(2)}s + ${inputProps.tailBufferSec}s buffer): Hook=${hookSec}s, ${numScenes}xScenes=${perSceneSec}s, CTA=${ctaSec}s (Total: ${synchronizedTotalSec}s / ${inputProps.actualDurationFrames} frames)`
          );
        } else {
          const minRequiredFrames = Math.max(
            Math.ceil(curTotal * fps),
            Math.ceil(targetTotalSec * fps)
          );
          if (!inputProps.actualDurationFrames || inputProps.actualDurationFrames < minRequiredFrames) {
            inputProps.actualDurationFrames = minRequiredFrames;
          }
          console.log(
            `[Audio-First Timeline] Visual duration (${curTotal}s) already covers narration (${audioDurationSec}s). Required frames: ${inputProps.actualDurationFrames}`
          );
        }
      }
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

  // 2. Post-Render Validation via ffprobe
  try {
    const probeCmd = `ffprobe -v error -show_entries format=duration -of json "${outputPath}"`;
    const { stdout: probeOut } = await execAsync(probeCmd);
    const probeData = JSON.parse(probeOut);
    const renderedDurationSec = parseFloat(probeData.format?.duration);

    if (!isNaN(renderedDurationSec)) {
      if (audioDurationSec > 0) {
        const margin = renderedDurationSec - audioDurationSec;
        if (margin >= -0.05) {
          console.log(
            `[Validation PASSED] Video duration (${renderedDurationSec.toFixed(2)}s) covers voiceover (${audioDurationSec.toFixed(2)}s) with margin +${margin.toFixed(2)}s.`
          );
        } else {
          console.warn(
            `[Validation WARNING] Video duration (${renderedDurationSec.toFixed(2)}s) is shorter than voiceover (${audioDurationSec.toFixed(2)}s) by ${Math.abs(margin).toFixed(2)}s!`
          );
        }
      } else {
        console.log(`[Validation] Rendered video duration: ${renderedDurationSec.toFixed(2)}s`);
      }
    }
  } catch (valErr) {
    console.warn("[Validation] Could not run ffprobe on rendered video:", valErr.message);
  }

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
