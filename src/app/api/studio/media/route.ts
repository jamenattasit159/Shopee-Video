import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";
const execute = promisify(execFile);
const MAX_BYTES = 200 * 1024 * 1024;
export async function POST(req: NextRequest) {
  let filePath: string | undefined;
  try {
    if (Number(req.headers.get("content-length")) > MAX_BYTES + 1024 * 1024) return NextResponse.json({ error: "ไฟล์ต้องไม่เกิน 200 MB" }, { status: 413 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) return NextResponse.json({ error: "เลือกไฟล์วิดีโอขนาดไม่เกิน 200 MB" }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase();
    if (![".mp4", ".mov", ".webm"].includes(ext)) return NextResponse.json({ error: "รองรับเฉพาะ MP4, MOV และ WebM" }, { status: 400 });
    const id = randomUUID();
    const filename = `studio_${id}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    filePath = path.join(dir, filename);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    const { stdout } = await execute(process.env.STUDIO_FFPROBE || "ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", filePath], { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    const info = JSON.parse(stdout);
    const stream = info.streams.find((s: any) => s.codec_type === "video" && !s.disposition?.attached_pic);
    const duration = Number(info.format.duration || stream?.duration);
    if (!stream || !Number.isFinite(duration) || duration <= 0 || duration > 600 || !stream.width || !stream.height || stream.width > 7680 || stream.height > 7680) throw new Error("INVALID_MEDIA");
    return NextResponse.json({ asset: { id, name: file.name, url: `/uploads/${filename}`, duration, width: stream.width, height: stream.height, hasAudio: info.streams.some((s: any) => s.codec_type === "audio"), captions: [] } });
  } catch (err: any) {
    if (filePath) await fs.unlink(filePath).catch(() => {});
    const error = err.code === "ENOENT" ? "ยังไม่พบตัวตรวจสอบวิดีโอ กรุณาติดตั้ง FFmpeg และเปิดเซิร์ฟเวอร์ใหม่" : "อ่านไฟล์ไม่ได้ กรุณาเลือกวิดีโอ MP4/MOV/WebM ที่เล่นได้และยาวไม่เกิน 10 นาที";
    return NextResponse.json({ error }, { status: 400 });
  }
}
