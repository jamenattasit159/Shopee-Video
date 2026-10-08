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
    // Replace price formats like 250.- or 250.- บาท
    .replace(/(\d+)\s*\.-/g, "$1 บาท")
    .replace(/\.-/g, " บาท")
    // Replace currency signs
    .replace(/฿\s*(\d+)/g, "$1 บาท")
    .replace(/฿/g, " บาท")
    // Fix Shopee: do NOT replace with 'สั่งซื้อปี้'! 'ชอปปี้' works reliably in Edge TTS
    .replace(/ช้อปปี้|ช็อปปี้|shopee/gi, "ชอปปี้")
    .replace(/ช้อป/g, "ชอป")
    // Fix Azure Edge TTS Premwadee crashes on specific Thai token boundaries
    .replace(/ตะกร้าส้ม/g, "ตระกร้าส้ม")
    .replace(/บอกเลยว่า/g, "บอกเลย")
    .replace(/เปอร์เซ็นต์/g, "เปอร์เซ็น")
    // Strip all emojis (astral planes + BMP emojis like ✨, ❄️, 🔥, 🏷️ and variation selectors)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, " ")
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u200B-\u2060]/g, " ")
    // Strip bullet points, quotes, dashes, special punctuation
    .replace(/[!！?？~@#$^&*()_+={}\[\]:;"'<>,/|\\•–—…“”‘’™®©]/g, " ")
    // Normalize newlines to spaces
    .replace(/[\r\n\t]+/g, " ")
    // Normalize repeated emphatic consonants/vowels like ทุกคนนน -> ทุกคน, ดีงามมากกก -> ดีงามมาก
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synthesizes Thai voiceover MP3 using edge-tts with resilient multi-tier fallback.
 */
export async function generateThaiVoiceover(
  text: string,
  voiceType: VoiceOption = "female",
  filenamePrefix: string = "voice"
): Promise<string | null> {
  if (voiceType === "none" || !text.trim()) {
    return null;
  }

  const primaryVoice = VOICE_MAP[voiceType] || VOICE_MAP.female;
  const fallbackVoice = VOICE_MAP.male; // NiwatNeural is resilient against Azure phoneme drops
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

  const runTts = async (content: string, voice: string) => {
    const tempTextFile = path.join(
      tempDir,
      `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    );
    await fs.writeFile(tempTextFile, content, "utf-8");
    try {
      const cmd = `python -X utf8 -m edge_tts --voice "${voice}" --file "${tempTextFile}" --write-media "${outputPath}"`;
      await execAsync(cmd, {
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
      });
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        return true;
      }
      return false;
    } finally {
      await fs.unlink(tempTextFile).catch(() => {});
    }
  };

  // Attempt 1: Try with primary voice and sanitized text
  try {
    const ok = await runTts(cleanText, primaryVoice);
    if (ok) return `/uploads/${filename}`;
  } catch (err1: any) {
    console.warn(`[TTS] Attempt 1 failed with ${primaryVoice}:`, err1?.message?.split("\n")[0] || err1);
  }

  // Attempt 2: If primary voice is Premwadee, try replacing English letters with generic noun
  if (primaryVoice === VOICE_MAP.female) {
    try {
      const fallbackClean = cleanText
        .replace(/[a-zA-Z]+/g, "ตัวนี้")
        .replace(/\s+/g, " ")
        .trim();
      const ok = await runTts(fallbackClean, primaryVoice);
      if (ok) return `/uploads/${filename}`;
    } catch (err2: any) {
      console.warn(`[TTS] Attempt 2 failed with ${primaryVoice} (Latin fallback):`, err2?.message?.split("\n")[0] || err2);
    }
  }

  // Attempt 3: Cross-voice fallback to NiwatNeural (rock-solid against Azure phoneme quirks)
  try {
    const ok = await runTts(cleanText, fallbackVoice);
    if (ok) return `/uploads/${filename}`;
  } catch (err3: any) {
    console.error(`[TTS] Attempt 3 failed with ${fallbackVoice}:`, err3?.message?.split("\n")[0] || err3);
  }

  return null;
}
