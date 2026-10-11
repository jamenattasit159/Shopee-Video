import fs from "fs";
import path from "path";
import { execFfmpegAsync, getFfmpegFilters, getAudioDurationInSeconds } from "./ffmpeg";

export interface PolishOptions {
  atempo?: number;
  compressor?: boolean;
  presenceDb?: number;
  targetLufs?: number;
}

export interface PolishResult {
  success: boolean;
  outputPath: string;
  durationSec: number;
  appliedFilters: string[];
  missingFilters: string[];
  warnings: string[];
}

/**
 * Polishes speech audio:
 * - Checks filter availability dynamically
 * - Clamps atempo strictly to [1.00, 1.12] (Rule: NO pitch alteration)
 * - Normalizes loudness to target LUFS (default -14 LUFS)
 * - Skips missing filters gracefully and falls back to raw audio if needed
 */
export async function polishAudio(
  inputPath: string,
  outputPath: string,
  options: PolishOptions = {}
): Promise<PolishResult> {
  const fullInput = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
  const fullOutput = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath);

  const initialDuration = getAudioDurationInSeconds(fullInput);

  if (!fs.existsSync(fullInput)) {
    return {
      success: false,
      outputPath: fullInput,
      durationSec: initialDuration,
      appliedFilters: [],
      missingFilters: [],
      warnings: [`Audio file not found: ${fullInput}`],
    };
  }

  // Ensure output directory exists
  const outDir = path.dirname(fullOutput);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const availableFilters = await getFfmpegFilters();
  const filterParts: string[] = [];
  const missingFilters: string[] = [];
  const warnings: string[] = [];

  // 1. Highpass filter (cuts sub-bass rumble below 80Hz)
  if (availableFilters.has("highpass")) {
    filterParts.push("highpass=f=80");
  } else {
    missingFilters.push("highpass");
  }

  // 2. Compressor (gentle leveling for vocal presence)
  if (options.compressor !== false) {
    if (availableFilters.has("acompressor")) {
      filterParts.push("acompressor=threshold=-18dB:ratio=3:attack=5:release=80");
    } else {
      missingFilters.push("acompressor");
    }
  }

  // 3. Equalizer (speech presence boost at 3kHz)
  const presenceDb = Math.min(6, Math.max(0, options.presenceDb ?? 2));
  if (presenceDb > 0) {
    if (availableFilters.has("equalizer")) {
      filterParts.push(`equalizer=f=3000:t=q:w=1:g=${presenceDb}`);
    } else {
      missingFilters.push("equalizer");
    }
  }

  // 4. Atempo (strictly clamped to 1.00 - 1.12 to preserve speaker voice pitch)
  const rawTempo = options.atempo ?? 1.0;
  const clampedTempo = Math.min(1.12, Math.max(1.00, Number(rawTempo.toFixed(2))));
  if (clampedTempo !== 1.0) {
    if (availableFilters.has("atempo")) {
      filterParts.push(`atempo=${clampedTempo}`);
    } else {
      missingFilters.push("atempo");
    }
  }

  // 5. Loudnorm (standard EBU R128 loudness normalization, target -14 LUFS)
  const targetLufs = Math.min(-12, Math.max(-24, options.targetLufs ?? -14));
  if (availableFilters.has("loudnorm")) {
    filterParts.push(`loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`);
  } else {
    missingFilters.push("loudnorm");
  }

  if (missingFilters.length > 0) {
    warnings.push(`ฟิลเตอร์ปรับแต่งเสียงบางตัวไม่พร้อมใช้งาน (${missingFilters.join(", ")}) ระบบจะใช้ฟิลเตอร์ที่มีแทน`);
  }

  // If no filters can be applied, copy or return input
  if (filterParts.length === 0) {
    return {
      success: true,
      outputPath: fullInput,
      durationSec: initialDuration,
      appliedFilters: [],
      missingFilters,
      warnings: ["ไม่มีฟิลเตอร์ขัดเสียงที่พร้อมใช้งาน ใช้เสียงต้นฉบับแทน"],
    };
  }

  const filterString = filterParts.join(",");

  try {
    await execFfmpegAsync([
      "-y",
      "-i",
      fullInput,
      "-af",
      filterString,
      "-ar",
      "24000",
      "-ac",
      "1",
      fullOutput,
    ]);

    const newDuration = getAudioDurationInSeconds(fullOutput);

    return {
      success: true,
      outputPath: fullOutput,
      durationSec: newDuration > 0 ? newDuration : initialDuration,
      appliedFilters: filterParts,
      missingFilters,
      warnings,
    };
  } catch (err: any) {
    console.warn("[audioPolish] FFmpeg audio polish failed, falling back to raw audio:", err?.message);
    return {
      success: false,
      outputPath: fullInput,
      durationSec: initialDuration,
      appliedFilters: [],
      missingFilters,
      warnings: [`การขัดเสียงล้มเหลว (${err?.message}) ระบบสลับไปใช้เสียงดิบ`],
    };
  }
}
