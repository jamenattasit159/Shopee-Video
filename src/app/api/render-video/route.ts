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

export const GET = withErrorHandling(async (req: NextRequest) => {
  const progressFile = path.join(process.cwd(), ".tmp", "render_progress.json");
  try {
    const raw = await fs.readFile(progressFile, "utf-8");
    const progress = JSON.parse(raw);
    const productId = req.nextUrl.searchParams.get("productId");
    const requestId = req.nextUrl.searchParams.get("requestId");
    if ((productId && progress.productId !== productId) || (requestId && progress.requestId !== requestId)) {
      return NextResponse.json({ ok: true, progress: { status: "idle", percent: 0 } });
    }
    return NextResponse.json({ ok: true, progress });
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
  const { productId, requestId = `render_${Date.now()}`, props: requestedProps, renderMode = "remotion", resolutionScale = 1 } = body;
  const props = requestedProps ? await prepareVideoProps(requestedProps) : null;

  if (!props) {
    const err: any = new Error("จำเป็นต้องระบุ Video props");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const scale = Number(resolutionScale) === 0.667 ? 2 / 3 : 1;
  // The presenter layout must use the same composition as the live preview.
  // Direct FFmpeg has a different scene layout and cannot preserve this template.
  const preserveTemplate = props.presentationStyle !== "original";
  const isTurbo = renderMode === "turbo" && !preserveTemplate;
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
  const videoUrl = `/renders/${filename}`;

  await fs.writeFile(tempPropsFile, JSON.stringify({ ...props, productId: id, renderRequestId: requestId }, null, 2), "utf-8");
  await fs.writeFile(
    progressFile,
    JSON.stringify({
      status: "starting",
      requestId,
      percent: 4,
      productId: id,
      videoUrl,
      message:
        isTurbo
          ? "กำลังเริ่มต้นเรนเดอร์ด่วนพิเศษ (Turbo Direct Engine)..."
          : "กำลังเริ่มต้นเรนเดอร์แอนิเมชัน (พร้อมระบบป้องกัน Timeout อัตโนมัติ)...",
      updatedAt: Date.now(),
    }),
    "utf-8"
  );

  const fastScriptPath = path.join(process.cwd(), "scripts", "fast-ffmpeg-render.mjs");
  const remotionScriptPath = path.join(process.cwd(), "scripts", "render.mjs");
  const logLines: string[] = [];
  let fallbackUsed = false;

  try {
    let result: { success: boolean; timedOut?: boolean; code?: number; error?: string };

    if (isTurbo) {
      result = await runWorkerScript(
        fastScriptPath,
        [
          "--props-file", tempPropsFile,
          "--output", outputPublicPath,
          "--scale", String(scale),
          "--progress-file", progressFile,
        ],
        180000,
        logLines
      );
    } else {
      result = await runWorkerScript(
        remotionScriptPath,
        [
          "--props-file", tempPropsFile,
          "--output", outputPublicPath,
          "--engine", "remotion",
          "--concurrency", String(concurrency),
          "--scale", String(scale),
          "--progress-file", progressFile,
        ],
        10 * 60 * 1000,
        logLines
      );

      // Auto-fallback to Turbo if Remotion failed or timed out
      if (!preserveTemplate && (!result.success || !fsSync.existsSync(outputPublicPath))) {
        console.warn(`[render-video] Remotion failed (${result.error}). Auto-fallback to Turbo Direct...`);
        await fs.writeFile(
          progressFile,
          JSON.stringify({
            status: "rendering",
            requestId,
            percent: 50,
            productId: id,
            videoUrl,
            message: "Remotion ใช้เวลานานเกินกำหนด กำลังสลับไปใช้ Turbo Engine อัตโนมัติ...",
            updatedAt: Date.now(),
          }),
          "utf-8"
        ).catch(() => {});

        result = await runWorkerScript(
          fastScriptPath,
          [
            "--props-file", tempPropsFile,
            "--output", outputPublicPath,
            "--scale", String(scale),
            "--progress-file", progressFile,
          ],
          180000,
          logLines
        );

        if (result.success && fsSync.existsSync(outputPublicPath)) {
          fallbackUsed = true;
        }
      }
    }

    if (!result.success || !fsSync.existsSync(outputPublicPath)) {
      const renderErr: any = new Error(
        `การสร้างวิดีโอล้มเหลว (${result.error || "ไม่ทราบสาเหตุ"})`
      );
      renderErr.code = "RENDER_EXIT_NONZERO";
      renderErr.status = 500;
      await fs.writeFile(
        progressFile,
        JSON.stringify({
          status: "error",
          requestId,
          percent: 0,
          productId: id,
          message: renderErr.message,
          updatedAt: Date.now(),
        }),
        "utf-8"
      ).catch(() => {});
      throw renderErr;
    }
  } finally {
    await fs.unlink(tempPropsFile).catch(() => {});
  }

  try {
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

    await fs.writeFile(
      progressFile,
      JSON.stringify({
        status: "complete",
        requestId,
        percent: 100,
        productId: id,
        videoUrl,
        filename,
        exportBundle,
        message: fallbackUsed
          ? "เรนเดอร์วิดีโอสำเร็จด้วยโหมดด่วนพิเศษ (Turbo Direct Fallback)"
          : "เรนเดอร์วิดีโอและสร้าง Export Bundle สำเร็จ",
        updatedAt: Date.now(),
      }),
      "utf-8"
    ).catch(() => {});

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
  } catch (error) {
    await fs.writeFile(progressFile, JSON.stringify({ status: "error", requestId, productId: id,
      percent: 0, message: "เรนเดอร์วิดีโอแล้ว แต่บันทึกผลไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บและเซิร์ฟเวอร์", updatedAt: Date.now() }), "utf-8").catch(() => {});
    throw error;
  }
});
