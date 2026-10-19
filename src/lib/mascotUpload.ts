import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MascotAnimation } from "../../remotion/lib/mascotAnimation";
import { analyseMascotPoses } from "./mascotPoses";

export const MAX_MASCOT_BYTES = 10 * 1024 * 1024;
export async function storeMascot(buffer: Buffer, directory: string, baseUrl: string): Promise<{ mascotUrl: string; mascotAnimation?: MascotAnimation }> {
  if (!buffer.length || buffer.length > MAX_MASCOT_BYTES) throw new Error("ไฟล์มาสคอตต้องมีขนาดไม่เกิน 10 MB");
  const metadata = await sharp(buffer, { animated: true, limitInputPixels: 64000000 }).metadata();
  if (!["png", "jpeg", "webp", "gif"].includes(metadata.format || "")) throw new Error("รองรับ PNG, JPG, WebP และ GIF เท่านั้น");
  const count = metadata.pages || 1;
  if (count > 120) throw new Error("GIF ต้องมีไม่เกิน 120 เฟรม กรุณาลดจำนวนเฟรมก่อนอัปโหลด");
  await fs.mkdir(directory, { recursive: true });
  const id = randomUUID();
  const written: string[] = [];
  try {
    const frames = [];
    const images: Buffer[] = [];
    for (let page = 0; page < count; page++) {
      const name = `mascot_${id}_${page}.png`;
      const file = path.join(directory, name);
      written.push(file);
      const image = await sharp(buffer, { page, pages: 1, limitInputPixels: 64000000 }).rotate()
        .resize(768, 768, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
      await fs.writeFile(file, image);
      images.push(image);
      frames.push({ url: `${baseUrl}/${name}`, durationMs: Math.max(10, metadata.delay?.[page] || 100) });
    }
    if (count === 1) return { mascotUrl: frames[0].url };
    return { mascotUrl: frames[0].url, mascotAnimation: { frames, poses: await analyseMascotPoses(frames, images) } };
  } catch (error) {
    await Promise.all(written.map((file) => fs.unlink(file).catch(() => {})));
    throw error;
  }
}

/** Re-runs pose analysis for a mascot uploaded before poses existed, reading its stored frames. */
export async function reanalyseMascot(animation: MascotAnimation, directory: string): Promise<MascotAnimation> {
  const images = await Promise.all(animation.frames.map((frame) => fs.readFile(path.join(directory, path.basename(frame.url)))));
  return { frames: animation.frames, poses: await analyseMascotPoses(animation.frames, images) };
}
