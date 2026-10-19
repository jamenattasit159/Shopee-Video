import { z } from "zod";
import { route } from "@/lib/http";
import { activity, getActivity, getProject, listJobs, StudioError, updateProject } from "@/lib/db";
import { projectPatch } from "@/lib/schema";
export const runtime = "nodejs";
export const GET = route((_req,{id}) => ({project:getProject(id),jobs:listJobs(id).map(({snapshot: _snapshot,...j})=>j),activity:getActivity(id)}));
export const PATCH = route(async (req,{id}) => {
  const body = z.object({revision:z.number().int().positive(),patch:projectPatch.extend({archived:z.boolean().optional(),status:z.enum(["draft","done"]).optional()})}).parse(await req.json());
  const before = getProject(id);
  for (const scene of body.patch.scenes || []) {
    if (scene.assetId && !before.assets.some(a=>a.id === scene.assetId && a.kind !== "audio")) throw new StudioError("มีซีนที่เลือกไฟล์จากโปรเจกต์อื่นหรือไฟล์ที่ถูกลบ");
  }
  if (body.patch.voiceAssetId && !before.assets.some(a=>a.id === body.patch.voiceAssetId && a.kind === "audio")) throw new StudioError("ไฟล์เสียงไม่อยู่ในโปรเจกต์นี้");
  if (body.patch.status === "done" && !before.capcutUrl) throw new StudioError("ต้องมี CapCut draft ก่อนยืนยันตรวจงานแล้ว");
  if (body.patch.scenes && JSON.stringify(body.patch.scenes.map(s=>s.narration)) !== JSON.stringify(before.scenes.map(s=>s.narration))) body.patch.voiceAssetId = null;
  if (body.patch.archived && listJobs(id).some(j=>["prepared","running"].includes(j.state))) throw new StudioError("ยกเลิกงาน CapCut ที่ค้างอยู่ก่อนเก็บเข้าคลัง",409);
  const project = updateProject(id,body.patch,body.revision);
  activity(id,body.patch.archived !== undefined ? (body.patch.archived ? "เก็บโปรเจกต์เข้าคลัง" : "กู้คืนโปรเจกต์") : "บันทึกการแก้ไขโปรเจกต์");
  return {project};
});
