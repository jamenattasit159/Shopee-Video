import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { execSync } from "child_process";
import crypto from "crypto";
import os from "os";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { tsImport } from "tsx/esm/api";
import { pathToFileURL } from "node:url";

/**
 * Usage:
 * node scripts/render.mjs --props-file <path_to_json> --output <path_to_mp4> [--concurrency 1] [--scale 1] [--engine turbo|remotion] [--progress-file <path>]
 */
async function stageMinimalPublicDir(inputProps, stageDir) {
  await fs.mkdir(stageDir, { recursive: true });

  // Copy static small folders (samples, audio, sfx) once
  for (const folder of ["samples", "audio", "sfx"]) {
    const srcFolder = path.resolve("public", folder);
    const dstFolder = path.join(stageDir, folder);
    if (fsSync.existsSync(srcFolder) && !fsSync.existsSync(dstFolder)) {
      await fs.cp(srcFolder, dstFolder, { recursive: true }).catch(() => {});
    }
  }

  // Copy ONLY the specific uploads/cache files referenced by this video (prevents copying 500MB of old uploads/renders!)
  const referencedUrls = new Set([
    ...(inputProps.images || []),
    ...(inputProps.cutoutImages || []),
    inputProps.voiceoverUrl,
    inputProps.bgmUrl,
    inputProps.mascotUrl ?? "/mascot/presenter.png",
    ...(inputProps.mascotAnimation?.frames || []).map((frame) => frame.url),
    ...(inputProps.voiceLines || []).map((l) => l?.audioUrl),
  ]);

  for (const url of referencedUrls) {
    if (!url || typeof url !== "string" || url.startsWith("http") || url.startsWith("data:")) {
      continue;
    }
    const rel = url.split("?")[0].replace(/^\//, "");
    const srcFile = path.resolve("public", rel);
    const dstFile = path.join(stageDir, rel);
    if (fsSync.existsSync(srcFile)) {
      await fs.mkdir(path.dirname(dstFile), { recursive: true });

      // Reuse already staged & up-to-date files
      if (fsSync.existsSync(dstFile)) {
        try {
          const srcStat = fsSync.statSync(srcFile);
          const dstStat = fsSync.statSync(dstFile);
          if (dstStat.mtimeMs >= srcStat.mtimeMs && dstStat.size > 0) {
            continue;
          }
        } catch {}
      }

      let optimized = false;
      // Pre-optimize 4K/high-res video clips to prevent Remotion Chromium OffthreadVideo timeouts
      if (/\.(mp4|mov|webm|m4v)$/i.test(srcFile)) {
        try {
          const probeOut = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${srcFile}"`,
            { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
          );
          const probeData = JSON.parse(probeOut.toString());
          const stream = probeData.streams?.[0];
          if (stream && (stream.width > 1080 || stream.height > 1920 || stream.width > stream.height)) {
            execSync(
              `ffmpeg -y -i "${srcFile}" -vf "scale='min(1080,iw)':-2" -c:v libx264 -preset veryfast -crf 20 -r 30 -c:a copy "${dstFile}"`,
              { stdio: "ignore", windowsHide: true }
            );
            optimized = true;
          }
        } catch {}
      }

      if (!optimized) {
        await fs.copyFile(srcFile, dstFile).catch(() => {});
      }
    }
  }

  return stageDir;
}

// Hash of everything that ends up inside the webpack bundle. When unchanged we reuse
// the previous bundle and skip 10-40s of webpack work per render.
function computeBundleHash() {
  const hash = crypto.createHash("sha256");
  const walk = (dir) => {
    if (!fsSync.existsSync(dir)) return;
    for (const ent of fsSync.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === "_deprecated") continue;
        walk(full);
      } else if (/\.(tsx?|jsx?|css|json)$/.test(ent.name)) {
        const st = fsSync.statSync(full);
        hash.update(`${full}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(path.resolve("remotion"));
  walk(path.resolve("src/lib"));
  for (const f of ["package-lock.json", "tsconfig.json", "remotion.config.ts"]) {
    if (fsSync.existsSync(f)) hash.update(`${f}:${fsSync.statSync(f).mtimeMs}`);
  }
  return hash.digest("hex").slice(0, 16);
}

async function getCachedBundle(entryPoint) {
  const cacheRoot = path.resolve(".tmp", "remotion-bundle");
  const bundleDir = path.join(cacheRoot, computeBundleHash());
  if (fsSync.existsSync(path.join(bundleDir, "bundle.js"))) {
    return { bundleLocation: bundleDir, cached: true };
  }
  // Drop stale bundles so .tmp does not grow forever.
  await fs.rm(cacheRoot, { recursive: true, force: true }).catch(() => {});
  const emptyPublic = path.resolve(".tmp", "empty_public");
  await fs.mkdir(emptyPublic, { recursive: true });
  const bundleLocation = await bundle({ entryPoint, publicDir: emptyPublic, outDir: bundleDir });
  return { bundleLocation, cached: false };
}

function resolveConcurrency(requested) {
  // Each Remotion tab is single-threaded; leave headroom for FFmpeg + the Next server.
  const cores = os.cpus()?.length || 4;
  const auto = Math.max(2, Math.min(8, Math.floor(cores / 2)));
  return requested > 0 ? Math.min(requested, auto) : auto;
}

async function main() {
  const args = process.argv.slice(2);
  let propsFile = null;
  let outputFile = null;
  let concurrency = 0; // 0 = auto (half of logical cores)
  let scale = 1;
  let engine = "remotion";
  let progressFile = path.resolve(".tmp/render_progress.json");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--props-file" && args[i + 1]) {
      propsFile = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[++i];
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = Math.max(0, parseInt(args[++i], 10) || 0);
    } else if (args[i] === "--scale" && args[i + 1]) {
      scale = Math.max(0.5, Math.min(1, parseFloat(args[++i]) || 1));
      if (Math.abs(scale - 0.667) < 0.000001) scale = 2 / 3;
    } else if (args[i] === "--engine" && args[i + 1]) {
      engine = args[++i];
    } else if (args[i] === "--progress-file" && args[i + 1]) {
      progressFile = path.resolve(args[++i]);
    }
  }

  let inputProps = {};
  if (propsFile) {
    const raw = await fs.readFile(propsFile, "utf-8");
    inputProps = JSON.parse(raw);
    delete inputProps.showSafeZone;
  }

  const outputPath = outputFile
    ? path.resolve(outputFile)
    : path.resolve(`public/renders/shopee_video_${Date.now()}.mp4`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Legacy turbo callers now use the selected Remotion template too.
  const { prepareVideoProps } = await tsImport(pathToFileURL(path.resolve("src/lib/videoPreparation.ts")).href, import.meta.url);
  inputProps = await prepareVideoProps(inputProps);

  const writeProgress = async (data) => {
    try {
      await fs.mkdir(path.dirname(progressFile), { recursive: true });
      await fs.writeFile(progressFile, JSON.stringify({
        updatedAt: Date.now(), productId: inputProps.productId,
        requestId: inputProps.renderRequestId,
        videoUrl: `/renders/${path.basename(outputPath)}`,
        ...data,
        ...(data.status === "complete" && inputProps.renderRequestId ? { status: "finalizing", percent: 99, message: "เรนเดอร์เสร็จแล้ว กำลังสร้าง Export Bundle..." } : {}),
      }), "utf-8");
    } catch {}
  };

  try {
    await writeProgress({ status: "bundling", percent: 6, message: "กำลังจัดเตรียมไฟล์มีเดียและคอมโพเนนต์..." });

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
              break;
            }
          } catch {}
        }
      } catch {}
    }

    const entryPoint = path.resolve("remotion/index.ts");
    const { bundleLocation, cached } = await getCachedBundle(entryPoint);
    console.log(`[render] bundle ${cached ? "cache hit" : "rebuilt"}: ${bundleLocation}`);
    // Stage only this video's media straight into the bundle's public folder.
    await stageMinimalPublicDir(inputProps, path.join(bundleLocation, "public"));

    await writeProgress({ status: "rendering", percent: 15, message: "เริ่มเรนเดอร์แอนิเมชันวิดีโอ..." });

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ShopeeProductVideo",
      inputProps,
    });
    const effectiveConcurrency = resolveConcurrency(concurrency);
    console.log(`[render] concurrency=${effectiveConcurrency}`);

    let lastLoggedPercent = -1;
    let lastWriteTime = 0;
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      imageFormat: "jpeg",
      jpegQuality: 85,
      x264Preset: "veryfast",
      outputLocation: outputPath,
      inputProps,
      concurrency: effectiveConcurrency,
      scale,
      timeoutInMilliseconds: 60000,
      offthreadVideoCacheSizeInBytes: 128 * 1024 * 1024,
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
        // Use the GPU (via ANGLE) for shadows/filters instead of software rendering.
        gl: "angle",
      },
      onProgress: ({ progress, renderedFrames, totalFrames }) => {
        const percent = Math.min(99, Math.max(15, Math.floor(15 + progress * 84)));
        const total = totalFrames || composition?.durationInFrames || 0;
        const now = Date.now();
        if (percent !== lastLoggedPercent) {
          lastLoggedPercent = percent;
          console.log(`PROGRESS:${percent}:${renderedFrames}:${total}`);
          if (now - lastWriteTime >= 500 || percent >= 98) {
            lastWriteTime = now;
            void writeProgress({
              status: "rendering",
              percent,
              renderedFrames,
              totalFrames: total,
              message: `กำลังเรนเดอร์เฟรม ${renderedFrames}/${total || "..."} (${percent}%)`,
            });
          }
        }
      },
    });

    await fs.writeFile(outputPath.replace(/\.mp4$/i, ".render.json"), JSON.stringify({ engine: "remotion", presentationStyle: inputProps.presentationStyle || "notebook-presenter", pack: inputProps.styleDNA?.pack || "pro-minimal-luxury", captionCues: inputProps.captionCues, fps: composition.fps, durationSec: composition.durationInFrames / composition.fps }, null, 2));
    await writeProgress({
      status: "complete",
      percent: 100,
      message: "เรนเดอร์เสร็จสมบูรณ์!",
      outputPath,
      videoUrl: `/renders/${path.basename(outputPath)}`,
    });

    try {
      const rootRendersDir = path.resolve("renders");
      await fs.mkdir(rootRendersDir, { recursive: true });
      await fs.copyFile(outputPath, path.join(rootRendersDir, path.basename(outputPath)));
    } catch {}
  } catch (remotionErr) {
    await writeProgress({ status: "error", percent: 0, message: `เรนเดอร์ Remotion ไม่สำเร็จ: ${remotionErr?.message}` });
    throw remotionErr;
  }
}

main().catch((err) => {
  console.error("[Render Worker Fatal Error]:", err);
  process.exit(1);
});
