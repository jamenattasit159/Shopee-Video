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

  // Sanitize text for CLI execution
  const sanitizedText = text
    .replace(/["\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Create temporary script text file to avoid Windows command line escaping issues
  const tempDir = path.join(process.cwd(), ".tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const tempTextFile = path.join(tempDir, `tts_${Date.now()}.txt`);
  await fs.writeFile(tempTextFile, sanitizedText, "utf-8");

  try {
    const cmd = `python -m edge_tts --voice "${voiceName}" --file "${tempTextFile}" --write-media "${outputPath}"`;
    await execAsync(cmd);
    await fs.unlink(tempTextFile).catch(() => {});
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Failed to generate voiceover via edge-tts:", error);
    await fs.unlink(tempTextFile).catch(() => {});
    return null;
  }
}
