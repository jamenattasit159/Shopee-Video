import { z } from "zod";
import { route } from "@/lib/http";
import { activity, getProject, StudioError, updateProject } from "@/lib/db";
import { synthesize } from "@/lib/voice";
export const POST = route(async(req,{id})=>{
  const {revision,preview} = z.object({revision:z.number().int().positive(),preview:z.boolean().default(false)}).parse(await req.json());
  if(getProject(id).revision !== revision) throw new StudioError("ข้อมูลเปลี่ยนแล้ว โหลดโปรเจกต์ใหม่ก่อนสร้างเสียง",409);
  const asset = await synthesize(id,preview);
  const project = preview?getProject(id):updateProject(id,{voiceAssetId:asset.id},revision);
  activity(id,preview?"สร้างตัวอย่างเสียงสั้น":"สร้างไฟล์เสียงพากย์");
  return {project,asset};
});
