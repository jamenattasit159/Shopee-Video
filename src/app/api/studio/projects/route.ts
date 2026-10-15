import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ProjectSchema } from "@/lib/studio";
import { readProject, studioDir, verifyMedia } from "@/lib/studioServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) return NextResponse.json({ project: await readProject(id) });
    await fs.mkdir(studioDir, { recursive: true });
    const entries = await Promise.all((await fs.readdir(studioDir)).filter(f => f.endsWith(".json")).map(async f => {
      const p = ProjectSchema.parse(JSON.parse(await fs.readFile(path.join(studioDir, f), "utf8")));
      return { id: p.id, name: p.name, updatedAt: (await fs.stat(path.join(studioDir, f))).mtime.toISOString() };
    }));
    return NextResponse.json({ projects: entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
  } catch { return NextResponse.json({ error: "เปิดโปรเจกต์ไม่ได้ กรุณาลองใหม่" }, { status: 400 }); }
}
export async function POST(req: NextRequest) {
  try {
    const p = ProjectSchema.parse(await req.json());
    await verifyMedia(p);
    await fs.mkdir(studioDir, { recursive: true });
    const target = path.join(studioDir, `${p.id}.json`);
    const temp = `${target}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(p, null, 2));
    await fs.rename(temp, target);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "บันทึกไม่ได้ ตรวจช่วงตัดคลิปและไฟล์สื่อ แล้วลองใหม่" }, { status: 400 }); }
}
