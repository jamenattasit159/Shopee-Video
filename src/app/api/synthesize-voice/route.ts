import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import {
  buildNarrationScript,
  generateThaiVoiceover,
  synthesizeGeminiVoiceover,
  getAudioDurationInSeconds,
  TTSEngine,
  VoiceOption,
} from "@/lib/tts";
import { withErrorHandling } from "@/lib/serverError";
import { toAppError, AppError } from "@/lib/errors";
import {
  VOICE_PRESETS,
  VoiceIntensity,
  buildEffectiveStylePrompt,
} from "@/lib/voicePresets";
import { normalizeForSpeech } from "@/lib/speechText";
import { polishAudio } from "@/lib/audioPolish";
import { concatAudioFiles } from "@/lib/ffmpeg";

interface SynthesizeLineInput {
  id: string;
  text: string;
  style?: string;
  role?: "hook" | "body" | "cta";
}

interface SynthesizeFileOutput {
  id: string;
  text: string;
  textForSpeech: string;
  url: string;
  rawUrl: string;
  durationSec: number;
  cached: boolean;
  polished: boolean;
  warnings?: AppError[];
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const {
    productName,
    price,
    storyboard,
    voiceType,
    customText,
    ttsEngine = "free",
    rate = "+0%",
    geminiVoice = "Puck",
    presetId = "vendor-live",
    intensity = "mid",
    style: globalStyleOverride,
    lines: inputLines,
    polish = true,
    previewOnly = false,
    skipCache = false,
  } = body;

  // 1. Resolve lines to synthesize
  let lines: SynthesizeLineInput[] = [];

  if (previewOnly && Array.isArray(inputLines) && inputLines.length > 0) {
    lines = inputLines.filter((l) => l && l.text && l.text.trim());
  } else if (customText && typeof customText === "string" && customText.trim()) {
    lines = [{ id: "main", text: customText.trim() }];
  } else if (Array.isArray(inputLines) && inputLines.length > 0) {
    lines = inputLines.filter((l) => l && l.text && l.text.trim());
  } else {
    const scriptText =
      (storyboard ? buildNarrationScript(productName || "", price || "", storyboard) : "");

    if (!scriptText || !scriptText.trim()) {
      const err: any = new Error("ข้อความบทพากย์ว่างเปล่า กรุณาระบุข้อความบทพากย์");
      err.code = "UPLOAD_INVALID";
      err.status = 400;
      throw err;
    }

    lines = [{ id: "main", text: scriptText.trim() }];
  }

  if (lines.length === 0) {
    const err: any = new Error("ไม่พบข้อความสำหรับสังเคราะห์เสียง");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  // Preset configuration
  const preset = VOICE_PRESETS.find((p) => p.id === presetId) || VOICE_PRESETS[0];
  const selectedVoice: VoiceOption = voiceType || "female";
  const engine: TTSEngine = (ttsEngine as TTSEngine) || "free";

  // Cache directory
  const cacheDir = path.join(process.cwd(), "public", "audio", "cache");
  await fs.mkdir(cacheDir, { recursive: true });

  const files: SynthesizeFileOutput[] = [];
  const globalWarnings: AppError[] = [];
  let fallbackNotice: string | undefined;

  // Process lines with max concurrency of 2
  const CONCURRENCY = 2;
  for (let i = 0; i < lines.length; i += CONCURRENCY) {
    const chunk = lines.slice(i, i + CONCURRENCY);

    const chunkResults = await Promise.all(
      chunk.map(async (lineItem): Promise<SynthesizeFileOutput> => {
        let textToUse = lineItem.text.trim();
        if (previewOnly && textToUse.length > 60) {
          textToUse = textToUse.slice(0, 60) + "...";
        }

        // A. Normalize for speech
        const normResult = normalizeForSpeech(textToUse);
        const textForSpeech = normResult.textForSpeech;
        const lineWarnings: AppError[] = [];

        if (normResult.unverifiedWords.length > 0) {
          lineWarnings.push(
            toAppError({
              code: "PRONUNCIATION_UNVERIFIED",
              severity: "warning",
              source: "tts",
              messageTh: `พบคำภาษาอังกฤษที่ยังไม่ได้กำหนดคำอ่าน: ${normResult.unverifiedWords.join(", ")}`,
              hintTh: "สามารถเพิ่มคำอ่านไทยลงในพจนานุกรมการออกเสียงเพื่อความถูกต้อง",
            })
          );
        }

        // B. Effective style prompt
        const lineStyle =
          lineItem.style ||
          globalStyleOverride ||
          buildEffectiveStylePrompt(preset.id, intensity as VoiceIntensity);

        // C. Compute Cache Key
        const voiceKey = engine === "gemini" ? (geminiVoice || "Puck") : `${selectedVoice}_${rate}`;
        const cacheHash = crypto
          .createHash("sha256")
          .update(
            `${voiceKey}:${textForSpeech}:${lineStyle}:${intensity}:${polish ? JSON.stringify(preset.polish) : "raw"}`
          )
          .digest("hex")
          .slice(0, 32);

        const ext = engine === "gemini" ? ".wav" : ".mp3";
        const cachedFilename = `${cacheHash}${ext}`;
        const cachedFilePath = path.join(cacheDir, cachedFilename);
        const cachedPublicUrl = `/audio/cache/${cachedFilename}`;

        // Check disk cache
        if (!skipCache) {
          try {
            const stat = await fs.stat(cachedFilePath);
            if (stat.size > 0) {
              const duration = getAudioDurationInSeconds(cachedFilePath);
              return {
                id: lineItem.id,
                text: lineItem.text,
                textForSpeech,
                url: cachedPublicUrl,
                rawUrl: cachedPublicUrl,
                durationSec: duration,
                cached: true,
                polished: polish,
                warnings: lineWarnings.length > 0 ? lineWarnings : undefined,
              };
            }
          } catch {
            // Not in cache, proceed to generate
          }
        }

        // D. Synthesize speech (with 1 retry on timeout)
        let rawRelativeUrl: string | null = null;
        let actualEngine = engine;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (engine === "gemini") {
              const rawFileName = `raw_${cacheHash}_${Date.now()}.wav`;
              const rawFilePath = path.join(cacheDir, rawFileName);
              rawRelativeUrl = await synthesizeGeminiVoiceover(
                textForSpeech,
                geminiVoice || "Puck",
                lineStyle,
                rawFilePath
              );
            } else {
              rawRelativeUrl = await generateThaiVoiceover(
                textForSpeech,
                selectedVoice,
                `tts_${cacheHash}`,
                rate || "+0%"
              );
            }
            if (rawRelativeUrl) break;
          } catch (synthErr: any) {
            const errStr = String(synthErr?.message || synthErr || "");
            if (engine === "gemini") {
              // Quota exhaustion or fallback
              if (
                errStr.includes("429") ||
                errStr.includes("quota") ||
                errStr.includes("RESOURCE_EXHAUSTED") ||
                errStr.includes("GEMINI_NO_KEY")
              ) {
                console.warn(`[synthesize-voice] Gemini TTS failed, falling back to free TTS:`, errStr);
                fallbackNotice = "สลับมาใช้เสียงฟรีอัตโนมัติ เนื่องจากโควตา Gemini API หมดหรือเครดิตไม่เพียงพอ";
                actualEngine = "free";
                rawRelativeUrl = await generateThaiVoiceover(
                  textForSpeech,
                  selectedVoice,
                  `tts_fb_${cacheHash}`,
                  rate || "+0%"
                );
                if (rawRelativeUrl) break;
              }
            }
            if (attempt === 1) {
              console.error(`[synthesize-voice] Line ${lineItem.id} failed after retry:`, synthErr);
              throw synthErr;
            }
          }
        }

        if (!rawRelativeUrl) {
          const err: any = new Error(`ไม่สามารถสังเคราะห์เสียงบรรทัด "${lineItem.text.slice(0, 20)}..." ได้`);
          err.code = "TTS_TIMEOUT";
          err.status = 500;
          throw err;
        }

        const rawDiskPath = path.join(process.cwd(), "public", rawRelativeUrl.replace(/^\//, ""));

        // E. Polish Audio if enabled
        let finalRelativeUrl = rawRelativeUrl;
        let wasPolished = false;

        if (polish) {
          try {
            const polishResult = await polishAudio(rawDiskPath, cachedFilePath, preset.polish);
            if (polishResult.success && polishResult.outputPath === cachedFilePath) {
              finalRelativeUrl = cachedPublicUrl;
              wasPolished = true;
            }
            if (polishResult.warnings.length > 0) {
              lineWarnings.push(
                toAppError({
                  code: "AUDIO_POLISH_FILTER_MISSING",
                  severity: "warning",
                  source: "ffmpeg",
                  messageTh: polishResult.warnings.join(" | "),
                  hintTh: "ระบบข้ามฟิลเตอร์ที่ไม่รองรับและปรับแต่งเสียงด้วยฟิลเตอร์ที่เหลือให้อัตโนมัติ",
                })
              );
            }
          } catch (polishErr: any) {
            console.warn(`[synthesize-voice] Polish failed for line ${lineItem.id}, using raw audio:`, polishErr?.message);
            finalRelativeUrl = rawRelativeUrl;
          }
        } else {
          // If polish is false, copy or link to cache file
          try {
            await fs.copyFile(rawDiskPath, cachedFilePath);
            finalRelativeUrl = cachedPublicUrl;
          } catch {
            finalRelativeUrl = rawRelativeUrl;
          }
        }

        const finalDiskPath = path.join(process.cwd(), "public", finalRelativeUrl.replace(/^\//, ""));
        const durationSec = getAudioDurationInSeconds(finalDiskPath);

        return {
          id: lineItem.id,
          text: lineItem.text,
          textForSpeech,
          url: finalRelativeUrl,
          rawUrl: rawRelativeUrl,
          durationSec,
          cached: false,
          polished: wasPolished,
          warnings: lineWarnings.length > 0 ? lineWarnings : undefined,
        };
      })
    );

    files.push(...chunkResults);
  }

  // Aggregate duration and warnings
  const totalDurationSec = files.reduce((sum, f) => sum + (f.durationSec || 0), 0);
  for (const f of files) {
    if (f.warnings) {
      globalWarnings.push(...f.warnings);
    }
  }

  if (fallbackNotice) {
    globalWarnings.push(
      toAppError({
        code: "FALLBACK_USED",
        severity: "warning",
        source: "tts",
        messageTh: fallbackNotice,
        hintTh: "ระบบสลับมาใช้เสียงฟรีอัตโนมัติ เนื่องจากโควตา Gemini API หมดหรือเครดิตไม่เพียงพอ",
      })
    );
  }

  // Primary output file (merged track if multiple lines, or single line)
  let primaryAudioUrl = files[0]?.url || null;
  let finalDurationSec = totalDurationSec;

  if (files.length > 1) {
    try {
      const ext = engine === "gemini" ? ".wav" : ".mp3";
      const mergedFilename = `merged_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const mergedFilePath = path.join(cacheDir, mergedFilename);
      const inputDiskPaths = files.map((f) =>
        path.join(process.cwd(), "public", f.url.replace(/^\//, ""))
      );
      await concatAudioFiles(inputDiskPaths, mergedFilePath);
      primaryAudioUrl = `/audio/cache/${mergedFilename}`;
      const measured = getAudioDurationInSeconds(mergedFilePath);
      if (measured > 0) finalDurationSec = measured;
    } catch (concatErr: any) {
      console.warn("[synthesize-voice] Concat audio files fallback to first file:", concatErr?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    success: true,
    files,
    // Backward compatible fields:
    audioUrl: primaryAudioUrl,
    duration: finalDurationSec,
    scriptText: lines.map((l) => l.text).join(" "),
    engineUsed: ttsEngine,
    fallbackNotice,
    warnings: globalWarnings.length > 0 ? globalWarnings : undefined,
  });
});
