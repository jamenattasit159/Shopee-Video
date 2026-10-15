import "server-only";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { ProjectSchema, StudioProject } from "./studio";

export const studioDir = path.join(process.cwd(), "data", "studio");
export const jobsDir = path.join(process.cwd(), ".tmp", "studio-jobs");
export function validId(id: string) { return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id); }
export async function verifyMedia(p: StudioProject) {
  for (const asset of p.assets) await fs.access(path.join(process.cwd(), "public", asset.url));
}
export async function startJob(kind: "render" | "transcribe" | "workspace-narration", payload: unknown) {
  await fs.mkdir(jobsDir, { recursive: true });
  const lockPath = path.join(jobsDir, "queue.lock");
  const lock = await fs.open(lockPath, "wx").catch(() => { throw new Error("มีงานกำลังเริ่มประมวลผล กรุณาลองใหม่สักครู่"); });
  try {
  const files = await fs.readdir(jobsDir);
  for (const file of files.filter(f => f.endsWith(".json") && !f.endsWith(".input.json"))) {
    const job = JSON.parse(await fs.readFile(path.join(jobsDir, file), "utf8"));
    if (job.status === "processing" && Date.now() - job.startedAt < 15 * 60 * 1000) {
      throw new Error("มีงานกำลังประมวลผลอยู่ กรุณารอให้งานเดิมเสร็จก่อน");
    }
  }
  const id = randomUUID();
  await fs.writeFile(path.join(jobsDir, `${id}.input.json`), JSON.stringify({ kind, payload }));
  await fs.writeFile(path.join(jobsDir, `${id}.json`), JSON.stringify({ id, kind, status: "processing", progress: 0, startedAt: Date.now() }));
  // The worker persists its result so polling survives a page reload or server restart.
  const args = kind === "workspace-narration" ? ["--import", "tsx", path.join(process.cwd(), "scripts", "workspace-worker.ts"), id] : [path.join(process.cwd(), "scripts", "studio-worker.mjs"), id];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true, env: process.env,
  });
  child.on("error", async () => {
    await fs.writeFile(path.join(jobsDir, `${id}.json`), JSON.stringify({ id, status: "error", error: "ไม่สามารถเริ่มประมวลผลได้ กรุณาลองใหม่" }));
  });
  child.unref();
  return id;
  } finally { await lock.close(); await fs.unlink(lockPath).catch(() => {}); }
}
export async function readProject(id: string) {
  if (!validId(id)) throw new Error("รหัสโปรเจกต์ไม่ถูกต้อง");
  return ProjectSchema.parse(JSON.parse(await fs.readFile(path.join(studioDir, `${id}.json`), "utf8")));
}
