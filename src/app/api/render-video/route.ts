import { spawn } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { updateProductVideo, getProductById } from "@/lib/storage";
import { getAudioDurationInSeconds } from "@/lib/tts";
import { withErrorHandling } from "@/lib/serverError";
import { createExportBundle } from "@/lib/exportBundle";
import { prepareVideoProps } from "@/lib/videoPreparation";

export const GET = withErrorHandling(async () => {
  const progressFile = path.join(process.cwd(), ".tmp", "render_progress.json");
  try {
    const raw = await fs.readFile(progressFile, "utf-8");
    return NextResponse.json({ ok: true, progress: JSON.parse(raw) });
  } catch {
    return NextResponse.json({
      ok: true,
      progress: { status: "idle", percent: 0, message: "พร้อมเรนเดอร์" },
    });
  }
});

function runWorkerScript(
  scriptPath: string,
  args: string[],
  timeoutMs: number,
  logLines: string[]
): Promise<{ success: boolean; timedOut?: boolean; code?: number; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn("node", [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
      resolve({
        success: false,
        timedOut: true,
        code: -1,
        error: `Worker timed out after ${Math.round(timeoutMs / 1000)}s`,
      });
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
      if (code === 0) {
        resolve({ success: true, code: 0 });
      } else {
        resolve({
          success: false,
          code: code ?? -1,
          error: logLines.slice(-5).join("\n") || `Exited with code ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        code: -1,
        error: err.message,
      });
    });
  });
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { productId, props: requestedProps, renderMode = "remotion", resolutionScale = 1 } = body;
  const props = requestedProps ? await prepareVideoProps(requestedProps) : null;

  if (!props) {
    const err: any = new Error("จำเป็นต้องระบุ Video props");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const scale = Number(resolutionScale) === 0.667 ? 0.667 : 1;
  const isRemotionRequested = true;
  const concurrency = renderMode === "fast" ? 2 : 1;

  const id = productId || `prod_${Date.now()}`;
  const filename = `shopee_${id}_${Date.now()}.mp4`;
  const outputPublicPath = path.join(process.cwd(), "public", "renders", filename);

  delete props.showSafeZone;

  if (props.voiceoverUrl && !props.voiceoverDurationSec) {
    const audioRelative = props.voiceoverUrl.replace(/^\//, "");
    const fullAudioPath = path.join(process.cwd(), "public", audioRelative);
    const dur = getAudioDurationInSeconds(fullAudioPath);
    if (dur > 0) {
      props.voiceoverDurationSec = dur;
    }
  }

  const tempDir = path.join(process.cwd(), ".tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const tempPropsFile = path.join(tempDir, `props_${Date.now()}.json`);
  const progressFile = path.join(tempDir, "render_progress.json");
  await fs.writeFile(tempPropsFile, JSON.stringify(props, null, 2), "utf-8");
  await fs.writeFile(
    progressFile,
    JSON.stringify({
      status: "starting",
      percent: 4,
      message:
        isRemotionRequested
          ? "กำลังเริ่มต้นเรนเดอร์แอนิเมชัน (พร้อมระบบป้องกัน Timeout อัตโนมัติ)..."
          : "กำลังเริ่มต้นเรนเดอร์ด่วนพิเศษ (Turbo Direct Engine)...",
      updatedAt: Date.now(),
    }),
    "utf-8"
  );

  const renderScriptPath = path.join(process.cwd(), "scripts", "render.mjs");
  const logLines: string[] = [];
  let fallbackUsed = false;

  try {
    let result: { success: boolean; timedOut?: boolean; code?: number; error?: string };

    result = await runWorkerScript(renderScriptPath, [
      "--props-file", tempPropsFile, "--output", outputPublicPath,
      "--engine", "remotion", "--concurrency", String(concurrency),
      "--scale", String(scale), "--progress-file", progressFile,
    ], 10 * 60 * 1000, logLines);

    if (!result.success || !fsSync.existsSync(outputPublicPath)) {
      const renderErr: any = new Error(
        `การสร้างวิดีโอล้มเหลว (${result.error || "ไม่ทราบสาเหตุ"})`
      );
      renderErr.code = "RENDER_EXIT_NONZERO";
      renderErr.status = 500;
      throw renderErr;
    }
  } finally {
    await fs.unlink(tempPropsFile).catch(() => {});
  }

  const videoUrl = `/renders/${filename}`;
  if (productId) {
    await updateProductVideo(productId, videoUrl);
  }

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
    fallbackUsed,
    message: fallbackUsed
      ? "เรนเดอร์วิดีโอสำเร็จด้วยโหมดด่วนพิเศษ (Turbo Direct Fallback)"
      : "เรนเดอร์วิดีโอและสร้าง Export Bundle สำเร็จ",
  });
});
