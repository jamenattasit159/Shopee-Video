import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import { GoogleGenAI } from "@google/genai";
import { ensureBrowser } from "@remotion/renderer";
import { getFfmpegPath, getFfprobePath } from "@/lib/ffmpeg";
import { withErrorHandling } from "@/lib/serverError";

const execFileAsync = util.promisify(execFile);

async function checkDirectoryWritable(dirPath: string): Promise<boolean> {
  const testFile = path.join(dirPath, `.health_check_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`);
  try {
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(testFile, "ok", "utf-8");
    await fs.unlink(testFile).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function checkFfmpegFilters(): Promise<{
  available: boolean;
  filters: Record<string, boolean>;
}> {
  const ffmpeg = getFfmpegPath();
  try {
    const { stdout } = await execFileAsync(ffmpeg, ["-filters"]);
    const targetFilters = ["atempo", "loudnorm", "highpass", "acompressor", "equalizer"];
    const results: Record<string, boolean> = {};

    for (const f of targetFilters) {
      results[f] = stdout.includes(` ${f} `) || stdout.includes(f);
    }

    return {
      available: true,
      filters: results,
    };
  } catch {
    return {
      available: false,
      filters: {
        atempo: false,
        loudnorm: false,
        highpass: false,
        acompressor: false,
        equalizer: false,
      },
    };
  }
}

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const timestamp = new Date().toISOString();

  // 1. Environment check (only boolean presence, NEVER expose key values)
  const geminiApiKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== "" &&
      !process.env.GEMINI_API_KEY.includes("your_gemini_api_key")
  );

  // 2. FFmpeg & Filters
  const ffmpegInfo = await checkFfmpegFilters();
  const ffprobePath = getFfprobePath();

  // 3. Remotion Chromium Browser
  let browserAvailable = false;
  let browserType = "unknown";
  try {
    const browserInfo = await ensureBrowser();
    if (browserInfo && (browserInfo as any).path) {
      browserAvailable = true;
      browserType = (browserInfo as any).type || "headless-shell";
    }
  } catch (browserErr: any) {
    console.warn("[health] Browser check failed:", browserErr?.message);
    browserAvailable = false;
  }

  // 4. Directory writability
  const writableDirs = {
    data: await checkDirectoryWritable(path.join(process.cwd(), "data")),
    publicUploads: await checkDirectoryWritable(path.join(process.cwd(), "public", "uploads")),
    publicRenders: await checkDirectoryWritable(path.join(process.cwd(), "public", "renders")),
  };

  // 5. Disk Space
  let diskFreeGB = 0;
  try {
    const stat = await fs.statfs(process.cwd());
    diskFreeGB = Number(((stat.bfree * stat.bsize) / (1024 * 1024 * 1024)).toFixed(2));
  } catch {
    diskFreeGB = 0;
  }

  // 6. Active Replicated Voices check
  let replicatedVoicesCount = 0;
  let replicatedVoicesStatus: "ready" | "no_key" | "error" = "no_key";
  if (geminiApiKeyConfigured) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const resp = await ai.voices.list({ type: ["replicated"] });
      replicatedVoicesCount = resp.voices?.length || 0;
      replicatedVoicesStatus = "ready";
    } catch {
      replicatedVoicesStatus = "error";
    }
  }

  // Evaluate overall system health status
  const isHealthy =
    browserAvailable &&
    writableDirs.data &&
    writableDirs.publicUploads &&
    writableDirs.publicRenders &&
    diskFreeGB > 1.0 &&
    ffmpegInfo.available;

  const hasWarnings =
    !geminiApiKeyConfigured ||
    replicatedVoicesStatus === "error" ||
    !ffmpegInfo.filters.highpass;

  const overallStatus: "healthy" | "warning" | "unhealthy" = !isHealthy
    ? "unhealthy"
    : hasWarnings
    ? "warning"
    : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp,
    checks: {
      environment: {
        geminiApiKeyConfigured,
      },
      ffmpeg: {
        available: ffmpegInfo.available,
        ffprobeAvailable: ffprobePath !== "ffprobe" || ffmpegInfo.available,
        filters: ffmpegInfo.filters,
      },
      remotion: {
        browserAvailable,
        browserType,
      },
      storage: {
        directoriesWritable: writableDirs,
        diskFreeGB,
        diskSpaceOk: diskFreeGB > 1.0,
      },
      voices: {
        status: replicatedVoicesStatus,
        count: replicatedVoicesCount,
      },
    },
  });
});
