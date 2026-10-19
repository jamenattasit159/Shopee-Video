import { z } from "zod";
import { route } from "@/lib/http";
import { getJob } from "@/lib/db";
import { cancelJob, completeJob, jobPrompt, startJob } from "@/lib/capcut";
export const GET = route((_req,{id})=>{const {snapshot:_snapshot,...job}=getJob(id); return {job,prompt:jobPrompt(getJob(id))};});
export const POST = route(async(req,{id})=>{
  const body=z.discriminatedUnion("action",[
    z.object({action:z.literal("start")}),z.object({action:z.literal("cancel")}),
    z.object({action:z.literal("complete"),draftId:z.string().min(1).max(200),editUrl:z.string().url().max(2500)})
  ]).parse(await req.json());
  if(body.action === "start") return startJob(id);
  if(body.action === "cancel") return {job:await cancelJob(id)};
  return {job:completeJob(id,body.draftId,body.editUrl,"ผู้ใช้ยืนยัน draft จาก CapCut กรุณาเปิดตรวจภาพและเสียง")};
});
