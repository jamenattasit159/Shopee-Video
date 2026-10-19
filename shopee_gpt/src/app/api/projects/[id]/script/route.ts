import { z } from "zod";
import { route } from "@/lib/http";
import { activity, getProject, StudioError, updateProject } from "@/lib/db";
import { generateScript } from "@/lib/creative";
export const POST = route(async (req,{id})=>{
  const {revision} = z.object({revision:z.number().int().positive()}).parse(await req.json());
  const project = getProject(id);
  if(project.revision !== revision) throw new StudioError("ข้อมูลเปลี่ยนแล้ว โหลดโปรเจกต์ใหม่ก่อนสร้างสคริปต์",409);
  const {notice,...script} = await generateScript(project);
  const updated = updateProject(id,{...script,voiceAssetId:null},revision);
  activity(id,`สร้างสคริปต์ (${script.scriptSource})`);
  return {project:updated,notice};
});
