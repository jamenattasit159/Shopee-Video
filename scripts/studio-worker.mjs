import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

const id = process.argv[2];
if (!/^[a-f0-9-]{36}$/.test(id || "")) process.exit(1);
const dir = path.resolve(".tmp/studio-jobs");
const jobFile = path.join(dir, `${id}.json`);
const state = JSON.parse(await fs.readFile(jobFile, "utf8"));
async function update(patch) { Object.assign(state, patch); const temp = `${jobFile}.tmp`; await fs.writeFile(temp, JSON.stringify(state)); await fs.rename(temp, jobFile); }
const timeout = setTimeout(async () => { await update({ status: "error", error: "ประมวลผลเกิน 15 นาที กรุณาแบ่งคลิปให้สั้นลงแล้วลองใหม่" }); process.exit(1); }, 15 * 60 * 1000);
try {
  const { kind, payload } = JSON.parse(await fs.readFile(path.join(dir, `${id}.input.json`), "utf8"));
  if (kind === "transcribe") {
    const defaultPython = path.resolve(process.platform === "win32" ? ".tmp/transcription-env/Scripts/python.exe" : ".tmp/transcription-env/bin/python");
    const python = process.env.TRANSCRIPTION_PYTHON || defaultPython;
    const source = path.join(process.cwd(), "public", payload.asset.url);
    const output = path.join(dir, `${id}.captions.json`);
    await update({ progress: 5, message: "กำลังถอดเสียงไทยในเครื่อง ครั้งแรกอาจต้องดาวน์โหลดโมเดล" });
    try {
      await promisify(execFile)(python, [path.resolve("scripts/transcribe-studio.py"), source, output], { timeout: 14 * 60 * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    } catch (error) {
      throw new Error(error.code === "ENOENT" || error.stderr?.includes("ModuleNotFoundError") ? "ยังไม่ได้ติดตั้งระบบถอดเสียง ดูวิธีติดตั้งใน STUDIO.md หรือนำเข้าไฟล์ SRT แทน" : "ถอดเสียงไม่ได้ ตรวจอินเทอร์เน็ตสำหรับดาวน์โหลดโมเดลครั้งแรก แล้วลองใหม่ หรือนำเข้า SRT");
    }
    const captions = JSON.parse(await fs.readFile(output, "utf8"))
      .filter(c => c.start < payload.asset.duration && c.text.trim())
      .map(c => ({ ...c, start: Math.max(0, c.start), end: Math.min(payload.asset.duration, c.end) }))
      .filter(c => c.end > c.start);
    await update({ status: "complete", progress: 100, captions, assetId: payload.asset.id });
  } else {
    const renderDir = path.resolve("public/renders");
    await fs.mkdir(renderDir, { recursive: true });
    await update({ progress: 5, message: "กำลังเตรียมคลิปและฟอนต์" });
    const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
    const inputProps = payload.timeline ? { timeline: payload.timeline } : { project: payload.project };
    const compositions = await getCompositions(serveUrl, { inputProps });
    const composition = compositions.find(c => c.id === (payload.compositionId || "CreatorVideo"));
    if (!composition) throw new Error("ไม่พบเทมเพลตวิดีโอ กรุณาเปิดเซิร์ฟเวอร์ใหม่");
    let last = 10;
    let pending = Promise.resolve();
    await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf: 18, pixelFormat: "yuv420p", outputLocation: path.join(renderDir, `studio_${id}.mp4`), concurrency: 2,
      onProgress: ({ progress }) => {
        const value = Math.min(99, 10 + Math.floor(progress * 89));
        if (value > last) { last = value; pending = pending.then(() => update({ progress: value, message: "กำลังสร้างวิดีโอ" })); }
      },
    });
    await pending;
    await fs.writeFile(path.join(renderDir, `studio_${id}.srt`), payload.srt, "utf8");
    await update({ status: "complete", progress: 100, videoUrl: `/renders/studio_${id}.mp4`, srtUrl: `/renders/studio_${id}.srt`, name: payload.project.name });
  }
} catch (error) {
  await update({ status: "error", error: error.message?.includes("ถอดเสียง") || error.message?.includes("SRT") ? error.message : "สร้างวิดีโอไม่สำเร็จ ตรวจว่าไฟล์ต้นฉบับยังอยู่และเล่นได้ แล้วลองส่งออกใหม่" });
} finally { clearTimeout(timeout); }
