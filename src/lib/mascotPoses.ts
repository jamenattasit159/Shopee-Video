import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { isMascotPose, type MascotFrame, type MascotPose, type MascotPoseClip } from "../../remotion/lib/mascotAnimation";

/** Mean grey difference (0–255) above which a frame starts a new pose. */
const NEW_POSE_DIFF = 6;
const MAX_TAGGED = 16;

const signature = (image: Buffer) =>
  sharp(image).flatten({ background: "#ffffff" }).resize(32, 32, { fit: "fill" }).greyscale().raw().toBuffer();

function difference(a: Buffer, b: Buffer) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** Splits frames into runs that read as one pose, comparing each frame to the first frame of its run. */
async function groupFrames(frames: MascotFrame[], images: Buffer[]) {
  const groups: Array<{ first: number; frames: MascotFrame[] }> = [];
  let anchor: Buffer | null = null;
  for (let i = 0; i < frames.length; i++) {
    const sig = await signature(images[i]);
    if (!anchor || difference(anchor, sig) > NEW_POSE_DIFF) {
      groups.push({ first: i, frames: [] });
      anchor = sig;
    }
    groups[groups.length - 1].frames.push(frames[i]);
  }
  return groups;
}

const PROMPT = (count: number) => `You label the gestures of one cartoon mascot. For each numbered image pick exactly one label:
- present: open palm showing or presenting something
- surprised: shocked or amazed, hands on cheeks or mouth wide open
- megaphone: holding a megaphone or loudly announcing
- wave: waving hello or goodbye
- thumbs-up: giving a thumbs up
- point: pointing a finger at something
- think: hand on chin, pondering
- confident: arms crossed, confident
- ok: making an OK hand sign
- excited: jumping or both arms raised in joy
- whisper: hand beside mouth, telling a secret
- clap: clapping hands
- other: anything else
Return only JSON: {"poses": [label for image 1, label for image 2, ...]} with exactly ${count} items.`;

/** Labels each pose with Gemini vision; falls back to "other" when no key is set or the call fails. */
async function tagPoses(thumbs: Buffer[]): Promise<MascotPose[]> {
  const fallback = thumbs.map((): MascotPose => "other");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim() || apiKey.includes("your_gemini_api_key")) return fallback;
  const tagged = thumbs.slice(0, MAX_TAGGED);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = [{ text: PROMPT(tagged.length) }, ...tagged.flatMap((image, i) => [
      { text: `Image ${i + 1}:` },
      { inlineData: { mimeType: "image/png", data: image.toString("base64") } },
    ])];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    const parsed = JSON.parse((response.text || "").replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim());
    const labels: unknown[] = Array.isArray(parsed?.poses) ? parsed.poses : [];
    return thumbs.map((_, i) => (isMascotPose(labels[i]) ? labels[i] : "other"));
  } catch (error) {
    console.warn("[mascotPoses] Pose tagging failed, using untagged poses:", error);
    return fallback;
  }
}

/** Groups mascot frames into pose clips and labels each clip so scenes can pick a fitting gesture. */
export async function analyseMascotPoses(frames: MascotFrame[], images: Buffer[]): Promise<MascotPoseClip[]> {
  const groups = await groupFrames(frames, images);
  const thumbs = await Promise.all(groups.map(({ first }) =>
    sharp(images[first]).flatten({ background: "#ffffff" }).resize(256, 256, { fit: "inside" }).png().toBuffer()));
  const poses = await tagPoses(thumbs);
  return groups.map((group, i) => ({ pose: poses[i], frames: group.frames }));
}
