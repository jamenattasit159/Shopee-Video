import { route } from "@/lib/http";
import { getProject, StudioError } from "@/lib/db";
import { ingest } from "@/lib/media";
export const runtime = "nodejs";
export const POST = route(async (req,{id}) => {
  getProject(id);
  if (Number(req.headers.get("content-length")) > 520 * 1024 * 1024) throw new StudioError("อัปโหลดรวมได้ครั้งละไม่เกิน 500 MB",413);
  const form = await req.formData();
  const files = form.getAll("files").filter(f=>f instanceof File) as File[];
  if (!files.length || files.length > 16) throw new StudioError("เลือก 1–16 ไฟล์ต่อครั้ง");
  if (files.reduce((n,f)=>n+f.size,0) > 500 * 1024 * 1024) throw new StudioError("อัปโหลดรวมได้ครั้งละไม่เกิน 500 MB",413);
  const results = [];
  for (const file of files) {
    try { results.push({name:file.name,asset:await ingest(id,file.name,Buffer.from(await file.arrayBuffer()))}); }
    catch(error) { results.push({name:file.name,error:error instanceof StudioError ? error.message : "บันทึกไฟล์ไม่สำเร็จ"}); }
  }
  return {results,project:getProject(id)};
});
