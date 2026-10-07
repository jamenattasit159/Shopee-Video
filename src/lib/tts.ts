import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";
import { StoryboardPlan } from "../../remotion/types";

const execAsync = util.promisify(exec);

export type VoiceOption = "female" | "male" | "none";

const VOICE_MAP: Record<string, string> = {
  female: "th-TH-PremwadeeNeural", // Female Thai energetic voice
  male: "th-TH-NiwatNeural",        // Male Thai friendly voice
};

/**
 * Builds a natural Thai spoken narration script from the storyboard.
 * Strictly avoids robotic enumerations and repetitive price loops.
 */
export function buildNarrationScript(
  productName: string,
  price: string,
  storyboard: StoryboardPlan
): string {
  // If storyboard already has a customized natural narration script, use it directly!
  if (storyboard.narrationScript && storyboard.narrationScript.trim()) {
    return storyboard.narrationScript.trim();
  }

  // Otherwise, construct a natural conversational Thai influencer flow
  const hook = storyboard.hook?.headline || `${productName} ไอเทมเด็ดที่ต้องมี!`;

  // Join features with natural human conversational connectors (NOT 'จุดเด่นที่ 1, 2')
  const featureTexts = (storyboard.scenes || []).map((s, idx) => {
    // Strip out any redundant price mentions that might have leaked into feature descriptions
    let desc = s.highlightDesc || "";
    if (price && price.trim()) {
      desc = desc.replace(new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").trim();
    }

    if (idx === 0) {
      return `${s.highlightTitle} ${desc}`.trim();
    }
    if (idx === 1) {
      return `แถมยัง${s.highlightTitle} ${desc}`.trim();
    }
    return `ที่สำคัญคือ${s.highlightTitle}`.trim();
  }).filter(Boolean);

  const featuresBlock = featureTexts.join(" ");

  // Climax offer: Mention price ONCE at the end
  const ctaOffer = `ตอนนี้จัดโปรพิเศษเพียง ${price} เท่านั้น ${
    storyboard.cta?.basketNote || "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง รีบกดก่อนของหมดน้า!"
  }`.trim();

  return `ทุกคนนน เจอของเด็ดอีกแล้ว! ${hook} ตัวนี้คือดีงามมาก ${featuresBlock} ${ctaOffer}`;
}

export function sanitizeForEdgeTTS(text: string): string {
  return text
    // Replace % with 'เปอร์เซ็น'
    .replace(/(\d+)\s*%/g, "$1 เปอร์เซ็น")
    .replace(/%/g, " เปอร์เซ็น")
    // Replace currency signs
    .replace(/฿\s*(\d+)/g, "$1 บาท")
    .replace(/฿/g, " บาท")
    // Replace loanword spellings that cause Azure Edge TTS NoAudioReceived
    .replace(/ช้อป/g, "สั่งซื้อ")
    .replace(/เปอร์เซ็นต์/g, "เปอร์เซ็น")
    // Strip emojis and surrogate pairs
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, " ")
    .replace(/[!！?？~@#$^&*()_+={}\[\]:;"'<>,/|\\]/g, " ")
    // Normalize repeated emphatic consonants like ทุกคนนน -> ทุกคน, ดีงามมากกก -> ดีงามมาก
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synthesizes Thai voiceover MP3 using edge-tts.
 */
export async function generateThaiVoiceover(
  text: string,
  voiceType: VoiceOption = "female",
  filenamePrefix: string = "voice"
): Promise<string | null> {
  if (voiceType === "none" || !text.trim()) {
    return null;
  }

  const voiceName = VOICE_MAP[voiceType] || VOICE_MAP.female;
  const audioDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(audioDir, { recursive: true });

  const filename = `${filenamePrefix}_${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, filename);

  const cleanText = sanitizeForEdgeTTS(text);
  const tempDir = path.join(process.cwd(), ".tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const tempTextFile = path.join(tempDir, `tts_${Date.now()}.txt`);
  await fs.writeFile(tempTextFile, cleanText, "utf-8");

  const runTts = async (filePath: string) => {
    const cmd = `python -X utf8 -m edge_tts --voice "${voiceName}" --file "${filePath}" --write-media "${outputPath}"`;
    await execAsync(cmd, {
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });
  };

  try {
    await runTts(tempTextFile);
    await fs.unlink(tempTextFile).catch(() => {});
    return `/uploads/${filename}`;
  } catch (firstErr) {
    console.warn("First TTS attempt failed, trying fallback sanitized text:", firstErr);
    try {
      // Fallback: If English words caused the issue, replace English letters with a generic Thai noun
      const fallbackClean = cleanText
        .replace(/[a-zA-Z]+/g, "ตัวนี้")
        .replace(/\s+/g, " ")
        .trim();
      await fs.writeFile(tempTextFile, fallbackClean, "utf-8");
      await runTts(tempTextFile);
      await fs.unlink(tempTextFile).catch(() => {});
      return `/uploads/${filename}`;
    } catch (secondErr) {
      console.error("Failed to generate voiceover via edge-tts fallback:", secondErr);
      await fs.unlink(tempTextFile).catch(() => {});
      return null;
    }
  }
}
