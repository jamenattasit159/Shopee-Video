import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { AssetSchema, ProjectSchema, studioSrt } from "@/lib/studio";
import { jobsDir, startJob, validId, verifyMedia } from "@/lib/studioServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!validId(id)) return NextResponse.json({ error: "รหัสงานไม่ถูกต้อง" }, { status: 400 });
  try {
    const job = JSON.parse(await fs.readFile(path.join(jobsDir, `${id}.json`), "utf8"));
    if (job.status === "processing" && Date.now() - job.startedAt > 15 * 60 * 1000) return NextResponse.json({ ...job, status: "error", error: "งานใช้เวลานานเกินกำหนด กรุณาลองใหม่" });
    return NextResponse.json(job);
  } catch { return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 }); }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.kind === "render") {
      const p = ProjectSchema.parse(body.project);
      if (!p.clips.length) return NextResponse.json({ error: "เพิ่มช็อตอย่างน้อย 1 ช็อตก่อนส่งออก" }, { status: 400 });
      await verifyMedia(p);
      return NextResponse.json({ id: await startJob("render", { project: p, srt: studioSrt(p) }) }, { status: 202 });
    }
    if (body.kind === "transcribe") {
      const asset = AssetSchema.parse(body.asset);
      if (!asset.hasAudio) return NextResponse.json({ error: "คลิปนี้ไม่มีแทร็กเสียง เพิ่มซับเองหรือนำเข้า SRT ได้" }, { status: 400 });
      await fs.access(path.join(process.cwd(), "public", asset.url));
      return NextResponse.json({ id: await startJob("transcribe", { asset }) }, { status: 202 });
    }
    return NextResponse.json({ error: "ประเภทงานไม่ถูกต้อง" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message?.startsWith("มีงาน") ? err.message : "ข้อมูลไม่ถูกต้อง ตรวจไฟล์สื่อและช่วงตัดคลิปอีกครั้ง" }, { status: 400 });
  }
}
