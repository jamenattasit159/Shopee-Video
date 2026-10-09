import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";

const execAsync = util.promisify(exec);

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_gemini_api_key")) {
    throw new Error("GEMINI_API_KEY is not configured in .env.local");
  }
  return apiKey;
}

/**
 * Converts any input audio file into 24kHz Mono 16-bit PCM WAV (Google Gemini standard)
 */
async function convertTo24kHzWav(inputPath: string, outputPath: string): Promise<void> {
  // -ar 24000: 24kHz sample rate
  // -ac 1: mono channel
  // -c:a pcm_s16le: 16-bit signed PCM
  const cmd = `ffmpeg -y -i "${inputPath}" -ar 24000 -ac 1 -c:a pcm_s16le "${outputPath}"`;
  await execAsync(cmd);
}

/**
 * GET /api/replicated-voices
 * Lists all replicated voices stored in the user's project
 */
export async function GET() {
  try {
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
      success: true,
      voices,
    });
  } catch (error: any) {
    console.error("List replicated voices error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list replicated voices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/replicated-voices
 * Creates a new replicated voice model using Gemini 3.8 Flash TTS
 */
export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const formData = await req.formData();
    const displayName = (formData.get("displayName") as string) || "เสียงของฉัน";
    const sourceAudioFile = formData.get("sourceAudio") as File | null;
    const consentAudioFile = formData.get("consentAudio") as File | null;

    if (!sourceAudioFile || !consentAudioFile) {
      return NextResponse.json(
        {
          success: false,
          error: "จำเป็นต้องมีทั้งไฟล์เสียงตัวอย่าง (sourceAudio) และไฟล์เสียงยินยอม (consentAudio)",
        },
        { status: 400 }
      );
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
      success: true,
      voice: {
        id: replicatedVoice.id,
        displayName: replicatedVoice.display_name || displayName,
        type: replicatedVoice.type || "replicated",
      },
    });
  } catch (error: any) {
    console.error("Create replicated voice error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create replicated voice",
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
}

/**
 * DELETE /api/replicated-voices
 * Deletes a stored replicated voice from Google AI Studio project
 */
export async function DELETE(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get("id");

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: "voiceId is required" },
        { status: 400 }
      );
    }

    await ai.voices.delete(voiceId);

    return NextResponse.json({
      success: true,
      deletedId: voiceId,
    });
  } catch (error: any) {
    console.error("Delete replicated voice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete replicated voice" },
      { status: 500 }
    );
  }
}
