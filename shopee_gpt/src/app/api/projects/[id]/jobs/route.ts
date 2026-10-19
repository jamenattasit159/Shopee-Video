import { route } from "@/lib/http";
import { prepareJob, jobPrompt } from "@/lib/capcut";
export const POST = route(async(_req,{id})=>{ const job = await prepareJob(id); const {snapshot:_snapshot,...summary}=job; return {job:summary,prompt:jobPrompt(job)}; });
