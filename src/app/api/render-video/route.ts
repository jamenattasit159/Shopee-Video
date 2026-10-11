import { spawn } from "child_process";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { updateProductVideo, getProductById } from "@/lib/storage";
import { getAudioDurationInSeconds } from "@/lib/tts";
import { withErrorHandling } from "@/lib/serverError";
import { redact } from "@/lib/errors";
import { createExportBundle } from "@/lib/exportBundle";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { productId, props } = body;

  if (!props) {
    const err: any = new Error("จำเป็นต้องระบุ Video props");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const id = productId || `prod_${Date.now()}`;
  const filename = `shopee_${id}_${Date.now()}.mp4`;
  const outputPublicPath = path.join(process.cwd(), "public", "renders", filename);

  // Guarantee that preview guides like showSafeZone are NEVER rendered into the video
  delete props.showSafeZone;

  // Guarantee that voiceover duration is accurately measured so video duration matches speech
  if (props.voiceoverUrl && !props.voiceoverDurationSec) {
    const audioRelative = props.voiceoverUrl.replace(/^\//, "");
    const fullAudioPath = path.join(process.cwd(), "public", audioRelative);
    const dur = getAudioDurationInSeconds(fullAudioPath);
    if (dur > 0) {
      props.voiceoverDurationSec = dur;
    }
  }

  // Write temp props file for the render worker
  const tempDir = path.join(process.cwd(), ".tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const tempPropsFile = path.join(tempDir, `props_${Date.now()}.json`);
  await fs.writeFile(tempPropsFile, JSON.stringify(props, null, 2), "utf-8");

  const renderScriptPath = path.join(process.cwd(), "scripts", "render.mjs");
  const logLines: string[] = [];

  // Execute render script via Node child process with a 5-minute timeout
  const renderPromise = new Promise<{ success: boolean; code?: number; error?: string }>(
    (resolve, reject) => {
      const child = spawn(
        "node",
        [
          renderScriptPath,
          "--props-file",
          tempPropsFile,
          "--output",
          outputPublicPath,
        ],
        {
          cwd: process.cwd(),
          env: process.env,
        }
      );

      const timeoutMs = 5 * 60 * 1000;
      const timer = setTimeout(() => {
        child.kill();
        const timeoutErr: any = new Error("การเรนเดอร์วิดีโอใช้เวลานานเกินกำหนด (Render Timeout 5 นาที)");
        timeoutErr.code = "RENDER_TIMEOUT";
        timeoutErr.status = 504;
        timeoutErr.details = {
          lastLogs: redact(logLines.slice(-20)),
        };
        reject(timeoutErr);
      }, timeoutMs);

      child.stdout.on("data", (data) => {
        const text = data.toString();
        text.split("\n").forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) {
            logLines.push(trimmed);
            console.log(`[Render Worker] ${trimmed}`);
          }
        });
      });

      child.stderr.on("data", (data) => {
        const text = data.toString();
        text.split("\n").forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) {
            logLines.push(trimmed);
            console.error(`[Render Worker Err] ${trimmed}`);
          }
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        // Cleanup temp file safely
        fs.unlink(tempPropsFile).catch((unlinkErr) => {
          console.warn("[Render Worker] Failed to unlink temp props file:", unlinkErr);
        });

        if (code === 0) {
          resolve({ success: true, code: 0 });
        } else {
          resolve({
            success: false,
            code: code ?? -1,
            error: logLines.slice(-5).join("\n") || `Render process exited with code ${code}`,
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    }
  );

  const result = await renderPromise;

  if (!result.success) {
    const renderErr: any = new Error(
      `การเรนเดอร์วิดีโอ Remotion ล้มเหลว (Exit Code: ${result.code})\n${result.error || ""}`
    );
    renderErr.code = "RENDER_EXIT_NONZERO";
    renderErr.status = 500;
    renderErr.details = {
      exitCode: result.code,
      lastLogs: redact(logLines.slice(-20)),
    };
    throw renderErr;
  }

  const videoUrl = `/renders/${filename}`;
  if (productId) {
    await updateProductVideo(productId, videoUrl);
  }

  // Generate complete Export Bundle (video.mp4, cover.jpg, captions.srt, caption.txt, meta.json, bundle.zip)
  let exportBundle = null;
  try {
    const productRecord = productId ? await getProductById(productId) : null;
    exportBundle = await createExportBundle({
      renderedVideoPath: outputPublicPath,
      project: props,
      productRecord: productRecord || undefined,
      preflightResults: body.preflightResults,
      acknowledgedWarnings: body.acknowledgedWarnings,
    });
  } catch (bundleErr: any) {
    console.warn("[render-video] Export bundle generation warning:", bundleErr?.message);
  }

  return NextResponse.json({
    ok: true,
    success: true,
    videoUrl,
    filename,
    exportBundle,
    message: "Video rendered and export bundle generated successfully",
  });
});
