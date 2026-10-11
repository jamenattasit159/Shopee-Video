import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import { convertTo24kHzWav, ensureFfmpegInPath } from "@/lib/ffmpeg";
import { withErrorHandling } from "@/lib/serverError";
import { parseGoogleVoiceError } from "@/lib/googleVoiceError";

// Ensure FFmpeg directory is in PATH for any sub-processes
ensureFfmpegInPath();

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_gemini_api_key")) {
    const err: any = new Error("ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน .env.local");
    err.code = "GEMINI_NO_KEY";
    err.status = 400;
    throw err;
  }
  return apiKey;
}

/**
 * GET /api/replicated-voices
 * Lists all replicated voices stored in the user's project
 */
export const GET = withErrorHandling(async () => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.voices.list({ type: ["replicated"] });
  const voices = (response.voices || []).map((v: any) => ({
    id: v.id,
    displayName: v.display_name || v.displayName || "เสียงของฉัน",
    type: v.type,
    languageCode: v.language_code || v.languageCode || "th-TH",
    createTime: v.create_time || v.createTime || null,
  }));

  return NextResponse.json({
    ok: true,
    success: true,
    voices,
  });
});

/**
 * POST /api/replicated-voices
 * Creates a new replicated voice model using Gemini 3.8 Flash TTS
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const tempFiles: string[] = [];
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const formData = await req.formData();
    const displayName = (formData.get("displayName") as string) || "เสียงของฉัน";
    const sourceAudioFile = formData.get("sourceAudio") as File | null;
    const consentAudioFile = formData.get("consentAudio") as File | null;

    if (!sourceAudioFile || !consentAudioFile) {
      const err: any = new Error("จำเป็นต้องมีทั้งไฟล์เสียงตัวอย่าง (sourceAudio) และไฟล์เสียงยินยอม (consentAudio)");
      err.code = "UPLOAD_INVALID";
      err.status = 400;
      throw err;
    }

    const tempDir = path.join(process.cwd(), ".tmp");
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const rawSourcePath = path.join(tempDir, `raw_src_${timestamp}.tmp`);
    const rawConsentPath = path.join(tempDir, `raw_con_${timestamp}.tmp`);
    const convertedSourcePath = path.join(tempDir, `src_24k_${timestamp}.wav`);
    const convertedConsentPath = path.join(tempDir, `con_24k_${timestamp}.wav`);

    tempFiles.push(rawSourcePath, rawConsentPath, convertedSourcePath, convertedConsentPath);

    // Save uploaded buffers
    const sourceBuffer = Buffer.from(await sourceAudioFile.arrayBuffer());
    const consentBuffer = Buffer.from(await consentAudioFile.arrayBuffer());

    await fs.writeFile(rawSourcePath, sourceBuffer);
    await fs.writeFile(rawConsentPath, consentBuffer);

    // Convert both files to 24kHz Mono 16-bit WAV via FFmpeg
    await convertTo24kHzWav(rawSourcePath, convertedSourcePath);
    await convertTo24kHzWav(rawConsentPath, convertedConsentPath);

    // Read converted wav files as base64
    const sourceB64 = (await fs.readFile(convertedSourcePath)).toString("base64");
    const consentB64 = (await fs.readFile(convertedConsentPath)).toString("base64");

    // Call Google GenAI Voices API
    try {
      const replicatedVoice = await ai.voices.create({
        store: true,
        voice: {
          model: "gemini-3.8-flash-tts",
          type: "replicated",
          display_name: displayName.trim(),
          replicated: {
            source_audio: {
              mime_type: "audio/wav",
              data: sourceB64,
            },
            consent_audio: {
              mime_type: "audio/wav",
              data: consentB64,
            },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        success: true,
        voice: {
          id: replicatedVoice.id,
          displayName: replicatedVoice.display_name || displayName,
          type: replicatedVoice.type || "replicated",
        },
      });
    } catch (googleApiErr: any) {
      const raw = String(googleApiErr?.message || googleApiErr || "");
      if (
        raw.includes("Consent flow failed") ||
        raw.includes("FINISH_REASON_INPUT_VR_TAKEDOWN") ||
        raw.includes("didn't match the text on screen")
      ) {
        const consentErr: any = new Error(parseGoogleVoiceError(googleApiErr));
        consentErr.code = "VOICE_CONSENT_MISMATCH";
        consentErr.status = 400;
        throw consentErr;
      }
      throw googleApiErr;
    }
  } finally {
    // Cleanup temporary files
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
});

/**
 * DELETE /api/replicated-voices
 * Deletes a stored replicated voice from Google AI Studio project
 */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const { searchParams } = new URL(req.url);
  const voiceId = searchParams.get("id");

  if (!voiceId) {
    const err: any = new Error("จำเป็นต้องระบุ voiceId");
    err.code = "VOICE_NOT_FOUND";
    err.status = 400;
    throw err;
  }

  await ai.voices.delete(voiceId);

  return NextResponse.json({
    ok: true,
    success: true,
    deletedId: voiceId,
  });
});
