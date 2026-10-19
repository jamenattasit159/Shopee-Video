import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileTypeFromBuffer } from "file-type";
import ffprobe from "ffprobe-static";
import ffmpeg from "ffmpeg-static";
import { addAsset, getAsset, getProject, storageDir, StudioError } from "./db";
import type { Asset } from "./schema";

const exec = promisify(execFile);
const accepted = new Set(["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/flac"]);
export const MAX_FILE = 200 * 1024 * 1024;
export async function ingest(projectId: string, name: string, bytes: Buffer, role = "demo"): Promise<Asset> {
  getProject(projectId);
  if (!bytes.length || bytes.length > MAX_FILE) throw new StudioError("ไฟล์ต้องมีข้อมูลและขนาดไม่เกิน 200 MB");
  const type = await fileTypeFromBuffer(bytes);
  if (!type || !accepted.has(type.mime)) throw new StudioError("รองรับ MP4, MOV, WebM, JPG, PNG, WebP และไฟล์เสียง MP3/WAV/M4A/OGG/FLAC เท่านั้น");
  const id = randomUUID();
  const filename = `${id}.${type.ext}`;
  const filePath = path.join(/* turbopackIgnore: true */ storageDir, filename);
  await fs.writeFile(filePath, bytes, { flag: "wx" });
  let metadata: {format?: {duration?: string}; streams?: Array<{codec_type: string; width?: number; height?: number}>};
  try {
    const result = await exec(process.env.FFPROBE_PATH || ffprobe.path, ["-v", "error", "-show_format", "-show_streams", "-of", "json", filePath], { timeout: 20000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    metadata = JSON.parse(result.stdout);
  } catch {
    await fs.unlink(filePath);
    throw new StudioError("อ่านไฟล์สื่อไม่ได้ ไฟล์อาจเสียหรือ codec ไม่รองรับ กรุณาส่งออกเป็น MP4 H.264 / JPG / MP3 แล้วลองใหม่");
  }
  const video = metadata.streams?.find(s => s.codec_type === "video");
  const kind: Asset["kind"] = type.mime.startsWith("image/") ? "image" : video ? "video" : "audio";
  let thumbnail: string | null = null;
  if (kind !== "audio" && (process.env.FFMPEG_PATH || ffmpeg)) {
    try {
      thumbnail = `${id}.thumb.jpg`;
      await exec(process.env.FFMPEG_PATH || ffmpeg!, ["-y", "-i", filePath, "-frames:v", "1", "-vf", "scale=360:-2", path.join(/* turbopackIgnore: true */ storageDir, thumbnail)], { timeout: 20000, windowsHide: true });
    } catch { thumbnail = null; }
  }
  const duration = Number(metadata.format?.duration);
  const asset: Asset = { id, projectId, name: name.replace(/[\x00-\x1f]/g, "").slice(0, 240), kind, mime: type.mime, size: bytes.length, duration: Number.isFinite(duration) && duration > 0 ? duration : null, width: video?.width || null, height: video?.height || null, role, filename, thumbnail, createdAt: new Date().toISOString() };
  try { addAsset(asset); } catch (error) { await fs.unlink(filePath).catch(() => {}); throw error; }
  return asset;
}
export function assetPath(asset: Asset) { return path.join(storageDir, path.basename(asset.filename)); }
export async function mediaResponse(id: string, range: string | null, thumb: boolean) {
  const asset = getAsset(id);
  const filename = thumb ? asset.thumbnail : asset.filename;
  if (!filename) throw new StudioError("ยังไม่มีภาพตัวอย่าง", 404);
  const fullPath = path.join(storageDir, path.basename(filename));
  const stat = await fs.stat(fullPath).catch(() => { throw new StudioError("ไฟล์ต้นฉบับไม่อยู่บนดิสก์แล้ว", 404); });
  const headers = new Headers({ "Content-Type": thumb ? "image/jpeg" : asset.mime, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
  let start = 0, end = stat.size - 1, status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), end); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`); status = 206;
  }
  headers.set("Content-Length", String(end - start + 1));
  const stream = Readable.toWeb(createReadStream(fullPath, { start, end }));
  return new Response(stream as ReadableStream, { status, headers });
}
