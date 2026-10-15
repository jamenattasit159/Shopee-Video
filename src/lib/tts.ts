import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";
import { GoogleGenAI } from "@google/genai";
import { StoryboardPlan } from "../../remotion/types";
import { normalizeForSpeech } from "./speechText";
import { getAudioDurationInSeconds } from "./ffmpeg";

const execFileAsync = util.promisify(execFile);

export type VoiceOption = "female" | "male" | "none";
export type TTSEngine = "free" | "gemini";

export interface VoiceoverRequestParams {
  text: string;
  engine?: TTSEngine;
  voiceType?: VoiceOption;
  rate?: string;
  geminiVoice?: string;
  geminiStyle?: string;
}

export interface VoiceoverResult {
  audioUrl: string | null;
  duration?: number;
  engineUsed: TTSEngine;
  fallbackNotice?: string;
}

export { getAudioDurationInSeconds };

const VOICE_MAP: Record<string, string> = {
  female: "th-TH-PremwadeeNeural",
  male: "th-TH-NiwatNeural",
};

/**
 * Builds a natural Thai spoken narration script from the storyboard.
 */
export function buildNarrationScript(
  productName: string,
  price: string,
  storyboard: StoryboardPlan
): string {
  if (storyboard.narrationScript && storyboard.narrationScript.trim()) {
    return storyboard.narrationScript.trim();
  }

  const hook = storyboard.hook?.headline || `${productName} ไอเทมเด็ดที่ต้องมี!`;

  const featureTexts = (storyboard.scenes || [])
    .map((s, idx) => {
      let desc = s.highlightDesc || "";
      if (price && price.trim()) {
        desc = desc.replace(new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").trim();
      }

      if (idx === 0) return `${s.highlightTitle} ${desc}`.trim();
      if (idx === 1) return `แถมยัง${s.highlightTitle} ${desc}`.trim();
      return `ที่สำคัญคือ${s.highlightTitle}`.trim();
    })
    .filter(Boolean);

  const featuresBlock = featureTexts.join(" ");
  const ctaOffer = `ตอนนี้จัดโปรพิเศษเพียง ${price} เท่านั้น ${
    storyboard.cta?.basketNote || "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง รีบกดก่อนของหมดน้า!"
  }`.trim();

  return `ทุกคน เจอของเด็ดอีกแล้ว! ${hook} ตัวนี้คือดีงามมาก ${featuresBlock} ${ctaOffer}`;
}

export function sanitizeForEdgeTTS(text: string): string {
  // First normalize through our Thai pronunciation & number engine
  const normalized = normalizeForSpeech(text).textForSpeech;

  return normalized
    .replace(/ช้อปปี้|ช็อปปี้|shopee/gi, "ชอปปี้")
    .replace(/ช้อป/g, "ชอป")
    .replace(/ตะกร้าส้ม/g, "ตระกร้าส้ม")
    .replace(/บอกเลยว่า/g, "บอกเลย")
    .replace(/เปอร์เซ็นต์/g, "เปอร์เซ็น")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, " ")
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u200B-\u2060]/g, " ")
    .replace(/[!！?？~@#$^&*()_+={}\[\]:;"'<>,/|\\•–—…“”‘’™®©]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits long Thai text into chunks <= maxLen characters at spaces/clause boundaries
 * for reliable HTTP TTS synthesis without timeouts.
 */
function splitThaiTextChunks(text: string, maxLen: number = 150): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxLen) {
      current += " " + w;
    } else {
      chunks.push(current);
      current = w;
    }
  }
  if (current) chunks.push(current);

  // If any single chunk is still > maxLen (no spaces), slice safely
  const finalChunks: string[] = [];
  for (const c of chunks) {
    if (c.length <= maxLen) {
      finalChunks.push(c);
    } else {
      for (let i = 0; i < c.length; i += maxLen) {
        finalChunks.push(c.slice(i, i + maxLen));
      }
    }
  }
  return finalChunks.filter(Boolean);
}

/**
 * Tier 2 Native Node.js Fallback: Google Translate Thai TTS HTTP stream.
 * Requires zero Python packages and zero API keys, and never hangs on Edge WebSocket blocks.
 */
async function synthesizeViaGoogleTranslateHttp(
  cleanText: string,
  outputPath: string
): Promise<boolean> {
  try {
    const chunks = splitThaiTextChunks(cleanText, 150);
    if (chunks.length === 0) return false;

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        if (!res.ok) return false;
        const arrBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length < 100) return false;
        buffers.push(buf);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (buffers.length === 0) return false;
    await fs.writeFile(outputPath, Buffer.concat(buffers));
    const stat = await fs.stat(outputPath);
    return stat.size > 100;
  } catch (err: any) {
    console.warn("[TTS] Google Translate HTTP fallback warning:", err?.message || err);
    return false;
  }
}

/**
 * Synthesizes Thai voiceover MP3 using Multi-Tier Resilient Engine:
 * Tier 1: Microsoft Edge Neural TTS (Premwadee / Niwat) via Python edge_tts (with execFile & 18s timeout)
 * Tier 2: Native Node.js Google Translate Thai TTS HTTP stream (zero Python dependencies)
 */
export async function generateThaiVoiceover(
  text: string,
  voiceType: VoiceOption = "female",
  filenamePrefix: string = "voice",
  rate: string = "+0%"
): Promise<string | null> {
  if (voiceType === "none" || !text.trim()) {
    return null;
  }

  const primaryVoice = VOICE_MAP[voiceType] || VOICE_MAP.female;
  const fallbackVoice = VOICE_MAP.male;
  const audioDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(audioDir, { recursive: true });

  const filename = `${filenamePrefix}_${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, filename);

  const cleanText = sanitizeForEdgeTTS(text);
  if (!cleanText) {
    return null;
  }

  const tempDir = path.join(process.cwd(), ".tmp");
  await fs.mkdir(tempDir, { recursive: true });

  const cleanRate = rate && rate.trim() ? rate.trim() : "+0%";

  const runEdgeTts = async (content: string, voice: string): Promise<boolean> => {
    const tempTextFile = path.join(
      tempDir,
      `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    );
    await fs.writeFile(tempTextFile, content, "utf-8");
    const pythonCandidates = [
      process.env.TRANSCRIPTION_PYTHON,
      "python",
      "python3",
    ].filter(Boolean) as string[];

    try {
      for (const pyBin of pythonCandidates) {
        try {
          await execFileAsync(
            pyBin,
            [
              "-X",
              "utf8",
              "-m",
              "edge_tts",
              "--voice",
              voice,
              "--file",
              tempTextFile,
              `--rate=${cleanRate}`,
              "--write-media",
              outputPath,
            ],
            {
              timeout: 18000,
              windowsHide: true,
              env: {
                ...process.env,
                PYTHONIOENCODING: "utf-8",
                PYTHONUTF8: "1",
              },
            }
          );
          const stat = await fs.stat(outputPath);
          if (stat.size > 100) {
            return true;
          }
        } catch {
          // Try next python binary
        }
      }
      return false;
    } finally {
      await fs.unlink(tempTextFile).catch(() => {});
    }
  };

  // Attempt 1: Primary Edge Neural Voice (Premwadee / Niwat)
  try {
    const ok = await runEdgeTts(cleanText, primaryVoice);
    if (ok) return `/uploads/${filename}`;
  } catch (err1: any) {
    console.warn(`[TTS] Attempt 1 failed with ${primaryVoice}:`, err1?.message?.split("\n")[0] || err1);
  }

  // Attempt 2: Cross-voice fallback to NiwatNeural
  try {
    const ok = await runEdgeTts(cleanText, fallbackVoice);
    if (ok) return `/uploads/${filename}`;
  } catch (err2: any) {
    console.warn(`[TTS] Attempt 2 failed with ${fallbackVoice}:`, err2?.message?.split("\n")[0] || err2);
  }

  // Attempt 3: Native Node.js Google Translate Thai TTS HTTP stream (works even without Python edge-tts!)
  const httpOk = await synthesizeViaGoogleTranslateHttp(cleanText, outputPath);
  if (httpOk) {
    console.info("[TTS] Synthesized Thai voiceover via native HTTP fallback successfully.");
    return `/uploads/${filename}`;
  }

  return null;
}

/**
 * Synthesizes high-quality speech using Google Gemini 3.8 Flash TTS.
 */
export async function synthesizeGeminiVoiceover(
  text: string,
  voiceName: string = "Puck",
  style?: string,
  targetOutputPath?: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_gemini_api_key")) {
    const err: any = new Error("GEMINI_API_KEY is not configured");
    err.code = "GEMINI_NO_KEY";
    err.status = 400;
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey });
  const normalizedText = normalizeForSpeech(text.trim()).textForSpeech || text.trim();
  const textPart: any = { text: normalizedText };
  if (style && style.trim()) {
    textPart.speechMetadata = { style: style.trim() };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash-tts",
    contents: [
      {
        role: "user",
        parts: [textPart],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          voice: voiceName,
        },
      },
    },
  });

  const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Data) {
    const err: any = new Error("No output_audio received from Gemini TTS");
    err.code = "TTS_TIMEOUT";
    err.status = 500;
    throw err;
  }

  const outputPath =
    targetOutputPath ||
    path.join(process.cwd(), "public", "uploads", `gemini_${Date.now()}.wav`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const audioBuffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(outputPath, audioBuffer);

  const relative = "/" + path.relative(path.join(process.cwd(), "public"), outputPath).replace(/\\/g, "/");
  return relative;
}

/**
 * Smart voiceover router
 */
export async function generateSmartVoiceover(
  params: VoiceoverRequestParams
): Promise<VoiceoverResult> {
  const defaultRate = params.rate && params.rate.trim() ? params.rate : "+15%";
  const engine = params.engine || "free";

  if (engine === "gemini") {
    try {
      const audioUrl = await synthesizeGeminiVoiceover(
        params.text,
        params.geminiVoice || "Puck",
        params.geminiStyle || "cheerful and friendly"
      );
      if (audioUrl) {
        const duration = getAudioDurationInSeconds(
          path.join(process.cwd(), "public", audioUrl.replace(/^\//, ""))
        );
        return { audioUrl, duration, engineUsed: "gemini" };
      }
    } catch (err: any) {
      console.warn(
        `[TTS] Gemini 3.8 Flash TTS unavailable (${err?.message?.split("\n")[0] || err}). Automatically falling back to Free TTS...`
      );
      const fallbackUrl = await generateThaiVoiceover(
        params.text,
        params.voiceType || "female",
        "voice_fallback",
        defaultRate
      );
      const duration = fallbackUrl
        ? getAudioDurationInSeconds(
            path.join(process.cwd(), "public", fallbackUrl.replace(/^\//, ""))
          )
        : 0;
      return {
        audioUrl: fallbackUrl,
        duration,
        engineUsed: "free",
        fallbackNotice: "สลับมาใช้เสียงฟรีอัตโนมัติ เนื่องจากโควตา Gemini API หมดหรือเครดิตไม่เพียงพอ",
      };
    }
  }

  const audioUrl = await generateThaiVoiceover(
    params.text,
    params.voiceType || "female",
    "voice_free",
    defaultRate
  );
  const duration = audioUrl
    ? getAudioDurationInSeconds(
        path.join(process.cwd(), "public", audioUrl.replace(/^\//, ""))
      )
    : 0;
  return {
    audioUrl,
    duration,
    engineUsed: "free",
  };
}
